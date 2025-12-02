import { GameEntity, MovingEntity, Vector3, AABB, MathUtils } from 'yuka';
import { LoopOnce, AnimationMixer, AnimationAction, PositionalAudio, Vector3 as ThreeVector3 } from 'three';
import { WeaponSystem } from '../core/WeaponSystem';
import { CONFIG } from '../core/Config';
import { PLAYER_CONFIG } from '../config/gameConfig';
import { Projectile } from '../weapons/Projectile';
import { STATUS_ALIVE, WEAPON_TYPES_BLASTER, WEAPON_TYPES_SHOTGUN, WEAPON_TYPES_ASSAULT_RIFLE, MESSAGE_HIT, MESSAGE_DEAD, STATUS_DYING, STATUS_DEAD } from '../core/Constants';
import World from '../core/World';

const intersectionPoint = new Vector3();
const targetPosition = new Vector3();
const projectile = new Projectile();
const attackDirection = new Vector3();
const lookDirection = new Vector3();
const cross = new Vector3();

/**
* Class for representing the human player of the game.
*/
class Player extends MovingEntity {

	public world: typeof World;
	public head: GameEntity;
	public weaponContainer: GameEntity;
	public weaponSystem: WeaponSystem;
	public bounds: AABB;
	public boundsDefinition: AABB;
	public currentRegion: any;
	public currentPosition: Vector3;
	public previousPosition: Vector3;
	public audios: Map<string, PositionalAudio>;
	public mixer: AnimationMixer | null;
	public animations: Map<string, AnimationAction>;
	public ui: { health: HTMLElement | null };
	public status: number;
	public currentTime: number;
	public endTimeDying: number;
	public dyingTime: number;
	public isPlayer: boolean;
	public health: number;
	public maxHealth: number;
	public height: number;
	public updateOrientation: boolean;
	public maxSpeed: number;
	public name: string;
	declare public active: boolean;

	// Rift Physics Properties
	public velocity: Vector3; // Override Yuka velocity with same type but managed differently if needed
	public onGround: boolean = true;
	public isSprinting: boolean = false;
	public isSliding: boolean = false;
	public slideTimer: number = 0;
	public slideCooldownTimer: number = 0;
	public slideDirection: Vector3 = new Vector3();
	public coyoteTimer: number = 0;
	public jumpBufferTimer: number = 0;
	public isJumping: boolean = false;
	public canCutJump: boolean = false;
	public prevVelocity: Vector3 = new Vector3();
	public groundNormal: Vector3 = new Vector3(0, 1, 0);
	public slopeAngle: number = 0;
	public maxSlopeAngle: number = Math.PI / 4;
	public stamina: number = 100;
	public landingImpact: number = 0;
	public headBobTime: number = 0;

	// Audio buffers (will be loaded by AudioManager or passed in)
	public lastFootstepTime: number = 0;

	/**
	* Constructs a new player object.
	*
	* @param {World} world - A reference to the world.
	*/
	constructor(world: typeof World) {

		super();

		this.world = world;

		this.currentTime = 0;
		this.boundingRadius = CONFIG.PLAYER.BOUNDING_RADIUS;
		this.height = CONFIG.PLAYER.HEAD_HEIGHT;
		this.updateOrientation = false;
		this.maxSpeed = CONFIG.PLAYER.MAX_SPEED;
		this.health = CONFIG.PLAYER.MAX_HEALTH;
		this.maxHealth = CONFIG.PLAYER.MAX_HEALTH;
		this.isPlayer = true;

		// Initialize Rift Physics
		this.velocity = new Vector3();

		this.status = STATUS_ALIVE;

		// the camera is attached to the player's head

		this.head = new GameEntity();
		this.head.forward.set(0, 0, - 1);
		this.add(this.head);

		// death animation

		this.endTimeDying = Infinity;
		this.dyingTime = CONFIG.PLAYER.DYING_TIME;

		// the weapons are attached to the following container entity

		this.weaponContainer = new GameEntity();
		this.head.add(this.weaponContainer);

		// the player uses the weapon system, too

		this.weaponSystem = new WeaponSystem(this);

		// Skip old weapon system initialization for player - RIFT handles all weapons
		if (!this.isPlayer) {
			this.weaponSystem.init();
		}

		// the player's bounds (using a single AABB is sufficient for now)

		this.bounds = new AABB();
		this.boundsDefinition = new AABB(new Vector3(- 0.25, 0, - 0.25), new Vector3(0.25, 1.8, 0.25));

		// current convex region of the navmesh the entity is in

		this.currentRegion = null;
		this.currentPosition = new Vector3();
		this.previousPosition = new Vector3();

		// audio

		this.audios = new Map();

		// animation

		this.mixer = null;
		this.animations = new Map();

		// ui
		this.ui = {

			health: document.getElementById('health'),

		};

		this.name = 'Player';

	}

	/**
	* Updates the internal state of this game entity.
	*
	* @param {Number} delta - The time delta.
	* @return {Player} A reference to this game entity.
	*/
	update(delta: number) {

		// Capture Input from Controls
		const input = this.world.fpsControls.input;
		const inputDir = new Vector3();
		if (input.forward) inputDir.z -= 1;
		if (input.backward) inputDir.z += 1;
		if (input.left) inputDir.x -= 1;
		if (input.right) inputDir.x += 1;

		// Run Physics Simulation
		this.updatePhysics(
			delta,
			inputDir,
			input.sprint,
			input.jump,
			input.crouch,
			this.world.arenaObjects
		);

		// Sync Yuka Entity State
		// Yuka uses 'position' and 'velocity' which we are updating in updatePhysics
		// But we need to ensure Yuka's internal state is happy

		// Call super.update to handle Yuka specific things (like behaviors if any, though Player usually doesn't have them)
		super.update(delta);

		this.currentTime += delta;

		// ensure the enemy never leaves the level (Legacy check, physics handles bounds now but good backup)
		// this.stayInLevel(); 

		if (this.status === STATUS_ALIVE) {
			if (!this.isPlayer) {
				this.weaponSystem.updateWeaponChange();
			}
			this.bounds.copy(this.boundsDefinition).applyMatrix4(this.worldMatrix);
		}

		if (this.status === STATUS_DYING) {
			if (this.currentTime >= this.endTimeDying) {
				this.status = STATUS_DEAD;
				this.endTimeDying = Infinity;
			}
		}

		if (this.status === STATUS_DEAD) {
			if (this.world.debug) console.log('DIVE.Player: Player died.');
			this.reset();
			this.world.spawningManager.respawnCompetitor(this);
			this.world.fpsControls.sync();
		}

		this.mixer!.update(delta);

		return this;

	}

	updatePhysics(
		delta: number,
		inputDir: Vector3,
		wantsToSprint: boolean,
		wantsJump: boolean,
		wantsCrouch: boolean,
		arenaObjects: Array<{ mesh: any; box: any }>
	) {

		this.prevVelocity.copy(this.velocity);

		const hasInput = inputDir.squaredLength() > 0;
		if (hasInput) {
			inputDir.normalize();
			// Apply rotation to input
			inputDir.applyRotation(this.rotation);

			// Slope adjustment
			if (this.onGround && this.slopeAngle > 0) {
				// Project inputDir onto the plane defined by groundNormal
				// Yuka Vector3 doesn't have projectOnPlane, so we do it manually
				// v - n * (v . n)
				const dot = inputDir.dot(this.groundNormal);
				const proj = this.groundNormal.clone().multiplyScalar(dot);
				inputDir.sub(proj).normalize();
			}
		}

		// Slide Cooldown
		if (this.slideCooldownTimer > 0) {
			this.slideCooldownTimer -= delta;
		}

		// Slide Initiation
		if (wantsCrouch && this.isSprinting && this.onGround && this.slideCooldownTimer <= 0 && !this.isSliding) {
			this.isSliding = true;
			this.slideTimer = PLAYER_CONFIG.slideDuration || 1.0;
			this.slideDirection.copy(this.velocity).normalize();
			this.velocity.add(this.slideDirection.clone().multiplyScalar(2));
		}

		// Slide State Management
		if (this.isSliding) {
			this.slideTimer -= delta;
			if (this.slideTimer <= 0 || this.velocity.length() < (PLAYER_CONFIG.walkSpeed || 8) * 0.5) {
				this.isSliding = false;
				this.slideCooldownTimer = PLAYER_CONFIG.slideCooldown || 1.0;
			}
		}

		// Sprint and stamina
		this.isSprinting = wantsToSprint && this.onGround && this.stamina > 0 && !this.isSliding;
		if (this.isSprinting) {
			this.stamina -= (PLAYER_CONFIG.staminaDrain || 20) * delta;
			if (this.stamina < 0) {
				this.stamina = 0;
				this.isSprinting = false;
			}
		} else {
			this.stamina = Math.min(PLAYER_CONFIG.maxStamina || 100, this.stamina + (PLAYER_CONFIG.staminaRegen || 30) * delta);
		}

		// Movement
		let targetSpeed = PLAYER_CONFIG.walkSpeed || 8;
		if (this.isSprinting) targetSpeed = PLAYER_CONFIG.sprintSpeed || 13;

		const isGrounded = this.onGround;
		console.log('Movement Debug - onGround:', this.onGround, 'hasInput:', hasInput, 'inputDir:', inputDir, 'targetSpeed:', targetSpeed);
		// Horizontal velocity
		const horizVel = new Vector3(this.velocity.x, 0, this.velocity.z);

		if (this.isSliding) {
			const slideSpeed = (PLAYER_CONFIG.slideSpeed || 18) * (this.slideTimer / (PLAYER_CONFIG.slideDuration || 1.0));
			const targetSlideVel = new Vector3(this.slideDirection.x, 0, this.slideDirection.z).multiplyScalar(slideSpeed);

			// Lerp horizontal velocity
			// Yuka Vector3 doesn't have lerp, do manual
			const alpha = (PLAYER_CONFIG.slideFriction || 2.5) * delta;
			horizVel.x += (targetSlideVel.x - horizVel.x) * alpha;
			horizVel.z += (targetSlideVel.z - horizVel.z) * alpha;
		} else {
			const accel = isGrounded ? (PLAYER_CONFIG.groundAccel || 50) : (PLAYER_CONFIG.airAccel || 20);
			const decel = isGrounded ? (PLAYER_CONFIG.groundDecel || 30) : (PLAYER_CONFIG.airDecel || 5);

			if (hasInput) {
				const targetVel = new Vector3(inputDir.x, 0, inputDir.z).multiplyScalar(targetSpeed);
				const alpha = accel * delta;
				// Simple lerp approximation for accel
				const diff = new Vector3().copy(targetVel).sub(horizVel);
				if (diff.length() > alpha) {
					diff.normalize().multiplyScalar(alpha);
				}
				horizVel.add(diff);
			} else {
				const decayFactor = Math.exp(-decel * delta);
				horizVel.multiplyScalar(decayFactor);
			}
		}

		this.velocity.x = horizVel.x;
		this.velocity.z = horizVel.z;

		// Head bob
		const speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
		this.headBobTime += delta * speed * 2;

		// Apply head bob to camera (head entity)
		if (this.head) {
			const motion = Math.sin(this.headBobTime);
			this.head.position.y = Math.abs(motion) * 0.06;
			this.head.position.x = motion * 0.08;
		}

		// Jump
		if (this.onGround) {
			this.coyoteTimer = PLAYER_CONFIG.coyoteTime || 0.15;
			this.isJumping = false;
		} else {
			this.coyoteTimer = Math.max(0, this.coyoteTimer - delta);
		}

		this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - delta);
		if (wantsJump) this.jumpBufferTimer = 0.1; // Set buffer

		const canJump = this.coyoteTimer > 0 || this.onGround;
		if (canJump && this.jumpBufferTimer > 0) {
			this.velocity.y = PLAYER_CONFIG.jumpForce || 12;
			this.isJumping = true;
			this.canCutJump = true;
			this.coyoteTimer = 0;
			this.jumpBufferTimer = 0;

			if (this.isSliding) {
				this.isSliding = false;
				this.slideCooldownTimer = PLAYER_CONFIG.slideCooldown || 1.0;
			}

			// Play jump sound
			const audio = this.audios.get('jump'); // Assuming 'jump' audio exists or we map it
			if (audio && !audio.isPlaying) audio.play();
		}

		if (this.canCutJump && !wantsJump && this.velocity.y > 0) {
			this.velocity.y *= (PLAYER_CONFIG.jumpCutMultiplier || 0.5);
			this.canCutJump = false;
		}

		// Gravity
		this.velocity.y -= (PLAYER_CONFIG.gravity || 35) * delta;

		// Move
		const moveStep = this.velocity.clone().multiplyScalar(delta);
		const newPos = this.position.clone().add(moveStep);

		// Collision
		const playerRadius = this.boundingRadius;
		const stepHeight = PLAYER_CONFIG.stepHeight || 0.5;
		// Default to on ground if no arena objects to check (fixes movement when arenaObjects is empty)
		this.onGround = arenaObjects.length === 0 ? true : false;

		this.checkSlope(arenaObjects);

		// Simple box collision against arena objects
		// Note: Yuka uses a specific coordinate system, ensure compatibility
		for (const obj of arenaObjects) {
			// Convert Yuka vector to Three vector for Box3 check if needed, 
			// but here we can just do simple AABB check if boxes are axis aligned
			// obj.box is a THREE.Box3

			const minX = newPos.x - playerRadius;
			const maxX = newPos.x + playerRadius;
			const minY = newPos.y; // Pivot at feet? Yuka MovingEntity usually pivot at center? 
			// Drift Player constructor says: boundsDefinition = new AABB(new Vector3(- 0.25, 0, - 0.25), new Vector3(0.25, 1.8, 0.25));
			// So pivot is at bottom (0).
			const maxY = newPos.y + this.height;
			const minZ = newPos.z - playerRadius;
			const maxZ = newPos.z + playerRadius;

			const box = obj.box; // THREE.Box3

			// Check intersection
			if (maxX > box.min.x && minX < box.max.x &&
				maxY > box.min.y && minY < box.max.y &&
				maxZ > box.min.z && minZ < box.max.z) {

				// Resolve collision
				// Simplified resolution: push out of shallowest penetration
				const overlapX = Math.min(maxX - box.min.x, box.max.x - minX);
				const overlapY = Math.min(maxY - box.min.y, box.max.y - minY);
				const overlapZ = Math.min(maxZ - box.min.z, box.max.z - minZ);

				if (overlapY < overlapX && overlapY < overlapZ) {
					// Vertical collision
					if (this.velocity.y < 0 && newPos.y > box.min.y) {
						// Landing
						newPos.y += overlapY;
						this.velocity.y = 0;
						this.onGround = true;
					} else if (this.velocity.y > 0 && newPos.y < box.max.y) {
						// Ceiling
						newPos.y -= overlapY;
						this.velocity.y = 0;
					}
				} else if (overlapX < overlapZ) {
					// X collision
					if (newPos.x < box.getCenter(new ThreeVector3()).x) {
						newPos.x -= overlapX;
					} else {
						newPos.x += overlapX;
					}
					this.velocity.x = 0;
				} else {
					// Z collision
					if (newPos.z < box.getCenter(new ThreeVector3()).z) {
						newPos.z -= overlapZ;
					} else {
						newPos.z += overlapZ;
					}
					this.velocity.z = 0;
				}
			}
		}

		// Ground check fallback (if no arena objects or floor is y=0)
		if (newPos.y <= 0) {
			newPos.y = 0;
			this.velocity.y = 0;
			this.onGround = true;
		}

		this.position.copy(newPos);
	}

	checkSlope(arenaObjects: any[]) {
		// Simplified slope check
		this.slopeAngle = 0;
		this.groundNormal.set(0, 1, 0);
		// Raycast down would be better, but for now assume flat or handle via collision
	}

	/**
	* Resets the player after a death.
	*
	* @return {Player} A reference to this game entity.
	*/
	reset() {

		this.health = this.maxHealth;
		this.status = STATUS_ALIVE;

		this.weaponSystem.reset();

		this.world.fpsControls.reset();

		this.world.uiManager.showFPSInterface();

		const animation = this.animations.get('player_death');
		if (animation) animation.stop();

		return this;

	}

	/**
	* Alias for reset, required by GameModeManager
	*/
	respawn() {
		this.reset();
	}

	/**
	* Inits the death of the player.
	*
	* @return {Player} A reference to this game entity.
	*/
	initDeath() {

		this.status = STATUS_DYING;
		this.endTimeDying = this.currentTime + this.dyingTime;

		this.velocity.set(0, 0, 0);

		const animation = this.animations.get('player_death');
		if (animation) animation.play();

		this.weaponSystem.hideCurrentWeapon();

		this.world.fpsControls.active = false;
		this.world.uiManager.hideFPSInterface();

		return this;

	}

	/**
	* Fires a round at the player's target with the current armed weapon.
	*
	* @return {Player} A reference to this game entity.
	*/
	shoot() {

		const head = this.head;
		const world = this.world;

		// Use RIFT weapon system if available
		if (world.rift && world.rift.weaponSystem) {
			const camera = world.camera;
			const onGround = this.velocity.y === 0;
			const isSprinting = Math.sqrt(this.velocity.x ** 2 + this.velocity.z ** 2) > 10;
			const velocity = new ThreeVector3(this.velocity.x, this.velocity.y, this.velocity.z);

			const result = world.rift.weaponSystem.shoot(camera, onGround, isSprinting, velocity);

			if (result.shotFired) {
				// Shoot was successful - hit detection and damage handled elsewhere
			}

			return this;
		}

		// Fallback to old system if RIFT not available
		const ray = projectile.ray;
		head.getWorldPosition(ray.origin);
		head.getWorldDirection(ray.direction);
		projectile.owner = this;

		const result = world.checkProjectileIntersection(projectile, intersectionPoint);
		const distance = (result === null) ? 1000 : ray.origin.distanceTo(intersectionPoint);
		targetPosition.copy(ray.origin).add(ray.direction.multiplyScalar(distance));

		this.weaponSystem.shoot(targetPosition);
		world.uiManager.updateAmmoStatus();

		return this;

	}

	/**
	* Reloads the current weapon of the player.
	*
	* @return {Player} A reference to this game entity.
	*/
	reload() {

		// Use RIFT weapon system if available
		if (this.world.rift && this.world.rift.weaponSystem) {
			this.world.rift.weaponSystem.reload();
		} else {
			this.weaponSystem.reload();
		}

		return this;

	}

	/**
	* Changes the weapon to the defined type.
	*
	* @param {WEAPON_TYPES} type - The weapon type.
	* @return {Player} A reference to this game entity.
	*/
	changeWeapon(type: number) {

		// Use RIFT weapon system if available
		if (this.world.rift && this.world.rift.weaponSystem) {
			// Map old weapon types to RIFT weapon indices (0-8)
			const weaponMap: { [key: number]: number } = {
				[WEAPON_TYPES_BLASTER]: 4, // Pistol
				[WEAPON_TYPES_SHOTGUN]: 6, // Shotgun
				[WEAPON_TYPES_ASSAULT_RIFLE]: 0, // AK47
			};
			const weaponIndex = weaponMap[type] !== undefined ? weaponMap[type] : 0;
			this.world.rift.weaponSystem.switchWeapon(weaponIndex);
		} else {
			this.weaponSystem.setNextWeapon(type);
		}

		return this;

	}

	/**
	* Returns true if the player has a weapon of the given type.
	*
	* @param {WEAPON_TYPES} type - The weapon type.
	* @return {Boolean} Whether the player has a weapon of the given type or not.
	*/
	hasWeapon(type: number) {

		return this.weaponSystem.getWeapon(type) !== null;

	}

	/**
	* Indicates if the player does currently use an automatic weapon.
	*
	* @return {Boolean} Whether an automatic weapon is used or not.
	*/
	isAutomaticWeaponUsed() {

		return (this.weaponSystem.currentWeapon!.type === WEAPON_TYPES_ASSAULT_RIFLE);

	}

	/**
	* Activates this game entity. Enemies will shot at the player and
	* the current weapon is rendered.
	*
	* @return {Player} A reference to this game entity.
	*/
	activate() {

		this.active = true;
		if (this.weaponSystem.currentWeapon) {
			this.weaponSystem.currentWeapon._renderComponent.visible = true;
		}

		return this;

	}

	/**
	* Deactivates this game entity. Enemies will not shot at the player and
	* the current weapon is not rendered.
	*
	* @return {Player} A reference to this game entity.
	*/
	deactivate() {

		this.active = false;
		if (this.weaponSystem.currentWeapon) {
			this.weaponSystem.currentWeapon._renderComponent.visible = false;
		}

		return this;

	}

	/**
	* Returns the intesection point if a projectile intersects with this entity.
	* If no intersection is detected, null is returned.
	*
	* @param {Ray} ray - The ray that defines the trajectory of this bullet.
	* @param {Vector3} intersectionPoint - The intersection point.
	* @return {Vector3} The intersection point.
	*/
	checkProjectileIntersection(ray: any, intersectionPoint: any) {

		return ray.intersectAABB(this.bounds, intersectionPoint);

	}

	/**
	* Ensures the player never leaves the level.
	*
	* @return {Player} A reference to this game entity.
	*/
	stayInLevel() {

		// "currentPosition" represents the final position after the movement for a single
		// simualation step. it's now necessary to check if this point is still on
		// the navMesh

		this.currentPosition.copy(this.position);

		this.currentRegion = this.world.navMesh.clampMovement(
			this.currentRegion,
			this.previousPosition,
			this.currentPosition,
			this.position // this is the result vector that gets clamped
		);

		// save this position for the next method invocation

		this.previousPosition.copy(this.position);

		// adjust height of the entity according to the ground

		const distance = this.currentRegion.plane.distanceToPoint(this.position);

		this.position.y -= distance * CONFIG.NAVMESH.HEIGHT_CHANGE_FACTOR; // smooth transition

		return this;

	}

	/*
	* Adds the given health points to this entity.
	*
	* @param {Number} amount - The amount of health to add.
	* @return {Player} A reference to this game entity.
	*/
	addHealth(amount: number) {

		this.health += amount;

		this.health = Math.min(this.health, this.maxHealth); // ensure that health does not exceed maxHealth

		this.world.uiManager.updateHealthStatus();

		//

		if (this.world.debug) {

			console.log('DIVE.Player: Entity with ID %s receives %i health points.', this.uuid, amount);

		}

		return this;

	}

	/*
	* Adds the given weapon to the internal weapon system.
	*
	* @param {WEAPON_TYPES} type - The weapon type.
	* @return {Player} A reference to this game entity.
	*/
	addWeapon(type: number) {

		this.weaponSystem.addWeapon(type);

		// if the entity already has the weapon, increase the ammo

		this.world.uiManager.updateAmmoStatus();

		return this;

	}

	/**
	* Sets the animations of this game entity by creating a
	* series of animation actions.
	*
	* @param {AnimationMixer} mixer - The animation mixer.
	* @param {Array} clips - An array of animation clips.
	* @return {Player} A reference to this game entity.
	*/
	setAnimations(mixer: any, clips: any) {

		this.mixer = mixer;

		// actions

		for (const clip of clips) {

			const action = mixer.clipAction(clip);
			action.loop = LoopOnce;
			action.name = clip.name;

			this.animations.set(action.name, action);

		}

		return this;

	}

	/**
	* Holds the implementation for the message handling of this game entity.
	*
	* @param {Telegram} telegram - The telegram with the message data.
	* @return {Boolean} Whether the message was processed or not.
	*/
	handleMessage(telegram: any) {

		switch (telegram.message) {

			case MESSAGE_HIT:

				// play audio

				const audio = this.audios.get('impact' + MathUtils.randInt(1, 7));
				if (audio && audio.isPlaying === true) audio.stop();
				if (audio) audio.play();

				// reduce health

				this.health -= telegram.data.damage;

				// update UI

				this.world.uiManager.updateHealthStatus();

				// logging

				if (this.world.debug) {

					console.log('DIVE.Player: Player hit by Game Entity with ID %s receiving %i damage.', telegram.sender.uuid, telegram.data.damage);

				}

				// check if the player is dead

				if (this.health <= 0 && this.status === STATUS_ALIVE) {

					this.initDeath();

					// inform all other competitors about its death

					const competitors = this.world.competitors;

					for (let i = 0, l = competitors.length; i < l; i++) {

						const competitor = competitors[i];

						if (this !== competitor) this.sendMessage(competitor, MESSAGE_DEAD);

					}

					// update UI

					this.world.uiManager.addFragMessage(telegram.sender, this);

				} else {

					const angle = this.computeAngleToAttacker(telegram.data.direction);
					this.world.uiManager.showDamageIndication(angle);

				}

				break;

		}

		return true;

	}

	/**
	* Computes the angle between the current look direction and the attack direction in
	* the range of [-π, π].
	*
	* @param {Vector3} projectileDirection - The direction of the projectile.
	* @return {Number} The angle in radians.
	*/
	computeAngleToAttacker(projectileDirection: any) {

		attackDirection.copy(projectileDirection).multiplyScalar(- 1);
		attackDirection.y = 0; // project plane on (0,1,0) plane
		attackDirection.normalize();

		this.head.getWorldDirection(lookDirection);
		lookDirection.y = 0;
		lookDirection.normalize();

		// since both direction vectors lie in the same plane, use the following formula
		//
		// dot = a * b
		// det = n * (a x b)
		// angle = atan2(det, dot)
		//
		// Note: We can't use Vector3.angleTo() since the result is always in the range [0,π]

		const dot = attackDirection.dot(lookDirection);
		const det = this.up.dot(cross.crossVectors(attackDirection, lookDirection)); // triple product

		return Math.atan2(det, dot);

	}

}

export { Player };

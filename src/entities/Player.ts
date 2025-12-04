import { GameEntity, MovingEntity, Vector3, AABB, MathUtils } from 'yuka';
import { LoopOnce, AnimationMixer, AnimationAction, PositionalAudio, Vector3 as ThreeVector3, Object3D } from 'three';
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

	// Getter for protected _renderComponent from Yuka's GameEntity
	public get renderComponent(): Object3D | null {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		return (this as any)._renderComponent || null;
	}

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
	public wasJumpPressed: boolean = false;
	public prevVelocity: Vector3 = new Vector3();
	public groundNormal: Vector3 = new Vector3(0, 1, 0);
	public slopeAngle: number = 0;
	public maxSlopeAngle: number = Math.PI / 4;
	public stamina: number = 100;
	public landingImpact: number = 0;
	public headBobTime: number = 0;

	// Audio state
	public lastFootstepTime: number = 0;
	private footstepInterval: number = 0.35; // Time between footsteps
	private sprintFootstepInterval: number = 0.25; // Faster footsteps when sprinting
	private wasAirborne: boolean = false; // Track if we were in the air last frame
	private heartbeatActive: boolean = false;
	private heartbeatAudio: any = null;
	private audioInitialized: boolean = false;

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
		this.maxSpeed = PLAYER_CONFIG.sprintSpeed || 30; // Use RIFT config for max speed, must allow sprint speed
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

		// Only process input and physics if alive
		if (this.status === STATUS_ALIVE) {
			// Capture Input from Controls
			const input = this.world.fpsControls.input;
			const inputDir = new Vector3();
			if (input.forward) inputDir.z -= 1;
			if (input.backward) inputDir.z += 1;
			if (input.left) inputDir.x -= 1;
			if (input.right) inputDir.x += 1;

			// Track airborne state before physics
			const wasAirborneBeforePhysics = !this.onGround;

			// Run Physics Simulation
			this.updatePhysics(
				delta,
				inputDir,
				input.sprint,
				input.jump,
				input.crouch,
				this.world.arenaObjects
			);

			// Play landing sound when we just landed
			if (wasAirborneBeforePhysics && this.onGround) {
				this.playLandingSound();
			}

			// Play footstep sounds while moving on ground
			this.updateFootsteps(delta, inputDir);

			// Update heartbeat for low health
			this.updateHeartbeat();
		}

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
			// Update health UI after respawn position is set
			this.world.uiManager.updateHealthStatus();
		}

		// Update stamina UI if RIFT HUD is available
		if (this.world.rift && this.world.rift.hudManager && this.status === STATUS_ALIVE) {
			this.world.rift.hudManager.updateStamina(this.stamina, PLAYER_CONFIG.maxStamina || 100);
			// Update sprint visual effect
			this.world.rift.hudManager.setSprintEffect(this.isSprinting);
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
		_arenaObjects: Array<{ mesh: any; box: any }>
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

		// Sprint and stamina - allow sprinting with input even in air for responsive feel
		this.isSprinting = wantsToSprint && this.stamina > 0 && !this.isSliding && hasInput;
		if (this.isSprinting) {
			this.stamina -= (PLAYER_CONFIG.staminaDrain || 20) * delta;
			if (this.stamina < 0) {
				this.stamina = 0;
				this.isSprinting = false;
			}
		} else {
			this.stamina = Math.min(PLAYER_CONFIG.maxStamina || 100, this.stamina + (PLAYER_CONFIG.staminaRegen || 30) * delta);
		}

		// Movement - ensure sprint is noticeably faster
		let targetSpeed = PLAYER_CONFIG.walkSpeed || 8;
		if (this.isSprinting) {
			targetSpeed = PLAYER_CONFIG.sprintSpeed || 13;
		}

		const isGrounded = this.onGround;
		
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
			// Head position = base height + bob offset
			this.head.position.y = this.height + Math.abs(motion) * 0.06;
			this.head.position.x = motion * 0.08;
		}

		// Jump with buffer and coyote time
		if (this.onGround) {
			this.coyoteTimer = PLAYER_CONFIG.coyoteTime || 0.15;
			this.isJumping = false;
		} else {
			this.coyoteTimer = Math.max(0, this.coyoteTimer - delta);
		}

		// Countdown existing buffer
		if (this.jumpBufferTimer > 0) {
			this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - delta);
		}
		
		// Set jump buffer only on NEW press (not while held)
		if (wantsJump && !this.wasJumpPressed && !this.isJumping) {
			this.jumpBufferTimer = 0.1;
		}
		this.wasJumpPressed = wantsJump;

		// Execute jump if conditions met
		let jumpedThisFrame = false;
		const canJump = (this.coyoteTimer > 0 || this.onGround) && !this.isJumping;
		if (canJump && this.jumpBufferTimer > 0) {
			this.velocity.y = PLAYER_CONFIG.jumpForce || 15;
			this.isJumping = true;
			this.canCutJump = true;
			this.coyoteTimer = 0;
			this.jumpBufferTimer = 0;
			this.onGround = false; // Force off ground immediately
			jumpedThisFrame = true;

			if (this.isSliding) {
				this.isSliding = false;
				this.slideCooldownTimer = PLAYER_CONFIG.slideCooldown || 1.0;
			}

			// Play jump sound
			this.playJumpSound();
		}

		// Variable height jump - cut jump short when button released
		if (this.canCutJump && !wantsJump && this.velocity.y > 0) {
			this.velocity.y *= (PLAYER_CONFIG.jumpCutMultiplier || 0.5);
			this.canCutJump = false;
		}

		// Gravity
		this.velocity.y -= (PLAYER_CONFIG.gravity || 35) * delta;

		// Move
		const moveStep = this.velocity.clone().multiplyScalar(delta);
		const newPos = this.position.clone().add(moveStep);

		// Ground collision using navMesh (like original Drift)
		this.onGround = false;
		
		if (this.world.navMesh && this.currentRegion) {
			// Save Y for vertical movement (navMesh is 2D on XZ plane)
			const savedY = newPos.y;
			const savedVelY = this.velocity.y;
			const isAirborne = jumpedThisFrame || this.isJumping || savedVelY > 0.1;
			
			// For navMesh collision, work on the XZ plane only
			// Set Y to ground level for proper region detection
			const groundY = this.currentRegion.plane.distanceToPoint(this.position);
			newPos.y = this.position.y - groundY; // Project to ground for navMesh
			
			// Copy current position for navMesh (XZ collision)
			this.currentPosition.copy(newPos);
			
			// Clamp movement against walls (XZ only)
			this.currentRegion = this.world.navMesh.clampMovement(
				this.currentRegion,
				this.previousPosition,
				this.currentPosition,
				newPos // Gets modified - XZ clamped against walls
			);
			
			// Update previousPosition for next frame (use ground-projected pos)
			this.previousPosition.copy(newPos);
			
			if (isAirborne) {
				// Restore Y position for airborne movement
				newPos.y = savedY;
				this.velocity.y = savedVelY;
				
				// Check for landing
				const groundHeight = this.currentRegion.plane.distanceToPoint(newPos);
				if (groundHeight <= 0 && savedVelY <= 0) {
					// Landed
					newPos.y -= groundHeight;
					this.landingImpact = Math.abs(savedVelY); // Store landing velocity for sound
					this.velocity.y = 0;
					this.onGround = true;
					this.isJumping = false;
				}
			} else {
				// On ground: snap to navMesh surface
				const groundHeight = this.currentRegion.plane.distanceToPoint(newPos);
				newPos.y -= groundHeight;
				this.velocity.y = 0;
				this.onGround = true;
			}
		} else {
			// Fallback: simple ground plane at y=0
			if (newPos.y <= 0) {
				newPos.y = 0;
				this.velocity.y = 0;
				this.onGround = true;
			}
		}

		this.position.copy(newPos);
	}

	checkSlope(_arenaObjects: any[]) {
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

		// Reset physics state
		this.velocity.set(0, 0, 0);
		this.prevVelocity.set(0, 0, 0);
		this.onGround = true;
		this.isSprinting = false;
		this.isSliding = false;
		this.slideTimer = 0;
		this.slideCooldownTimer = 0;
		this.slideDirection.set(0, 0, 0);
		this.coyoteTimer = 0;
		this.jumpBufferTimer = 0;
		this.isJumping = false;
		this.canCutJump = false;
		this.wasJumpPressed = false;
		this.groundNormal.set(0, 1, 0);
		this.slopeAngle = 0;
		this.stamina = 100;
		this.landingImpact = 0;
		this.headBobTime = 0;

		this.weaponSystem.reset();

		this.world.fpsControls.reset();
		this.world.fpsControls.active = true;

		this.world.uiManager.showFPSInterface();
		// Note: Health UI is updated after respawn position is set, not here

		// Reset death animation properly so it can play again
		const animation = this.animations.get('player_death');
		if (animation) {
			animation.stop();
			animation.reset(); // Reset time to 0 so it can play from beginning next time
		}

		// Reset endTimeDying to prevent immediate re-death
		this.endTimeDying = Infinity;

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

		// Play death sound
		this.playDeathSound();

		// Stop heartbeat if playing
		this.stopHeartbeat();

		const animation = this.animations.get('player_death');
		if (animation) {
			animation.reset(); // Ensure animation starts from beginning
			animation.play();
		}

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

		// Cannot shoot if dead or dying
		if (this.status !== STATUS_ALIVE) {
			return this;
		}

		const head = this.head;
		const world = this.world;

		// Use RIFT weapon system if available
		if (world.rift && world.rift.weaponSystem) {
			const onGround = this.velocity.y === 0;
			const isSprinting = Math.sqrt(this.velocity.x ** 2 + this.velocity.z ** 2) > 10;
			const velocity = new ThreeVector3(this.velocity.x, this.velocity.y, this.velocity.z);

			// Build obstacle list: level geometry + enemy render components
			const obstacles: any[] = [];

			// Add level geometry
			if (world.level && world.level.renderComponent) {
				obstacles.push(world.level.renderComponent);
			}

			// Add all competitors (enemies) render components
			world.competitors.forEach((competitor: any) => {
				if (competitor !== this && competitor.active && competitor.renderComponent) {
					obstacles.push(competitor.renderComponent);
				}
			});
			world.rift.handleShooting(onGround, isSprinting, velocity, obstacles);

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
			action.clampWhenFinished = true; // Hold at the end frame
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

				// Ignore damage if already dead or dying
				if (this.status !== STATUS_ALIVE) {
					return true;
				}

				// Play damage grunt sound via RIFT audio manager
				this.playDamageGrunt();

				// reduce health (clamp to 0 minimum)

				this.health = Math.max(0, this.health - telegram.data.damage);

				// update UI

				this.world.uiManager.updateHealthStatus();
				
				// Apply RIFT damage effects (screen shake, vignette)
				if (this.world.rift) {
					const angle = this.computeAngleToAttacker(telegram.data.direction);
					const angleDegrees = (angle * 180) / Math.PI;
					this.world.rift.applyDamageEffects(telegram.data.damage, this.maxHealth, angleDegrees);
				}

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

	// ========== PLAYER AUDIO METHODS ==========

	/**
	 * Updates footstep sounds based on movement.
	 */
	private updateFootsteps(delta: number, inputDir: Vector3): void {
		this.lastFootstepTime += delta;

		// Only play footsteps when on ground and moving
		const isMoving = inputDir.length() > 0.1;
		if (!this.onGround || !isMoving) {
			return;
		}

		const interval = this.isSprinting ? this.sprintFootstepInterval : this.footstepInterval;

		if (this.lastFootstepTime >= interval) {
			this.lastFootstepTime = 0;
			this.playFootstepSound();
		}
	}

	/**
	 * Plays a random footstep sound.
	 */
	private playFootstepSound(): void {
		if (!this.world.rift?.audioManager) return;

		// Pick random footstep (Concrete-Run-1 through 6)
		const footstepNum = MathUtils.randInt(1, 6);
		const footstepPath = `/assets/audio/sfx/player/Concrete-Run-${footstepNum}.mp3_${this.getFootstepHash(footstepNum)}.mp3`;
		
		this.world.rift.audioManager.playSound(footstepPath, 'sfx', { 
			volume: this.isSprinting ? 0.8 : 0.6 
		});
	}

	/**
	 * Returns the hash suffix for footstep files.
	 */
	private getFootstepHash(num: number): string {
		const hashes: { [key: number]: string } = {
			1: 'c0954406',
			2: 'bcd23528',
			3: '721706e6',
			4: '4f98c76e',
			5: '121ee958',
			6: 'a62fc298'
		};
		return hashes[num] || 'c0954406';
	}

	/**
	 * Plays a landing sound based on impact velocity.
	 */
	private playLandingSound(): void {
		if (!this.world.rift?.audioManager) return;

		// Pick random landing sound
		const landNum = MathUtils.randInt(1, 2);
		const hash = landNum === 1 ? '58b9ba36' : 'de259dd1';
		const landPath = `/assets/audio/sfx/player/Land-${landNum}.mp3_${hash}.mp3`;
		
		// Louder for harder impacts
		const volume = Math.min(1.0, 0.5 + (this.landingImpact / 30) * 0.5);
		
		this.world.rift.audioManager.playSound(landPath, 'sfx', { volume });
	}

	/**
	 * Plays jump sound.
	 */
	private playJumpSound(): void {
		if (!this.world.rift?.audioManager) return;

		const jumpPath = '/assets/audio/sfx/player/Jump.mp3_523dd26f.mp3';
		this.world.rift.audioManager.playSound(jumpPath, 'sfx', { volume: 0.7 });
	}

	/**
	 * Plays a random damage grunt sound.
	 */
	private playDamageGrunt(): void {
		console.log('playDamageGrunt called, rift:', !!this.world.rift, 'audioManager:', !!this.world.rift?.audioManager);
		if (!this.world.rift?.audioManager) return;

		const gruntNum = MathUtils.randInt(1, 3);
		const hashes: { [key: number]: string } = {
			1: '1cd206a1',
			2: '17321d9c',
			3: '31597fb1'
		};
		const gruntPath = `/assets/audio/sfx/player/Echo-Grunt-${gruntNum}.mp3_${hashes[gruntNum]}.mp3`;
		console.log('Playing grunt:', gruntPath);
		
		this.world.rift.audioManager.playSound(gruntPath, 'sfx', { volume: 1.0 });
	}

	/**
	 * Plays death sound.
	 */
	private playDeathSound(): void {
		console.log('playDeathSound called, rift:', !!this.world.rift, 'audioManager:', !!this.world.rift?.audioManager);
		if (!this.world.rift?.audioManager) return;

		const deathPath = '/assets/audio/sfx/player/Echo-Death-1.mp3_4264c0fa.mp3';
		console.log('Playing death sound:', deathPath);
		this.world.rift.audioManager.playSound(deathPath, 'sfx', { volume: 1.0 });
	}

	/**
	 * Updates heartbeat sound based on health level.
	 */
	private updateHeartbeat(): void {
		if (!this.world.rift?.audioManager) return;

		const healthPercent = this.health / this.maxHealth;
		const shouldPlayHeartbeat = healthPercent <= 0.25 && healthPercent > 0;

		if (shouldPlayHeartbeat && !this.heartbeatActive) {
			// Start heartbeat
			console.log('Starting heartbeat, health:', healthPercent);
			this.heartbeatActive = true;
			const heartbeatPath = '/assets/audio/sfx/player/Heart-Beat.mp3_1e759b97.mp3';
			this.heartbeatAudio = this.world.rift.audioManager.playSound(heartbeatPath, 'sfx', { 
				volume: 0.8, 
				loop: true 
			});
		} else if (!shouldPlayHeartbeat && this.heartbeatActive) {
			this.stopHeartbeat();
		}
	}

	/**
	 * Stops the heartbeat sound.
	 */
	private stopHeartbeat(): void {
		this.heartbeatActive = false;
		if (this.heartbeatAudio && this.heartbeatAudio.isPlaying) {
			this.heartbeatAudio.stop();
		}
		this.heartbeatAudio = null;
	}

}

export { Player };

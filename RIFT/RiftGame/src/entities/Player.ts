import * as THREE from 'three';
import { PLAYER_CONFIG } from '../config/gameConfig';
import { Damageable, DamageInfo, DamageType } from '../core/DamageTypes';

export class Player implements Damageable {
  public position: THREE.Vector3;
  public velocity: THREE.Vector3;
  public rotation = { x: 0, y: 0 };
  public health: number;
  public maxHealth: number;
  public armor: number;
  public stamina: number;
  public onGround = true;
  public isSprinting = false;
  public isSliding = false;
  public slideTimer = 0;
  public slideCooldownTimer = 0;
  public slideDirection = new THREE.Vector3();
  public coyoteTimer = 0;
  public jumpBufferTimer = 0;
  public isJumping = false;
  public canCutJump = false;
  public prevVelocity: THREE.Vector3;
  public powerup: string | null = null;
  public powerupTimer = 0;
  public damageMultiplier = 1;
  public speedMultiplier = 1;
  public headBobTime = 0;
  public currentFOV: number;
  public landingImpact = 0;
  public jumpLift = 0;

  // Slope Handling
  private groundNormal = new THREE.Vector3(0, 1, 0);
  private slopeAngle = 0;
  private maxSlopeAngle = Math.PI / 4; // 45 degrees

  // Audio
  private audioBuffers: Record<string, AudioBuffer> = {};
  private footstepSounds: THREE.Audio[] = [];
  private jumpSound: THREE.Audio;
  private landSound: THREE.Audio;
  private hurtSounds: THREE.Audio[] = [];
  private deathSound: THREE.Audio;
  private heartbeatSound: THREE.Audio;
  private lastFootstepTime = 0;
  private footstepIndex = 0;
  private heartbeatInterval: number | null = null;
  private isHeartbeatPlaying: boolean = false;

  constructor(listener: THREE.AudioListener) {
    this.position = new THREE.Vector3(0, PLAYER_CONFIG.height, 0);
    this.velocity = new THREE.Vector3();
    this.prevVelocity = new THREE.Vector3();
    this.maxHealth = PLAYER_CONFIG.maxHealth;
    this.health = this.maxHealth;
    this.armor = 0;
    this.stamina = PLAYER_CONFIG.maxStamina;
    this.currentFOV = 75; // Will be updated by camera config

    // Initialize audio objects
    for (let i = 0; i < 6; i++) {
      this.footstepSounds.push(new THREE.Audio(listener));
    }
    for (let i = 0; i < 3; i++) {
      this.hurtSounds.push(new THREE.Audio(listener));
    }
    this.jumpSound = new THREE.Audio(listener);
    this.landSound = new THREE.Audio(listener);
    this.deathSound = new THREE.Audio(listener);
    this.heartbeatSound = new THREE.Audio(listener);
    this.heartbeatSound.setVolume(0.6);

    this.loadAudio();
  }

  private loadAudio(): void {
    const audioLoader = new THREE.AudioLoader();
    const basePath = 'assets/audio/player/';

    // Load footstep sounds
    for (let i = 1; i <= 6; i++) {
      const path = `${basePath}Concrete-Run-${i}.mp3_${['c0954406', 'bcd23528', '721706e6', '4f98c76e', '121ee958', 'a62fc298'][i - 1]}.mp3`;
      audioLoader.load(path, (buffer) => {
        this.audioBuffers[path] = buffer;
      }, undefined, (error) => console.warn(`Failed to load footstep: ${path}`, error));
    }

    // Load hurt sounds
    const hurtPaths = [
      `${basePath}Echo-Grunt-1.mp3_1cd206a1.mp3`,
      `${basePath}Echo-Grunt-2.mp3_17321d9c.mp3`,
      `${basePath}Echo-Grunt-3.mp3_31597fb1.mp3`
    ];
    hurtPaths.forEach(path => {
      audioLoader.load(path, (buffer) => {
        this.audioBuffers[path] = buffer;
      }, undefined, (error) => console.warn(`Failed to load hurt sound: ${path}`, error));
    });

    // Load jump and land sounds
    audioLoader.load(`${basePath}Jump.mp3_523dd26f.mp3`, (buffer) => {
      this.audioBuffers['jump'] = buffer;
    }, undefined, (error) => console.warn('Failed to load jump sound', error));

    audioLoader.load(`${basePath}Land-1.mp3_58b9ba36.mp3`, (buffer) => {
      this.audioBuffers['land'] = buffer;
    }, undefined, (error) => console.warn('Failed to load land sound', error));

    audioLoader.load(`${basePath}Echo-Death-1.mp3_4264c0fa.mp3`, (buffer) => {
      this.audioBuffers['death'] = buffer;
    }, undefined, (error) => console.warn('Failed to load death sound', error));

    audioLoader.load(`${basePath}Heart-Beat.mp3_1e759b97.mp3`, (buffer) => {
      this.audioBuffers['heartbeat'] = buffer;
    }, undefined, (error) => console.warn('Failed to load heartbeat sound', error));
  }

  public isDead(): boolean {
    return this.health <= 0;
  }

  public takeDamage(info: DamageInfo | number): void {
    const amount = typeof info === 'number' ? info : info.amount;
    let remaining = amount;

    // Apply knockback
    if (typeof info !== 'number' && info.knockbackForce && info.sourcePosition) {
      const direction = this.position.clone().sub(info.sourcePosition).normalize();
      // Add upward component for explosions
      direction.y += 0.5;
      direction.normalize();

      this.velocity.add(direction.multiplyScalar(info.knockbackForce));
      this.onGround = false; // Lift off ground
    }

    if (this.armor > 0) {
      const absorbed = Math.min(this.armor, remaining);
      this.armor -= absorbed;
      remaining -= absorbed;
    }

    if (remaining > 0) {
      this.health -= remaining;
      this.playHurtSound();
    }
  }

  private playFootstepSound(): void {
    const basePath = 'assets/audio/player/';
    const hashes = ['c0954406', 'bcd23528', '721706e6', '4f98c76e', '121ee958', 'a62fc298'];
    const soundIndex = this.footstepIndex % 6;
    const path = `${basePath}Concrete-Run-${soundIndex + 1}.mp3_${hashes[soundIndex]}.mp3`;

    if (this.audioBuffers[path] && this.footstepSounds[soundIndex]) {
      const sound = this.footstepSounds[soundIndex];
      if (sound.isPlaying) sound.stop();
      sound.setBuffer(this.audioBuffers[path]);
      sound.setVolume(0.3);
      sound.play();
    }

    this.footstepIndex = (this.footstepIndex + 1) % 6;
  }

  private playJumpSound(): void {
    if (this.audioBuffers['jump']) {
      if (this.jumpSound.isPlaying) this.jumpSound.stop();
      this.jumpSound.setBuffer(this.audioBuffers['jump']);
      this.jumpSound.setVolume(0.4);
      this.jumpSound.play();
    }
  }

  private playLandSound(): void {
    if (this.audioBuffers['land']) {
      if (this.landSound.isPlaying) this.landSound.stop();
      this.landSound.setBuffer(this.audioBuffers['land']);
      this.landSound.setVolume(0.5);
      this.landSound.play();
    }
  }

  private playHurtSound(): void {
    const basePath = 'assets/audio/player/';
    const hurtPaths = [
      `${basePath}Echo-Grunt-1.mp3_1cd206a1.mp3`,
      `${basePath}Echo-Grunt-2.mp3_17321d9c.mp3`,
      `${basePath}Echo-Grunt-3.mp3_31597fb1.mp3`
    ];
    const randomIndex = Math.floor(Math.random() * 3);
    const path = hurtPaths[randomIndex];

    if (this.audioBuffers[path] && this.hurtSounds[randomIndex]) {
      const sound = this.hurtSounds[randomIndex];
      if (sound.isPlaying) sound.stop();
      sound.setBuffer(this.audioBuffers[path]);
      sound.setVolume(0.6);
      sound.play();
    }
  }

  public playDeathSound(): void {
    this.stopHeartbeat();
    if (this.audioBuffers['death']) {
      if (this.deathSound.isPlaying) this.deathSound.stop();
      this.deathSound.setBuffer(this.audioBuffers['death']);
      this.deathSound.setVolume(0.8);
      this.deathSound.play();
    }
  }

  public startHeartbeat(): void {
    if (this.isHeartbeatPlaying || !this.audioBuffers['heartbeat']) return;

    this.isHeartbeatPlaying = true;

    const playHeartbeat = () => {
      if (this.audioBuffers['heartbeat'] && this.isHeartbeatPlaying) {
        if (this.heartbeatSound.isPlaying) this.heartbeatSound.stop();
        this.heartbeatSound.setBuffer(this.audioBuffers['heartbeat']);
        this.heartbeatSound.play();
      }
    };

    // Play immediately
    playHeartbeat();

    // Then repeat every 900ms (66 BPM - tense heartbeat)
    this.heartbeatInterval = window.setInterval(playHeartbeat, 900);
  }

  public stopHeartbeat(): void {
    this.isHeartbeatPlaying = false;
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.heartbeatSound.isPlaying) {
      this.heartbeatSound.stop();
    }
  }

  public updateHeartbeat(healthPercent: number): void {
    if (healthPercent <= 50 && !this.isHeartbeatPlaying) {
      this.startHeartbeat();

      // Adjust heartbeat speed based on health
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        const interval = healthPercent < 25 ? 700 : 900; // Faster when very low
        this.heartbeatInterval = window.setInterval(() => {
          if (this.audioBuffers['heartbeat'] && this.isHeartbeatPlaying) {
            if (this.heartbeatSound.isPlaying) this.heartbeatSound.stop();
            this.heartbeatSound.setBuffer(this.audioBuffers['heartbeat']);
            this.heartbeatSound.play();
          }
        }, interval);
      }
    } else if (healthPercent > 50 && this.isHeartbeatPlaying) {
      this.stopHeartbeat();
    }
  }

  public heal(amount: number): void {
    this.health = Math.min(PLAYER_CONFIG.maxHealth, this.health + amount);
  }

  public addArmor(amount: number): void {
    this.armor = Math.min(PLAYER_CONFIG.maxArmor, this.armor + amount);
  }

  public addAmmo(amount: number): number {
    return amount; // Will be handled by weapon system
  }

  public setPowerup(type: string, duration: number): void {
    this.powerup = type;
    this.powerupTimer = duration;

    switch (type) {
      case 'damage':
        this.damageMultiplier = 2;
        break;
      case 'speed':
        this.speedMultiplier = 1.5;
        break;
      case 'rapid':
        // Handled in weapon system
        break;
    }
  }

  public updatePowerups(delta: number): void {
    if (this.powerupTimer > 0) {
      this.powerupTimer -= delta;
      if (this.powerupTimer <= 0) {
        this.powerup = null;
        this.damageMultiplier = 1;
        this.speedMultiplier = 1;
      }
    }
  }

  private handleLanding(landingSpeed: number): void {
    if (landingSpeed > 5) {
      this.landingImpact = Math.min(landingSpeed / 20, 1);
      this.playLandSound();

      // Fall Damage
      if (landingSpeed > 18) { // Threshold for damage (approx 6-7m drop)
        const damage = Math.floor((landingSpeed - 18) * 5);
        if (damage > 0) {
          this.takeDamage({
            amount: damage,
            type: DamageType.Fall
          });
        }
      }
    }
  }

  private checkSlope(arenaObjects: Array<{ mesh: THREE.Mesh; box: THREE.Box3 }>): void {
    // Raycast down to detect slope normal
    const raycaster = new THREE.Raycaster(
      this.position.clone(),
      new THREE.Vector3(0, -1, 0),
      0,
      PLAYER_CONFIG.height + 0.5
    );

    const meshes = arenaObjects.map(obj => obj.mesh);
    const intersects = raycaster.intersectObjects(meshes, false);

    if (intersects.length > 0 && intersects[0].face) {
      this.groundNormal.copy(intersects[0].face.normal).normalize();
      this.slopeAngle = this.groundNormal.angleTo(new THREE.Vector3(0, 1, 0));
    } else {
      this.groundNormal.set(0, 1, 0);
      this.slopeAngle = 0;
    }
  }

  public update(
    delta: number,
    inputDir: THREE.Vector3,
    wantsToSprint: boolean,
    wantsJump: boolean,
    wantsCrouch: boolean,
    canCutJump: boolean,
    arenaObjects: Array<{ mesh: THREE.Mesh; box: THREE.Box3 }>,
    mapSize: number = 60 // Default to classic arena size if not provided
  ): void {
    this.prevVelocity.copy(this.velocity);

    const hasInput = inputDir.length() > 0;
    if (hasInput) {
      inputDir.normalize();
      inputDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotation.y);

      // Slope adjustment: Project input direction onto the slope plane
      if (this.onGround && this.slopeAngle > 0) {
        // Calculate the direction perpendicular to the slope normal and the right vector
        // Calculate the direction perpendicular to the slope normal and the right vector
        // If moving straight up/down slope, right vector might be zero-ish, handle that?
        // Better: project inputDir onto the plane defined by groundNormal
        inputDir.projectOnPlane(this.groundNormal).normalize();
      }
    }

    // Slide Cooldown
    if (this.slideCooldownTimer > 0) {
      this.slideCooldownTimer -= delta;
    }

    // Slide Initiation
    if (wantsCrouch && this.isSprinting && this.onGround && this.slideCooldownTimer <= 0 && !this.isSliding) {
      this.isSliding = true;
      this.slideTimer = PLAYER_CONFIG.slideDuration;
      this.slideDirection.copy(this.velocity).normalize();
      // Boost speed slightly on slide start
      this.velocity.add(this.slideDirection.clone().multiplyScalar(2));
      // Play slide sound (TODO)
    }

    // Slide State Management
    if (this.isSliding) {
      this.slideTimer -= delta;
      if (this.slideTimer <= 0 || this.velocity.length() < PLAYER_CONFIG.walkSpeed * 0.5) {
        this.isSliding = false;
        this.slideCooldownTimer = PLAYER_CONFIG.slideCooldown;
      }
    }

    // Sprint and stamina
    // Can't sprint while sliding, but we check wantsToSprint for slide initiation
    this.isSprinting = wantsToSprint && this.onGround && this.stamina > 0 && !this.isSliding;
    if (this.isSprinting) {
      this.stamina -= PLAYER_CONFIG.staminaDrain * delta;
      if (this.stamina < 0) {
        this.stamina = 0;
        this.isSprinting = false;
      }
    } else {
      this.stamina = Math.min(PLAYER_CONFIG.maxStamina, this.stamina + PLAYER_CONFIG.staminaRegen * delta);
    }

    // Movement
    let targetSpeed = PLAYER_CONFIG.walkSpeed;
    if (this.isSprinting) targetSpeed = PLAYER_CONFIG.sprintSpeed;
    targetSpeed *= this.speedMultiplier;

    const isGrounded = this.onGround;
    const horizVel = new THREE.Vector2(this.velocity.x, this.velocity.z);

    if (this.isSliding) {
      // Slide physics
      const slideSpeed = PLAYER_CONFIG.slideSpeed * (this.slideTimer / PLAYER_CONFIG.slideDuration);
      const targetSlideVel = new THREE.Vector2(this.slideDirection.x, this.slideDirection.z).multiplyScalar(slideSpeed);

      // Apply friction/decay
      horizVel.lerp(targetSlideVel, PLAYER_CONFIG.slideFriction * delta);

      // Allow slight steering? (Optional, keeping it locked for now as per "lock player to slide direction")
    } else {
      // Normal movement
      const accel = isGrounded ? PLAYER_CONFIG.groundAccel : PLAYER_CONFIG.airAccel;
      const decel = isGrounded ? PLAYER_CONFIG.groundDecel : PLAYER_CONFIG.airDecel;

      if (hasInput) {
        const targetVel = new THREE.Vector2(inputDir.x, inputDir.z).multiplyScalar(targetSpeed);
        horizVel.lerp(targetVel, accel * delta);
      } else {
        const decayFactor = Math.exp(-decel * delta);
        horizVel.multiplyScalar(decayFactor);
      }
    }

    this.velocity.x = horizVel.x;
    this.velocity.z = horizVel.y;

    // Head bob time for weapon animation
    const speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
    this.headBobTime += delta * speed * 2;

    // Footstep sounds
    if (this.onGround && speed > 1 && !this.isSliding) {
      const footstepInterval = this.isSprinting ? 0.3 : 0.4;
      this.lastFootstepTime += delta;
      if (this.lastFootstepTime >= footstepInterval) {
        this.playFootstepSound();
        this.lastFootstepTime = 0;
      }
    }

    // Jump mechanics
    if (this.onGround) {
      this.coyoteTimer = PLAYER_CONFIG.coyoteTime;
      this.isJumping = false;
    } else {
      this.coyoteTimer = Math.max(0, this.coyoteTimer - delta);
    }

    this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - delta);

    const canJump = this.coyoteTimer > 0 || this.onGround;
    if (canJump && wantsJump) {
      this.velocity.y = PLAYER_CONFIG.jumpForce;
      this.isJumping = true;
      this.canCutJump = true;
      this.coyoteTimer = 0;
      this.jumpBufferTimer = 0;
      this.playJumpSound();

      // Slide Jump: Cancel slide but keep momentum
      if (this.isSliding) {
        this.isSliding = false;
        this.slideCooldownTimer = PLAYER_CONFIG.slideCooldown;
        // Optional: Add jump boost from slide
        // this.velocity.add(this.slideDirection.clone().multiplyScalar(2));
      }
    }

    if (canCutJump && this.canCutJump && this.velocity.y > 0) {
      this.velocity.y *= PLAYER_CONFIG.jumpCutMultiplier;
      this.canCutJump = false;
    }

    // Gravity
    this.velocity.y -= PLAYER_CONFIG.gravity * delta;

    // Move and collision
    const newPos = this.position.clone().add(this.velocity.clone().multiplyScalar(delta));

    // Arena bounds
    const bounds = mapSize / 2 - 0.5; // Half of arena size
    if (newPos.x < -bounds) { newPos.x = -bounds; this.velocity.x = 0; }
    if (newPos.x > bounds) { newPos.x = bounds; this.velocity.x = 0; }
    if (newPos.z < -bounds) { newPos.z = -bounds; this.velocity.z = 0; }
    if (newPos.z > bounds) { newPos.z = bounds; this.velocity.z = 0; }

    // Collision with arena objects
    const playerRadius = 0.4;
    const stepHeight = PLAYER_CONFIG.stepHeight;
    this.onGround = false;

    // Check slope before collision resolution to have normal ready
    this.checkSlope(arenaObjects);

    // Prevent moving up steep slopes
    if (this.onGround && this.slopeAngle > this.maxSlopeAngle) {
      // Apply sliding force down the slope
      const downSlope = new THREE.Vector3(0, -1, 0).projectOnPlane(this.groundNormal).normalize();
      this.velocity.add(downSlope.multiplyScalar(PLAYER_CONFIG.gravity * delta));
    }

    arenaObjects.forEach((obj) => {
      const box = obj.box.clone();
      const playerBox = new THREE.Box3(
        new THREE.Vector3(newPos.x - playerRadius, newPos.y - PLAYER_CONFIG.height, newPos.z - playerRadius),
        new THREE.Vector3(newPos.x + playerRadius, newPos.y, newPos.z + playerRadius)
      );

      if (playerBox.intersectsBox(box)) {
        const heightDiff = box.max.y - (newPos.y - PLAYER_CONFIG.height);
        if (heightDiff > 0 && heightDiff < stepHeight && this.velocity.y <= 0) {
          newPos.y = box.max.y + PLAYER_CONFIG.height;
          this.handleLanding(Math.abs(this.prevVelocity.y));
          this.velocity.y = 0;
          this.onGround = true;
        } else if (playerBox.max.y > box.max.y && this.velocity.y < 0) {
          newPos.y = box.max.y + PLAYER_CONFIG.height;
          this.handleLanding(Math.abs(this.prevVelocity.y));
          this.velocity.y = 0;
          this.onGround = true;
        } else if (playerBox.min.y < box.min.y && this.velocity.y > 0) {
          newPos.y = box.min.y + PLAYER_CONFIG.height;
          this.velocity.y = 0;
        } else {
          const overlapX = Math.min(playerBox.max.x - box.min.x, box.max.x - playerBox.min.x);
          const overlapZ = Math.min(playerBox.max.z - box.min.z, box.max.z - playerBox.min.z);

          if (overlapX < overlapZ) {
            newPos.x += newPos.x < box.min.x ? -overlapX : overlapX;
            this.velocity.x = 0;
          } else {
            newPos.z += newPos.z < box.min.z ? -overlapZ : overlapZ;
            this.velocity.z = 0;
          }
        }
      }
    });

    // Ground collision
    if (newPos.y <= PLAYER_CONFIG.height) {
      const landingSpeed = Math.abs(this.prevVelocity.y);
      this.handleLanding(landingSpeed);
      newPos.y = PLAYER_CONFIG.height;
      this.velocity.y = 0;
      this.onGround = true;
    }

    this.position.copy(newPos);
  }

  public reset(): void {
    this.position.set(0, PLAYER_CONFIG.height, 0);
    this.velocity.set(0, 0, 0);
    this.health = PLAYER_CONFIG.maxHealth;
    this.armor = 0;
    this.stamina = PLAYER_CONFIG.maxStamina;
    this.powerup = null;
    this.powerupTimer = 0;
    this.damageMultiplier = 1;
    this.speedMultiplier = 1;
    this.isSliding = false;
    this.slideTimer = 0;
    this.slideCooldownTimer = 0;
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
  }
}

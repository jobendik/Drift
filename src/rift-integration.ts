import * as THREE from 'three';
import { AssetManager } from './core/AssetManager';
import { WeaponSystem } from './systems/WeaponSystem';
import { ParticleSystem } from './systems/ParticleSystem';
import { DecalSystem, SurfaceMaterial } from './systems/DecalSystem';
import { BulletTracerSystem } from './systems/BulletTracerSystem';
import { ImpactSystem } from './systems/ImpactSystem';
import { ScreenEffects } from './systems/ScreenEffects';
import { HUDManager } from './ui/HUDManager';
import { KillfeedManager } from './ui/KillfeedManager';

import { AudioManager } from './managers/AudioManager';
import { MESSAGE_HIT } from './core/Constants';

/**
 * RIFT Integration Manager
 * 
 * This class serves as the bridge between the existing Drift engine and the new RIFT FPS systems.
 * It initializes and manages all the subsystems required for the FPS experience.
 */
export class RIFTIntegration {
  // Systems
  public weaponSystem: WeaponSystem;
  public particleSystem: ParticleSystem;
  public decalSystem: DecalSystem;
  public tracerSystem: BulletTracerSystem;
  public impactSystem: ImpactSystem;
  public screenEffects: ScreenEffects;
  public audioManager: AudioManager;
  
  // UI
  public hudManager: HUDManager;
  public killfeedManager: KillfeedManager;

  // Core references
  private camera: THREE.PerspectiveCamera;
  private raycaster: THREE.Raycaster;

  // State
  private isInitialized: boolean = false;

  constructor(
    scene: THREE.Scene, 
    camera: THREE.PerspectiveCamera, 
    audioListener: THREE.AudioListener,
    assetManager: AssetManager
  ) {
    this.camera = camera;
    this.raycaster = new THREE.Raycaster();
    this.raycaster.camera = camera;

    // Initialize Audio Manager
    this.audioManager = new AudioManager(camera);

    // Initialize Systems
    this.particleSystem = new ParticleSystem(scene);
    this.decalSystem = new DecalSystem(scene);
    this.tracerSystem = new BulletTracerSystem(scene, camera);
    this.impactSystem = new ImpactSystem(scene, audioListener);
    this.screenEffects = new ScreenEffects(camera);
    
    // WeaponSystem depends on ParticleSystem
    this.weaponSystem = new WeaponSystem(scene, camera, assetManager, this.audioManager);

    // Initialize UI
    this.hudManager = new HUDManager();
    this.killfeedManager = new KillfeedManager();

    // Preload player sounds
    this.preloadPlayerSounds();
    
    // Preload enemy sounds
    this.preloadEnemySounds();

    this.isInitialized = true;
    console.log('RIFT Integration Initialized');
  }

  /**
   * Preload player audio files for instant playback
   */
  private preloadPlayerSounds(): void {
    const playerSounds = [
      // Footsteps
      '/assets/audio/sfx/player/Concrete-Run-1.mp3_c0954406.mp3',
      '/assets/audio/sfx/player/Concrete-Run-2.mp3_bcd23528.mp3',
      '/assets/audio/sfx/player/Concrete-Run-3.mp3_721706e6.mp3',
      '/assets/audio/sfx/player/Concrete-Run-4.mp3_4f98c76e.mp3',
      '/assets/audio/sfx/player/Concrete-Run-5.mp3_121ee958.mp3',
      '/assets/audio/sfx/player/Concrete-Run-6.mp3_a62fc298.mp3',
      // Jump/Land
      '/assets/audio/sfx/player/Jump.mp3_523dd26f.mp3',
      '/assets/audio/sfx/player/Land-1.mp3_58b9ba36.mp3',
      '/assets/audio/sfx/player/Land-2.mp3_de259dd1.mp3',
      // Grunts/Death
      '/assets/audio/sfx/player/Echo-Grunt-1.mp3_1cd206a1.mp3',
      '/assets/audio/sfx/player/Echo-Grunt-2.mp3_17321d9c.mp3',
      '/assets/audio/sfx/player/Echo-Grunt-3.mp3_31597fb1.mp3',
      '/assets/audio/sfx/player/Echo-Death-1.mp3_4264c0fa.mp3',
      // Heartbeat
      '/assets/audio/sfx/player/Heart-Beat.mp3_1e759b97.mp3'
    ];
    
    this.audioManager.preloadAudios(playerSounds);
    console.log('Player sounds queued for preloading');
  }

  /**
   * Preload enemy audio files for instant playback
   */
  private preloadEnemySounds(): void {
    const enemySounds = [
      // Kulu (male enemy) sounds
      '/assets/audio/sfx/enemy/Kulu-Death-1.mp3_d65e968a.mp3',
      '/assets/audio/sfx/enemy/Kulu-Grunt-1.mp3_ea942b67.mp3',
      '/assets/audio/sfx/enemy/Kulu-Grunt-2.mp3_8e323b62.mp3',
      '/assets/audio/sfx/enemy/Kulu-Grunt-3.mp3_5bae51a4.mp3',
      '/assets/audio/sfx/enemy/Kulu-Jump-1.mp3_3aef7e5f.mp3',
      '/assets/audio/sfx/enemy/Kulu-Jump-2.mp3_8cba70b6.mp3',
      // Female enemy sounds
      '/assets/audio/sfx/enemy/Female-Death-1.mp3_37cc105e.mp3',
      '/assets/audio/sfx/enemy/Female-Grunt-1.mp3_5f82c672.mp3',
      '/assets/audio/sfx/enemy/Female-Grunt-2.mp3_b787f958.mp3',
      '/assets/audio/sfx/enemy/Female-Grunt-3.mp3_4d6460fd.mp3',
    ];
    
    this.audioManager.preloadAudios(enemySounds);
    console.log('Enemy sounds queued for preloading');
  }

  /**
   * Handle shooting logic including raycasting, effects, and damage
   */
  public handleShooting(
    playerOnGround: boolean, 
    playerIsSprinting: boolean, 
    playerVelocity: THREE.Vector3,
    obstacles: THREE.Object3D[]
  ): void {
    const result = this.weaponSystem.shoot(
      this.camera,
      playerOnGround,
      playerIsSprinting,
      playerVelocity
    );

    if (result.shotFired) {
      const config = this.weaponSystem.currentConfig;
      
      // Apply screen effects
      // 1. Screen shake based on weapon power
      const weaponPower = config.damage / 30; // Normalize damage to power scale
      this.screenEffects.addFireShake(weaponPower);
      
      // 2. FOV punch for impact feel
      this.screenEffects.addFOVPunch(1.5 * weaponPower, 0.08);
      
      // 3. Camera recoil (actual camera rotation)
      const recoilPitch = config.recoil.pitchAmount * 0.5; // Scale down for camera
      const recoilYaw = (Math.random() - 0.5) * config.recoil.yawAmount * 0.5;
      this.screenEffects.applyRecoil(recoilPitch, recoilYaw);
      this.screenEffects.setRecoilRecoveryRate(config.recoil.recoveryRate);
      
      // 4. Spawn muzzle smoke
      const muzzlePos = this.weaponSystem.getMuzzleWorldPosition();
      const muzzleDir = this.camera.getWorldDirection(new THREE.Vector3());
      this.particleSystem.spawnMuzzleSmoke(muzzlePos, muzzleDir);

      // Process each shot (shotguns have multiple)
      const directions = result.directions || [result.direction];
      
      directions.forEach((dir: THREE.Vector3) => {
        this.processShot(dir, obstacles);
      });

      // Update HUD
      this.updateHUD();
    }
  }

  /**
   * Process a shot from an enemy (AI) entity
   * @param camera The enemy's virtual camera
   * @param direction The shot direction
   * @param muzzlePosition The world position of the weapon muzzle
   * @param obstacles Objects to raycast against
   * @param shooter The enemy entity that fired the shot
   * @param damage The damage amount
   */
  public processEnemyShot(
    camera: THREE.Camera,
    direction: THREE.Vector3,
    muzzlePosition: THREE.Vector3,
    obstacles: THREE.Object3D[],
    shooter: any,
    damage: number
  ): void {
    // Raycast from enemy camera
    const rayOrigin = new THREE.Vector3();
    camera.getWorldPosition(rayOrigin);
    this.raycaster.set(rayOrigin, direction);
    
    const intersects = this.raycaster.intersectObjects(obstacles, true);

    let endPoint: THREE.Vector3;
    let hitObject: THREE.Object3D | null = null;

    if (intersects.length > 0) {
      const hit = intersects[0];
      endPoint = hit.point;
      hitObject = hit.object;

      // Determine material
      let material = SurfaceMaterial.ROCK;
      
      if (hitObject.name.includes('wood') || hitObject.userData.material === 'wood') {
        material = SurfaceMaterial.WOOD;
      } else if (hitObject.name.includes('metal') || hitObject.userData.material === 'metal') {
        material = SurfaceMaterial.METAL;
      }

      // Spawn effects
      this.decalSystem.createDecal(hit.point, hit.face?.normal || new THREE.Vector3(0, 1, 0), material);
      this.particleSystem.spawnMaterialImpact(hit.point, hit.face?.normal || new THREE.Vector3(0, 1, 0), material);
      // Play surface impact sound at reduced volume
      this.impactSystem.playSurfaceImpact(hit.point, material);

      // Apply damage if it's a damageable entity (enemy, player, etc.)
      let entity = hitObject.userData.entity;
      if (!entity) {
        hitObject.traverseAncestors((ancestor: any) => {
          if (!entity && ancestor.userData.entity) {
            entity = ancestor.userData.entity;
          }
        });
      }

      // Only process as a hit if the entity has health (is damageable) and isn't the shooter
      if (entity && entity !== shooter && typeof entity.health === 'number') {
        console.log('Enemy hit entity:', entity.name, 'Health:', entity.health, 'Damage:', damage);
        
        // Apply damage via message system
        if (entity.handleMessage) {
          const telegram = {
            message: MESSAGE_HIT,
            data: { damage: damage, direction: direction },
            sender: shooter
          };
          entity.handleMessage(telegram);
        }

        this.impactSystem.playBodyImpact(hit.point);
        this.particleSystem.spawnImpactEffect(hit.point, false);
      }

    } else {
      // Miss - extend to max range
      endPoint = camera.position.clone().add(direction.multiplyScalar(100));
    }

    // Create tracer
    this.tracerSystem.createTracer(muzzlePosition, endPoint);
  }

  private processShot(direction: THREE.Vector3, obstacles: THREE.Object3D[]): void {
    const muzzlePos = this.weaponSystem.getMuzzleWorldPosition();
    
    // Raycast from camera
    const rayOrigin = new THREE.Vector3();
    this.camera.getWorldPosition(rayOrigin);
    this.raycaster.set(rayOrigin, direction);
    
    // Raycast against provided obstacles (already filtered by Player.shoot)
    console.log('=== RAYCAST START ===');
    console.log('Origin:', rayOrigin);
    console.log('Direction:', direction);
    console.log('Obstacles:', obstacles.length);
    obstacles.forEach((obs, i) => {
        console.log(`  [${i}] ${obs.name || obs.type} - Children: ${obs.children.length}`);
    });

    const intersects = this.raycaster.intersectObjects(obstacles, true);

    console.log('Intersects found:', intersects.length);
    if (intersects.length === 0) {
        console.log('❌ MISS - No hits detected');
    } else {
        console.log('✓ HIT:', intersects[0].object.name, 'at distance', intersects[0].distance.toFixed(2));
        console.log('  Object type:', intersects[0].object.type);
        console.log('  Has userData.entity:', !!intersects[0].object.userData.entity);
    }

    let endPoint: THREE.Vector3;
    let hitObject: THREE.Object3D | null = null;

    if (intersects.length > 0) {
      const hit = intersects[0];
      endPoint = hit.point;
      hitObject = hit.object;
      
      console.log('Raycast hit:', hitObject.name, hitObject.userData);

      // Determine material
      // In a real implementation, we'd check the object's userData or material type
      // For now, we'll default to CONCRETE/STONE unless specified
      let material = SurfaceMaterial.ROCK;
      
      // Check for specific materials based on object names or userData
      if (hitObject.name.includes('wood') || hitObject.userData.material === 'wood') {
        material = SurfaceMaterial.WOOD;
      } else if (hitObject.name.includes('metal') || hitObject.userData.material === 'metal') {
        material = SurfaceMaterial.METAL;
      }

      // Spawn effects
      this.decalSystem.createDecal(hit.point, hit.face?.normal || new THREE.Vector3(0, 1, 0), material);
      
      // Use spawnMaterialImpact for surface hits
      this.particleSystem.spawnMaterialImpact(hit.point, hit.face?.normal || new THREE.Vector3(0, 1, 0), material);
      
      // Play surface impact sound at reduced volume
      this.impactSystem.playSurfaceImpact(hit.point, material);

      // Apply damage if it's a damageable entity (enemy, player, etc.)
      // Check the hit object and all its ancestors for userData.entity
      let entity = hitObject.userData.entity;
      if (!entity) {
        hitObject.traverseAncestors((ancestor: any) => {
          if (!entity && ancestor.userData.entity) {
            entity = ancestor.userData.entity;
          }
        });
      }

      // Only process as a hit if the entity has health (is damageable)
      // This excludes level geometry which has userData.entity but no health property
      if (entity && typeof entity.health === 'number') {
        console.log('HIT ENTITY:', entity.name, 'Health:', entity.health);
        
        // Headshot detection - check if hit point is in the upper part of the entity
        // Assuming entity has a position and height of ~1.8 (human height)
        const entityY = entity.position?.y ?? 0;
        const entityHeight = entity.height ?? 1.8;
        const headZone = entityY + entityHeight * 0.85; // Upper 15% is head zone
        const isHeadshot = hit.point.y >= headZone;
        
        // Calculate damage with headshot multiplier
        const baseDamage = this.weaponSystem.currentConfig.damage;
        const damage = isHeadshot ? baseDamage * 2.5 : baseDamage; // 2.5x headshot multiplier
        
        console.log(`Hit at Y=${hit.point.y.toFixed(2)}, HeadZone=${headZone.toFixed(2)}, Headshot=${isHeadshot}`);
        
        // Apply damage via message system
        if (entity.handleMessage) {
            const telegram = {
                message: MESSAGE_HIT,
                data: { damage: damage, direction: direction, isHeadshot: isHeadshot },
                sender: { isPlayer: true, uuid: 'player' }
            };
            entity.handleMessage(telegram);
        }

        // Play audio feedback
        this.impactSystem.playBodyImpact(hit.point);
        this.impactSystem.playHitConfirmation(); // Instant hit sound feedback
        
        // Check if kill (assuming entity has health)
        const isKill = entity.health <= 0;
        this.hudManager.showHitmarker(isKill);
        this.hudManager.showHitFeedback(isKill, isHeadshot);
        
        // Show headshot/kill icons and play appropriate sounds
        if (isKill) {
          // Play Kulu death sound instead of generic death impact
          this.playEnemyDeathSound(hit.point);
          if (isHeadshot) {
            this.hudManager.showHeadshotIcon();
          } else {
            this.hudManager.showKillIcon();
          }
        } else {
          // Play grunt sound when enemy takes damage but doesn't die
          this.playEnemyGruntSound(hit.point);
        }
        
        // Also spawn blood/impact effect for body hit
        this.particleSystem.spawnImpactEffect(hit.point, isHeadshot);
      }

    } else {
      // Miss - extend to max range
      endPoint = this.camera.position.clone().add(direction.multiplyScalar(100));
    }

    // Create tracer
    this.tracerSystem.createTracer(muzzlePos, endPoint);
  }

  public update(delta: number, mouseMovement: { x: number, y: number }, isSprinting: boolean): void {
    if (!this.isInitialized) return;

    // Update all systems
    this.weaponSystem.update(delta, mouseMovement, isSprinting);
    this.particleSystem.update(delta);
    this.decalSystem.update(delta);
    this.tracerSystem.update(delta);
    this.screenEffects.update(delta);

    // Update HUD with weapon state
    this.updateHUD();
  }

  private updateHUD(): void {
    this.hudManager.updateAmmo(
      this.weaponSystem.currentMag,
      this.weaponSystem.reserveAmmo
    );
    
    // Update crosshair spread based on weapon state
    const spread = this.weaponSystem.getCurrentSpread();
    this.hudManager.updateCrosshair(spread * 100); // Scale for visual effect
  }

  public resize(_width: number, _height: number): void {
    // Handle resize events if necessary
  }

  public dispose(): void {
    this.decalSystem.clear();
    this.tracerSystem.clear();
    this.particleSystem.clear();
    this.screenEffects.reset();
    // Dispose other resources
  }

  /**
   * Apply damage effects when player takes damage
   * @param damageAmount Amount of damage taken
   * @param maxHealth Player's max health
   * @param directionAngle Optional angle to attacker in degrees
   * @param postProcessing Optional post-processing system for vignette pulse
   */
  public applyDamageEffects(damageAmount: number, maxHealth: number, directionAngle?: number, postProcessing?: any): void {
    // Screen shake based on damage
    const damagePercent = damageAmount / maxHealth;
    this.screenEffects.addDamageShake(damagePercent);
    
    // HUD vignette effect
    this.hudManager.showDamageVignette(damageAmount, maxHealth, directionAngle);
    
    // Post-processing vignette pulse for extra impact
    if (postProcessing) {
      const intensity = 0.5 + damagePercent * 0.3; // 0.5 to 0.8 based on damage
      postProcessing.pulseVignette(intensity, 0.4);
    }
    
    // Directional damage indicator
    if (directionAngle !== undefined) {
      this.hudManager.flashDamage(directionAngle);
    }
  }

  /**
   * Get current camera recoil for applying to player head rotation
   */
  public getCameraRecoil(): { pitch: number; yaw: number } {
    return this.screenEffects.getRecoil();
  }

  /**
   * Get screen shake offset to apply to camera position
   */
  public getShakeOffset(): THREE.Vector3 {
    return this.screenEffects.getShakeOffset();
  }

  /**
   * Play enemy death sound (Kulu death)
   */
  private playEnemyDeathSound(position: THREE.Vector3): void {
    const deathPath = '/assets/audio/sfx/enemy/Kulu-Death-1.mp3_d65e968a.mp3';
    this.audioManager.playPositionalSound(deathPath, position, 'sfx', { 
      volume: 1.5,
      refDistance: 12,
      maxDistance: 80
    });
  }

  /**
   * Play enemy grunt sound when taking damage
   */
  private playEnemyGruntSound(position: THREE.Vector3): void {
    const gruntNum = Math.floor(Math.random() * 3) + 1;
    const hashes: { [key: number]: string } = {
      1: 'ea942b67',
      2: '8e323b62',
      3: '5bae51a4'
    };
    const gruntPath = `/assets/audio/sfx/enemy/Kulu-Grunt-${gruntNum}.mp3_${hashes[gruntNum]}.mp3`;
    this.audioManager.playPositionalSound(gruntPath, position, 'sfx', { 
      volume: 1.3,
      refDistance: 10,
      maxDistance: 60
    });
  }
}

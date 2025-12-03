import * as THREE from 'three';
import { AssetManager } from './core/AssetManager';
import { WeaponSystem } from './systems/WeaponSystem';
import { ParticleSystem } from './systems/ParticleSystem';
import { DecalSystem, SurfaceMaterial } from './systems/DecalSystem';
import { BulletTracerSystem } from './systems/BulletTracerSystem';
import { ImpactSystem } from './systems/ImpactSystem';
import { HUDManager } from './ui/HUDManager';
import { KillfeedManager } from './ui/KillfeedManager';

import { AudioManager } from './managers/AudioManager';
import { MESSAGE_HIT, STATUS_ALIVE } from './core/Constants';

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
  public audioManager: AudioManager;
  
  // UI
  public hudManager: HUDManager;
  public killfeedManager: KillfeedManager;

  // Core references
  private camera: THREE.Camera;
  private raycaster: THREE.Raycaster;

  // State
  private isInitialized: boolean = false;

  constructor(
    scene: THREE.Scene, 
    camera: THREE.Camera, 
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
    
    // WeaponSystem depends on ParticleSystem
    this.weaponSystem = new WeaponSystem(scene, camera, assetManager, this.audioManager);

    // Initialize UI
    this.hudManager = new HUDManager();
    this.killfeedManager = new KillfeedManager();

    this.isInitialized = true;
    console.log('RIFT Integration Initialized');
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
      // Handle recoil on camera
      // Note: In a full integration, this would modify the camera's rotation directly
      // or feed into the input system. For now, we'll let the WeaponSystem handle its internal recoil state
      // and the PlayerController should query it.

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
      this.impactSystem.playSurfaceImpact(hit.point, material);

      // Apply damage if it's an entity
      let entity = hitObject.userData.entity;
      if (!entity) {
        hitObject.traverseAncestors((ancestor: any) => {
          if (!entity && ancestor.userData.entity) {
            entity = ancestor.userData.entity;
          }
        });
      }

      if (entity && entity !== shooter) {
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
      
      this.impactSystem.playSurfaceImpact(hit.point, material);

      // Apply damage if it's an entity
      // Check the hit object and all its ancestors for userData.entity
      let entity = hitObject.userData.entity;
      if (!entity) {
        hitObject.traverseAncestors((ancestor: any) => {
          if (!entity && ancestor.userData.entity) {
            entity = ancestor.userData.entity;
          }
        });
      }

      if (entity) {
        console.log('HIT ENTITY:', entity.name, 'Health:', entity.health);
        const damage = this.weaponSystem.currentConfig.damage;
        
        // Apply damage via message system
        if (entity.handleMessage) {
            const telegram = {
                message: MESSAGE_HIT,
                data: { damage: damage, direction: direction },
                sender: { isPlayer: true, uuid: 'player' }
            };
            entity.handleMessage(telegram);
        }

        this.impactSystem.playBodyImpact(hit.point);
        
        // Check if kill (assuming entity has health)
        const isKill = entity.health <= 0;
        this.hudManager.showHitmarker(isKill);
        
        // Also spawn blood/impact effect for body hit
        this.particleSystem.spawnImpactEffect(hit.point, false);
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
    // Dispose other resources
  }
}

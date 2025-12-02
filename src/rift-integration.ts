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

  private processShot(direction: THREE.Vector3, obstacles: THREE.Object3D[]): void {
    const muzzlePos = this.weaponSystem.getMuzzleWorldPosition();
    
    // Raycast
    this.raycaster.set(this.camera.position, direction);
    const intersects = this.raycaster.intersectObjects(obstacles, true);

    let endPoint: THREE.Vector3;
    let hitObject: THREE.Object3D | null = null;

    if (intersects.length > 0) {
      const hit = intersects[0];
      endPoint = hit.point;
      hitObject = hit.object;

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
      // This would connect to the game's damage system
      if (hitObject.userData.entity) {
        // hitObject.userData.entity.takeDamage(...)
        this.impactSystem.playBodyImpact(hit.point);
        this.hudManager.showHitmarker(false); // false = not a kill
        
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

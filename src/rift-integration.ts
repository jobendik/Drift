// RIFT Integration - Master Integration Module
// Combines all RIFT systems for easy import into Drift

import * as THREE from 'three';

// Re-export all types
export * from './types';

// Re-export all configs
export * from './config';

// Re-export all systems
export * from './systems';

// Re-export UI components
export * from './ui';

// Re-export managers
export * from './managers';

// Re-export game modes
export * from './gamemodes';

// Re-export network
export * from './network';

// Re-export lobby
export * from './lobby';

// Import specific classes for the integration helper
import { ParticleSystem } from './systems/ParticleSystem';
import { WeaponSystem } from './systems/WeaponSystem';
import { DecalSystem, SurfaceMaterial } from './systems/DecalSystem';
import { BulletTracerSystem } from './systems/BulletTracerSystem';
import { HUDManager } from './ui/HUDManager';
import { AudioManager } from './managers/AudioManager';

/**
 * RIFTIntegration - Helper class to initialize all RIFT systems at once
 * 
 * Usage:
 * ```typescript
 * const rift = new RIFTIntegration(scene, camera);
 * 
 * // In game loop:
 * rift.update(delta);
 * 
 * // On weapon fire:
 * const result = rift.weaponSystem.shoot(camera, onGround, sprinting, velocity);
 * if (result.shotFired) {
 *   rift.createBulletTracer(muzzlePos, hitPos);
 *   rift.createBulletHole(hitPos, hitNormal);
 * }
 * ```
 */
export class RIFTIntegration {
  public particleSystem: ParticleSystem;
  public weaponSystem: WeaponSystem;
  public decalSystem: DecalSystem;
  public tracerSystem: BulletTracerSystem;
  public hudManager: HUDManager;
  public audioManager: AudioManager;

  constructor(scene: THREE.Scene, camera: THREE.Camera) {

    // Initialize all systems
    this.audioManager = new AudioManager(camera);
    this.particleSystem = new ParticleSystem(scene);
    this.weaponSystem = new WeaponSystem(
      camera,
      this.audioManager.getListener(),
      this.particleSystem,
      scene  // Pass scene so weapon is added to scene, not camera
    );
    this.decalSystem = new DecalSystem(scene);
    this.tracerSystem = new BulletTracerSystem(scene);
    this.hudManager = new HUDManager();

    // Setup shell ejection callback
    this.weaponSystem.setShellEjectCallback((pos, dir) => {
      this.particleSystem.spawnShellCasing(pos, dir);
    });
  }

  /**
   * Update all systems - call this every frame
   */
  public update(
    delta: number,
    mouseMovement: { x: number; y: number } = { x: 0, y: 0 },
    isSprinting: boolean = false,
    headBobTime: number = 0
  ): void {
    this.particleSystem.update(delta);
    this.weaponSystem.update(delta, mouseMovement, isSprinting, headBobTime);
    this.decalSystem.update(delta);
    this.tracerSystem.update(delta);
    this.hudManager.updateKillfeed(delta);
  }

  /**
   * Create a bullet tracer from start to end point
   */
  public createBulletTracer(
    start: THREE.Vector3,
    end: THREE.Vector3,
    color: number = 0xffff00
  ): void {
    this.tracerSystem.createTracer(start, end, color);
  }

  /**
   * Create a bullet hole decal at impact point
   */
  public createBulletHole(
    position: THREE.Vector3,
    normal: THREE.Vector3,
    material: SurfaceMaterial = SurfaceMaterial.DEFAULT
  ): void {
    this.decalSystem.createBulletHole(position, normal, material);
  }

  /**
   * Spawn impact particles at hit location
   */
  public spawnImpact(
    position: THREE.Vector3,
    normal: THREE.Vector3,
    material: string = 'default',
    isEnemy: boolean = false
  ): void {
    if (isEnemy) {
      this.particleSystem.spawnImpactEffect(position, false);
    } else {
      this.particleSystem.spawnMaterialImpact(position, normal, material);
    }
  }

  /**
   * Show hit feedback on HUD (hitmarker + crosshair)
   */
  public showHit(isKill: boolean = false, isHeadshot: boolean = false): void {
    this.hudManager.showHitmarker(isKill);
    this.hudManager.showHitFeedback(isKill, isHeadshot);
    if (isKill) {
      this.hudManager.showKillIcon();
    }
  }

  /**
   * Update HUD with current weapon state
   */
  public updateWeaponHUD(): void {
    const config = this.weaponSystem.currentConfig;
    this.hudManager.updateWeaponName(config.name);
    this.hudManager.updateAmmo(this.weaponSystem.currentMag, this.weaponSystem.reserveAmmo);
    this.hudManager.showReloading(this.weaponSystem.isReloading);
    this.hudManager.updateCrosshair(this.weaponSystem.getCurrentSpread());
  }

  /**
   * Update HUD with player health
   */
  public updateHealthHUD(health: number, maxHealth: number, armor?: number, maxArmor?: number): void {
    this.hudManager.updateHealth(health, maxHealth);
    if (armor !== undefined && maxArmor !== undefined) {
      this.hudManager.updateArmor(armor, maxArmor);
    }
  }

  /**
   * Play a positioned sound in the world
   */
  public playWorldSound(
    path: string,
    position: THREE.Vector3,
    volume: number = 1.0
  ): void {
    this.audioManager.playPositionalSound(path, position, 'sfx', { volume });
  }

  /**
   * Clean up all systems
   */
  public dispose(): void {
    this.particleSystem.clear();
    this.decalSystem.clear();
    this.tracerSystem.clear();
    this.audioManager.dispose();
  }

  /**
   * Reset all systems for a new game
   */
  public reset(): void {
    this.weaponSystem.reset();
    this.particleSystem.clear();
    this.decalSystem.clear();
    this.tracerSystem.clear();
    this.hudManager.reset();
  }
}

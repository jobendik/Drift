import * as THREE from 'three';
import { ParticleSystem } from './ParticleSystem';
import { EnemyManager } from '../entities/EnemyManager';
import { Player } from '../entities/Player';
import { WeaponSystem } from './WeaponSystem';
import { DamageType } from '../core/DamageTypes';
import { ImpactSystem } from './ImpactSystem';

export class ExplosionSystem {
  private particleSystem: ParticleSystem;
  private enemyManager: EnemyManager;
  private player: Player;
  private weaponSystem: WeaponSystem;
  private impactSystem: ImpactSystem;

  constructor(
    particleSystem: ParticleSystem,
    enemyManager: EnemyManager,
    player: Player,
    weaponSystem: WeaponSystem,
    impactSystem: ImpactSystem
  ) {
    this.particleSystem = particleSystem;
    this.enemyManager = enemyManager;
    this.player = player;
    this.weaponSystem = weaponSystem;
    this.impactSystem = impactSystem;
  }

  public createExplosion(position: THREE.Vector3, radius: number, maxDamage: number, knockbackForce: number = 20): void {
    // 1. Visual Effects
    this.particleSystem.spawnExplosion(position);

    // 2. Audio Effects
    this.impactSystem.playExplosion(position);

    // 3. Camera Shake
    const distToPlayer = this.player.position.distanceTo(position);
    // Shake intensity falls off with distance
    // Max shake at 0 distance, 0 shake at 30m
    const shakeRadius = 30;
    if (distToPlayer < shakeRadius) {
        const shakeIntensity = Math.pow(1 - distToPlayer / shakeRadius, 2) * 2.0; // Quadratic falloff for punchy feel
        this.weaponSystem.cameraShake.intensity += shakeIntensity;
        this.weaponSystem.positionalShake.intensity += shakeIntensity * 0.5; // Add positional shake
    }

    // 4. Damage & Physics (Enemies)
    this.enemyManager.getEnemies().forEach(enemy => {
      const dist = enemy.mesh.position.distanceTo(position);
      if (dist < radius) {
        // Linear damage falloff
        const falloff = 1 - (dist / radius);
        const damage = maxDamage * falloff;
        
        // Knockback direction (away from explosion center)
        // Add some upward force for "pop"
        const dir = enemy.mesh.position.clone().sub(position).normalize();
        dir.y += 0.5; 
        dir.normalize();

        this.enemyManager.damageEnemy(enemy, {
          amount: damage,
          type: DamageType.Explosive,
          sourcePosition: position,
          knockbackForce: knockbackForce * falloff
        }, false); // Explosions don't count as headshots

        // If killed by explosion, maybe add extra force or gibs?
        // EnemyManager handles death logic (score, removal)
      }
    });

    // 5. Damage & Physics (Player)
    if (distToPlayer < radius) {
      const falloff = 1 - (distToPlayer / radius);
      const damage = maxDamage * falloff;
      
      this.player.takeDamage({
        amount: damage,
        type: DamageType.Explosive,
        sourcePosition: position,
        knockbackForce: knockbackForce * falloff
      });
    }
  }
}

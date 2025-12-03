import * as THREE from 'three';
import { ParticleSystem } from './ParticleSystem';

export interface ProjectileConfig {
  speed: number;
  gravity: number;
  damage: number;
  radius: number;
  lifetime: number;
  bounciness: number;
  friction: number;
  modelColor: number;
  trailColor: number;
}

interface Projectile {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  config: ProjectileConfig;
  lifetime: number;
  owner: 'player' | 'enemy';
  onDetonate: (position: THREE.Vector3) => void;
}

export class ProjectileSystem {
  private projectiles: Projectile[] = [];
  private scene: THREE.Scene;
  private particleSystem: ParticleSystem;
  
  // Reusable geometry/materials
  private grenadeGeometry: THREE.SphereGeometry;
  private grenadeMaterial: THREE.MeshStandardMaterial;

  constructor(scene: THREE.Scene, particleSystem: ParticleSystem) {
    this.scene = scene;
    this.particleSystem = particleSystem;
    this.grenadeGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    this.grenadeMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x444444, 
      roughness: 0.7,
      metalness: 0.3
    });
  }

  public spawnGrenade(
    position: THREE.Vector3, 
    direction: THREE.Vector3, 
    owner: 'player' | 'enemy',
    onDetonate: (pos: THREE.Vector3) => void
  ): void {
    const mesh = new THREE.Mesh(this.grenadeGeometry, this.grenadeMaterial.clone());
    mesh.position.copy(position);
    this.scene.add(mesh);

    // Add a light to make it visible
    const light = new THREE.PointLight(0xff0000, 1, 2);
    mesh.add(light);

    // Grenade config
    const config: ProjectileConfig = {
      speed: 15,
      gravity: 15,
      damage: 50,
      radius: 5,
      lifetime: 3.0,
      bounciness: 0.4,
      friction: 2.0,
      modelColor: 0x444444,
      trailColor: 0xff0000
    };

    const velocity = direction.clone().normalize().multiplyScalar(config.speed);
    // Add some upward arc if thrown by player
    if (owner === 'player') {
      velocity.y += 2;
    }

    this.projectiles.push({
      mesh,
      velocity,
      config,
      lifetime: config.lifetime,
      owner,
      onDetonate
    });
  }

  public update(delta: number, collisionObjects: THREE.Object3D[]): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      
      // Update lifetime
      proj.lifetime -= delta;
      if (proj.lifetime <= 0) {
        this.detonate(i);
        continue;
      }

      // Apply gravity
      proj.velocity.y -= proj.config.gravity * delta;

      // Trail
      this.particleSystem.spawnTrail(proj.mesh.position, 0xaaaaaa, 0.2);

      // Calculate next position
      const nextPos = proj.mesh.position.clone().add(proj.velocity.clone().multiplyScalar(delta));

      // Collision detection (Raycast for precision)
      const dir = nextPos.clone().sub(proj.mesh.position);
      const dist = dir.length();
      const raycaster = new THREE.Raycaster(proj.mesh.position, dir.normalize(), 0, dist);
      
      const intersects = raycaster.intersectObjects(collisionObjects, false);

      if (intersects.length > 0) {
        const hit = intersects[0];
        
        // Bounce
        const normal = hit.face?.normal || new THREE.Vector3(0, 1, 0);
        
        // Visuals
        if (proj.velocity.length() > 2.0) {
            this.particleSystem.spawnBounceSparks(hit.point, normal);
        }

        // Reflect velocity: v = v - 2 * (v . n) * n
        const dot = proj.velocity.dot(normal);
        proj.velocity.sub(normal.multiplyScalar(2 * dot));
        
        // Apply bounciness (energy loss)
        proj.velocity.multiplyScalar(proj.config.bounciness);
        
        // Apply friction if hitting floor
        if (normal.y > 0.7) {
            const friction = 1 - (proj.config.friction * delta);
            proj.velocity.x *= friction;
            proj.velocity.z *= friction;
        }

        // Move to hit point (plus radius)
        proj.mesh.position.copy(hit.point).add(normal.multiplyScalar(0.1));
        
        // Stop if too slow
        if (proj.velocity.lengthSq() < 0.1) {
            proj.velocity.set(0, 0, 0);
        }
      } else {
        // No collision, move normally
        proj.mesh.position.copy(nextPos);
      }
      
      // Rotate mesh for visual effect
      if (proj.velocity.lengthSq() > 0.1) {
          proj.mesh.rotation.x += proj.velocity.z * delta;
          proj.mesh.rotation.z -= proj.velocity.x * delta;
      }
      
      // Blink light
      const light = proj.mesh.children.find(c => c instanceof THREE.PointLight) as THREE.PointLight;
      if (light) {
          const freq = 10 + (3.0 - proj.lifetime) * 10; // Blink faster as time runs out
          light.intensity = (Math.sin(performance.now() * 0.01 * freq) + 1) * 2;
      }
    }
  }

  private detonate(index: number): void {
    const proj = this.projectiles[index];
    proj.onDetonate(proj.mesh.position);
    
    this.scene.remove(proj.mesh);
    this.projectiles.splice(index, 1);
  }
}

import * as THREE from 'three';

class ParticlePool {
  private pool: THREE.Object3D[] = [];
  private createFn: () => THREE.Object3D;
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene, createFn: () => THREE.Object3D, initialSize: number = 20) {
    this.scene = scene;
    this.createFn = createFn;
    for (let i = 0; i < initialSize; i++) {
      const obj = createFn();
      obj.visible = false;
      this.scene.add(obj);
      this.pool.push(obj);
    }
  }

  public get(): THREE.Object3D {
    let obj: THREE.Object3D;
    if (this.pool.length > 0) {
      obj = this.pool.pop()!;
    } else {
      obj = this.createFn();
      this.scene.add(obj);
    }
    obj.visible = true;
    return obj;
  }

  public release(obj: THREE.Object3D): void {
    obj.visible = false;
    this.pool.push(obj);
  }
}

export interface Particle {
  mesh: THREE.Mesh | THREE.Sprite;
  velocity: THREE.Vector3;
  lifetime: number;
  maxLifetime: number;
  initialScale?: number;
  gravity?: number;
}

interface Shell {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  rotationalVelocity: THREE.Vector3;
  lifetime: number;
  onHit?: (pos: THREE.Vector3) => void;
  hasHit: boolean;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private shells: Shell[] = [];
  private scene: THREE.Scene;
  
  // Pools
  private spherePool: ParticlePool;
  private cubePool: ParticlePool;
  private shellPool: ParticlePool;
  private smokePool: ParticlePool;
  private sparkPool: ParticlePool;
  private shockwavePool: ParticlePool;

  private hitImpactTexture?: THREE.Texture;
  private hitSpriteLowTexture?: THREE.Texture;
  private skullTexture?: THREE.Texture;
  private fireSmokeTexture?: THREE.Texture;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    
    // Initialize pools
    this.spherePool = new ParticlePool(scene, () => {
      return new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 4, 4),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
    }, 100);

    this.cubePool = new ParticlePool(scene, () => {
      return new THREE.Mesh(
        new THREE.BoxGeometry(0.03, 0.03, 0.03),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
    }, 50);

    this.shellPool = new ParticlePool(scene, () => {
      return new THREE.Mesh(
        new THREE.CylinderGeometry(0.01, 0.01, 0.05, 6),
        new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8, roughness: 0.2 })
      );
    }, 30);

    this.smokePool = new ParticlePool(scene, () => {
      const material = new THREE.SpriteMaterial({
        color: 0xaaaaaa,
        transparent: true,
        opacity: 0.5,
        blending: THREE.NormalBlending,
        depthWrite: false
      });
      return new THREE.Sprite(material);
    }, 50);

    this.sparkPool = new ParticlePool(scene, () => {
      return new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.05, 0.2),
        new THREE.MeshBasicMaterial({ color: 0xffff00 })
      );
    }, 50);

    this.shockwavePool = new ParticlePool(scene, () => {
      return new THREE.Mesh(
        new THREE.TorusGeometry(1, 0.1, 8, 32), // Radius 1, Tube 0.1
        new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.5 })
      );
    }, 10);

    this.loadTextures();
  }

  private loadTextures(): void {
    const textureLoader = new THREE.TextureLoader();
    
    textureLoader.load(
      'assets/images/Hit-Impact.png_3363db53.png',
      (texture) => {
        this.hitImpactTexture = texture;
      },
      undefined,
      (err) => console.warn('Failed to load hit impact texture:', err)
    );

    textureLoader.load(
      'assets/images/Hit-Sprite-Low.png_bf709f5e.png',
      (texture) => {
        this.hitSpriteLowTexture = texture;
      },
      undefined,
      (err) => console.warn('Failed to load hit sprite texture:', err)
    );

    textureLoader.load(
      'assets/images/Skull-Spritesheet.png_0d1e8283.png',
      (texture) => {
        this.skullTexture = texture;
        // Assuming spritesheet, but for now we'll use it as a single sprite or handle UVs if we knew the layout.
        // Since we don't know the layout (rows/cols), we'll treat it as a single high-impact icon for now.
        // If it looks weird, we can adjust UVs later.
      },
      undefined,
      (err) => console.warn('Failed to load skull texture:', err)
    );

    textureLoader.load(
      'assets/images/Fire-Smoke-Spritesheet.png_b8350fa1.png',
      (texture) => {
        this.fireSmokeTexture = texture;
      },
      undefined,
      (err) => console.warn('Failed to load fire smoke texture:', err)
    );
  }

  /**
   * Spawn basic particle burst - simple geometric particles
   */
  public spawn(position: THREE.Vector3, color: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const particle = this.spherePool.get() as THREE.Mesh;
      (particle.material as THREE.MeshBasicMaterial).color.setHex(color);
      (particle.material as THREE.MeshBasicMaterial).opacity = 1;
      (particle.material as THREE.MeshBasicMaterial).transparent = false;
      
      particle.position.copy(position);
      particle.scale.set(1, 1, 1);

      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 5,
        Math.random() * 5,
        (Math.random() - 0.5) * 5
      );

      this.particles.push({
        mesh: particle,
        velocity,
        lifetime: 0,
        maxLifetime: 0.5 + Math.random() * 0.5,
      });
    }
  }

  private spawnBlood(position: THREE.Vector3): void {
    const count = 4 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const particle = this.cubePool.get() as THREE.Mesh;
      (particle.material as THREE.MeshBasicMaterial).color.setHex(0xaa0000);
      (particle.material as THREE.MeshBasicMaterial).opacity = 1;
      
      particle.position.copy(position);
      particle.scale.set(0.7, 0.7, 0.7);

      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        Math.random() * 2,
        (Math.random() - 0.5) * 2
      );

      this.particles.push({
        mesh: particle,
        velocity,
        lifetime: 0,
        maxLifetime: 0.4 + Math.random() * 0.4,
        gravity: 9.8
      });
    }
  }

  /**
   * Spawn explosive sprite-based impact effect
   * Bright, satisfying bloom that makes every shot feel significant
   */
  public spawnImpactEffect(position: THREE.Vector3, isKill: boolean = false): void {
    // Spawn blood particles
    this.spawnBlood(position);

    if (isKill && this.skullTexture) {
      this.spawnKillEffect(position);
    }

    const texture = isKill ? this.hitImpactTexture : this.hitSpriteLowTexture;
    if (!texture) {
      // Fallback to basic particles
      this.spawn(position, isKill ? 0xffff00 : 0xff8800, isKill ? 15 : 8);
      return;
    }

    // Create multiple overlapping sprites for intense bloom effect
    const spriteCount = isKill ? 3 : 2;
    for (let i = 0; i < spriteCount; i++) {
      const spriteMaterial = new THREE.SpriteMaterial({
        map: texture,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 1,
        color: isKill ? 0xffff00 : 0xff4400, // Yellow for kills, orange for hits
      });

      const sprite = new THREE.Sprite(spriteMaterial);
      const baseScale = isKill ? 0.8 : 0.5;
      const scale = baseScale + i * 0.2; // Layered effect
      sprite.scale.set(scale, scale, scale);
      sprite.position.copy(position);

      this.scene.add(sprite);
      this.particles.push({
        mesh: sprite,
        velocity: new THREE.Vector3(0, 0, 0),
        lifetime: 0,
        maxLifetime: isKill ? 0.3 : 0.2, // Brief but intense
        initialScale: scale,
      });
    }
  }

  public spawnKillEffect(position: THREE.Vector3): void {
    if (!this.skullTexture) return;

    const spriteMaterial = new THREE.SpriteMaterial({
      map: this.skullTexture,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 1,
      color: 0xffffff,
      depthTest: false // Always visible on top
    });

    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(1.5, 1.5, 1.5);
    sprite.position.copy(position);
    sprite.position.y += 1.0; // Float above enemy

    this.scene.add(sprite);
    this.particles.push({
      mesh: sprite,
      velocity: new THREE.Vector3(0, 2, 0), // Float up
      lifetime: 0,
      maxLifetime: 1.0,
      initialScale: 1.5,
    });
  }

  /**
   * Spawn material-based impact effects
   */
  public spawnMaterialImpact(position: THREE.Vector3, normal: THREE.Vector3, material: string): void {
    switch (material) {
      case 'metal':
        this.spawnSparks(position, normal);
        this.spawnDebris(position, normal, 0xcccccc, 3);
        break;
      case 'wood':
        this.spawnDebris(position, normal, 0x8b4513, 6); // Brown splinters
        this.spawnDust(position, normal, 0x5d4037, 0.5); // Brown dust
        break;
      case 'concrete':
      case 'stone':
        this.spawnDebris(position, normal, 0x888888, 5); // Grey chunks
        this.spawnDust(position, normal, 0xaaaaaa, 0.8); // Grey dust
        break;
      case 'dirt':
      case 'grass':
        this.spawnDebris(position, normal, 0x5d4037, 4); // Dark brown clumps
        this.spawnDust(position, normal, 0x795548, 0.6); // Dirt cloud
        break;
      default:
        this.spawnDebris(position, normal, 0x888888, 4);
        this.spawnDust(position, normal, 0xcccccc, 0.4);
    }
  }

  private spawnSparks(position: THREE.Vector3, normal: THREE.Vector3): void {
    const count = 5 + Math.floor(Math.random() * 5);
    for (let i = 0; i < count; i++) {
      const spark = this.sparkPool.get() as THREE.Mesh;
      (spark.material as THREE.MeshBasicMaterial).opacity = 1;
      
      spark.position.copy(position);
      
      // Sparks fly off in reflection direction mostly
      const velocity = normal.clone().multiplyScalar(5 + Math.random() * 5);
      velocity.x += (Math.random() - 0.5) * 4;
      velocity.y += (Math.random() - 0.5) * 4;
      velocity.z += (Math.random() - 0.5) * 4;

      // Orient spark along velocity
      spark.lookAt(position.clone().add(velocity));

      this.particles.push({
        mesh: spark,
        velocity,
        lifetime: 0,
        maxLifetime: 0.1 + Math.random() * 0.2,
        gravity: 5 // Sparks fall fast
      });
    }
  }

  private spawnDust(position: THREE.Vector3, normal: THREE.Vector3, color: number, opacity: number): void {
    const count = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i++) {
      const dust = this.smokePool.get() as THREE.Sprite;
      const material = dust.material;
      
      if (this.fireSmokeTexture && !material.map) {
        material.map = this.fireSmokeTexture;
      }
      
      material.color.setHex(color);
      material.opacity = opacity * (0.2 + Math.random() * 0.2);
      material.rotation = Math.random() * Math.PI * 2;
      
      const scale = 0.3 + Math.random() * 0.3;
      dust.scale.set(scale, scale, 1);
      dust.position.copy(position);
      
      const velocity = normal.clone().multiplyScalar(0.5 + Math.random() * 1.0);
      velocity.add(new THREE.Vector3(
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5
      ));

      this.particles.push({
        mesh: dust,
        velocity,
        lifetime: 0,
        maxLifetime: 0.5 + Math.random() * 0.5,
        initialScale: scale,
        gravity: -0.2 // Slight rise
      });
    }
  }

  /**
   * Spawn surface impact particles - debris flying from surface
   */
  public spawnDebris(position: THREE.Vector3, normal: THREE.Vector3, color: number, count: number = 5): void {
    for (let i = 0; i < count; i++) {
      const particle = this.cubePool.get() as THREE.Mesh;
      (particle.material as THREE.MeshBasicMaterial).color.setHex(color);
      (particle.material as THREE.MeshBasicMaterial).opacity = 1;
      
      particle.position.copy(position);
      particle.scale.set(1, 1, 1);

      // Particles fly away from surface along normal with some spread
      const velocity = normal.clone().multiplyScalar(2 + Math.random() * 3);
      velocity.x += (Math.random() - 0.5) * 2;
      velocity.y += (Math.random() - 0.5) * 2;
      velocity.z += (Math.random() - 0.5) * 2;

      this.particles.push({
        mesh: particle,
        velocity,
        lifetime: 0,
        maxLifetime: 0.4 + Math.random() * 0.3,
        gravity: 9.8
      });
    }
  }

  /**
   * Spawn a shell casing that ejects from the weapon
   */
  public spawnShellCasing(position: THREE.Vector3, direction: THREE.Vector3, onHit?: (pos: THREE.Vector3) => void): void {
    const mesh = this.shellPool.get() as THREE.Mesh;
    
    mesh.position.copy(position);
    // Random initial rotation
    mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    
    const speed = 2 + Math.random() * 2;
    const velocity = direction.clone().multiplyScalar(speed);
    
    this.shells.push({
      mesh,
      velocity,
      rotationalVelocity: new THREE.Vector3(
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20
      ),
      lifetime: 3.0,
      onHit,
      hasHit: false
    });
  }

  /**
   * Spawn muzzle smoke effect
   */
  public spawnMuzzleSmoke(position: THREE.Vector3, direction: THREE.Vector3): void {
    // Only spawn smoke occasionally (30% chance) to avoid "fire" look
    if (Math.random() > 0.3) return;

    const count = 1;
    
    for (let i = 0; i < count; i++) {
      const sprite = this.smokePool.get() as THREE.Sprite;
      const material = sprite.material;
      
      if (this.fireSmokeTexture && !material.map) {
        material.map = this.fireSmokeTexture;
      }
      
      // Set color to white/light grey to look like gun smoke, not fire smoke
      material.color.setHex(0xeeeeee);

      // Extremely subtle opacity
      material.opacity = 0.02 + Math.random() * 0.05;
      material.rotation = Math.random() * Math.PI * 2;
      
      // Smaller scale
      const scale = 0.1 + Math.random() * 0.15;
      sprite.scale.set(scale, scale, 1);
      sprite.position.copy(position);
      
      // Add some randomness to position
      sprite.position.add(new THREE.Vector3(
        (Math.random() - 0.5) * 0.05,
        (Math.random() - 0.5) * 0.05,
        (Math.random() - 0.5) * 0.05
      ));

      // Velocity moves forward with the shot but slows down
      const speed = 0.2 + Math.random() * 0.3;
      const velocity = direction.clone().multiplyScalar(speed);
      velocity.add(new THREE.Vector3(
        (Math.random() - 0.5) * 0.1,
        0.2 + Math.random() * 0.2, // Gentle rise
        (Math.random() - 0.5) * 0.1
      ));

      this.particles.push({
        mesh: sprite,
        velocity,
        lifetime: 0,
        maxLifetime: 0.3 + Math.random() * 0.3, // Very short lifetime
        initialScale: scale,
        gravity: -0.3 // Very gentle buoyancy
      });
    }
  }

  /**
   * Spawn a full explosion effect with flash, fireball, debris, and shockwave
   */
  public spawnExplosion(position: THREE.Vector3): void {
    // 1. Flash (Bright center)
    const flash = this.spherePool.get() as THREE.Mesh;
    (flash.material as THREE.MeshBasicMaterial).color.setHex(0xffffee);
    (flash.material as THREE.MeshBasicMaterial).opacity = 1;
    (flash.material as THREE.MeshBasicMaterial).transparent = true;
    flash.position.copy(position);
    flash.scale.set(2, 2, 2);
    
    this.particles.push({
      mesh: flash,
      velocity: new THREE.Vector3(0, 0, 0),
      lifetime: 0,
      maxLifetime: 0.1, // Very short
      initialScale: 2
    });

    // 2. Fireball (Expanding spheres)
    const fireCount = 12;
    for (let i = 0; i < fireCount; i++) {
      const fire = this.spherePool.get() as THREE.Mesh;
      // Mix of orange and red
      const color = Math.random() > 0.5 ? 0xff4400 : 0xff8800;
      (fire.material as THREE.MeshBasicMaterial).color.setHex(color);
      (fire.material as THREE.MeshBasicMaterial).opacity = 0.8;
      (fire.material as THREE.MeshBasicMaterial).transparent = true;
      
      fire.position.copy(position);
      // Random offset
      fire.position.add(new THREE.Vector3(
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5
      ));
      
      const scale = 1.5 + Math.random();
      fire.scale.set(scale, scale, scale);

      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8 + 2, // Tend upwards
        (Math.random() - 0.5) * 8
      );

      this.particles.push({
        mesh: fire,
        velocity: velocity,
        lifetime: 0,
        maxLifetime: 0.4 + Math.random() * 0.3,
        initialScale: scale
      });
    }

    // 3. Debris (Solid chunks)
    const debrisCount = 15;
    for (let i = 0; i < debrisCount; i++) {
      const debris = this.cubePool.get() as THREE.Mesh;
      (debris.material as THREE.MeshBasicMaterial).color.setHex(0x333333); // Dark grey
      
      debris.position.copy(position);
      const scale = 0.2 + Math.random() * 0.3;
      debris.scale.set(scale, scale, scale);

      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 15,
        Math.random() * 10 + 5,
        (Math.random() - 0.5) * 15
      );

      this.particles.push({
        mesh: debris,
        velocity: velocity,
        lifetime: 0,
        maxLifetime: 1.5 + Math.random(),
        gravity: 15 // Heavy gravity
      });
    }

    // 4. Smoke (Rising dark clouds)
    if (this.fireSmokeTexture) {
        // If we have the texture, use sprites, otherwise fallback to spheres
        // For now, let's use spheres as "smoke" if no sprite logic is ready for this specific pool
        // Or reuse the smokePool if it exists.
        // I see smokePool in the class. Let's use it.
    }
    
    const smokeCount = 8;
    for(let i=0; i<smokeCount; i++) {
        // Use sphere pool as fallback smoke for now if smokePool logic is specific
        // Actually, let's check smokePool usage.
        // It seems smokePool uses sprites.
        // Let's just use dark spheres for now to be safe and consistent with other methods
        const smoke = this.spherePool.get() as THREE.Mesh;
        (smoke.material as THREE.MeshBasicMaterial).color.setHex(0x222222);
        (smoke.material as THREE.MeshBasicMaterial).opacity = 0.6;
        (smoke.material as THREE.MeshBasicMaterial).transparent = true;

        smoke.position.copy(position);
        const scale = 2.0 + Math.random();
        smoke.scale.set(scale, scale, scale);

        const velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 3,
            Math.random() * 3 + 1,
            (Math.random() - 0.5) * 3
        );

        this.particles.push({
            mesh: smoke,
            velocity: velocity,
            lifetime: 0,
            maxLifetime: 1.5 + Math.random(),
            initialScale: scale
        });
    }

    // 5. Shockwave (Expanding ring)
    const shockwave = this.shockwavePool.get() as THREE.Mesh;
    (shockwave.material as THREE.MeshBasicMaterial).opacity = 0.5;
    shockwave.position.copy(position);
    shockwave.rotation.x = -Math.PI / 2; // Lay flat
    shockwave.scale.set(0.1, 0.1, 0.1); // Start small

    this.particles.push({
        mesh: shockwave,
        velocity: new THREE.Vector3(0, 0, 0),
        lifetime: 0,
        maxLifetime: 0.5,
        initialScale: 0.1
    });
  }

  /**
   * Spawn a trail particle for grenades/rockets
   */
  public spawnTrail(position: THREE.Vector3, color: number, size: number): void {
    // Use smoke pool for trail
    const particle = this.smokePool.get() as THREE.Sprite;
    const material = particle.material;
    
    if (this.fireSmokeTexture && !material.map) {
      material.map = this.fireSmokeTexture;
    }
    
    material.color.setHex(color);
    material.opacity = 0.3;
    material.rotation = Math.random() * Math.PI * 2;
    
    particle.scale.set(size, size, 1);
    particle.position.copy(position);
    
    this.particles.push({
      mesh: particle,
      velocity: new THREE.Vector3(0, 0, 0), // Stationary trail
      lifetime: 0,
      maxLifetime: 0.5,
      initialScale: size,
      gravity: -0.5 // Slight rise
    });
  }

  /**
   * Spawn sparks for bouncing projectiles
   */
  public spawnBounceSparks(position: THREE.Vector3, normal: THREE.Vector3): void {
    this.spawnSparks(position, normal);
  }

  public update(delta: number): void {
    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      particle.lifetime += delta;

      if (particle.lifetime >= particle.maxLifetime) {
        if (particle.mesh instanceof THREE.Mesh) {
          if (particle.mesh.geometry.type === 'SphereGeometry') {
            this.spherePool.release(particle.mesh);
          } else if (particle.mesh.geometry.type === 'BoxGeometry') {
            this.cubePool.release(particle.mesh);
          } else if (particle.mesh.geometry.type === 'TorusGeometry') {
            this.shockwavePool.release(particle.mesh);
          } else {
            this.scene.remove(particle.mesh);
          }
        } else if (particle.mesh instanceof THREE.Sprite) {
           // Check if it belongs to smoke pool (simple check based on material props or just try to release)
           // For now, we assume sprites with specific properties are smoke.
           // A better way would be to tag particles with their source pool.
           // But since we only have one sprite pool for now (smoke), we can try to release it there.
           // However, impact sprites are also sprites but created manually.
           // Let's check if the material matches the smoke pool material properties roughly
           if (particle.mesh.material.depthWrite === false && particle.mesh.material.blending === THREE.NormalBlending) {
             this.smokePool.release(particle.mesh);
           } else {
             this.scene.remove(particle.mesh);
           }
        } else {
          this.scene.remove(particle.mesh);
        }
        this.particles.splice(i, 1);
        continue;
      }

      // Move particle
      particle.mesh.position.add(particle.velocity.clone().multiplyScalar(delta));
      
      // Apply gravity
      const gravity = particle.gravity !== undefined ? particle.gravity : 5;
      particle.velocity.y -= gravity * delta;

      // Fade out
      const lifeRatio = particle.lifetime / particle.maxLifetime;
      if (particle.mesh instanceof THREE.Sprite) {
        particle.mesh.material.opacity = 1 - lifeRatio;
        // Scale up slightly
        if (particle.initialScale) {
          const scale = particle.initialScale * (1 + lifeRatio * 0.5);
          particle.mesh.scale.set(scale, scale, 1);
        }
      } else {
        (particle.mesh.material as THREE.Material).opacity = 1 - lifeRatio;
        (particle.mesh.material as THREE.Material).transparent = true;
        
        // Special handling for shockwaves (Torus)
        if (particle.mesh.geometry.type === 'TorusGeometry') {
            const scale = 1 + lifeRatio * 20; // Expand significantly
            particle.mesh.scale.set(scale, scale, scale);
        }
      }
    }

    // Update shells
    for (let i = this.shells.length - 1; i >= 0; i--) {
      const shell = this.shells[i];
      shell.lifetime -= delta;
      
      if (shell.lifetime <= 0) {
        this.shellPool.release(shell.mesh);
        this.shells.splice(i, 1);
        continue;
      }
      
      // Gravity
      shell.velocity.y -= 9.8 * delta;
      
      // Move
      shell.mesh.position.add(shell.velocity.clone().multiplyScalar(delta));
      
      // Rotate
      shell.mesh.rotation.x += shell.rotationalVelocity.x * delta;
      shell.mesh.rotation.y += shell.rotationalVelocity.y * delta;
      shell.mesh.rotation.z += shell.rotationalVelocity.z * delta;
      
      // Floor collision
      if (shell.mesh.position.y <= 0.025) { // Half height
        if (!shell.hasHit) {
          shell.hasHit = true;
          if (shell.onHit) {
            shell.onHit(shell.mesh.position);
          }
          // Bounce
          shell.velocity.y = Math.abs(shell.velocity.y) * 0.5;
          shell.velocity.x *= 0.7;
          shell.velocity.z *= 0.7;
          shell.rotationalVelocity.multiplyScalar(0.5);
        } else {
          // Already hit, just slide/roll
          if (shell.mesh.position.y < 0.025) shell.mesh.position.y = 0.025;
          shell.velocity.y = 0;
          shell.velocity.x *= 0.9;
          shell.velocity.z *= 0.9;
          shell.rotationalVelocity.multiplyScalar(0.9);
        }
      }
    }
  }

  public clear(): void {
    this.particles.forEach((p) => this.scene.remove(p.mesh));
    this.particles.length = 0;
  }
}

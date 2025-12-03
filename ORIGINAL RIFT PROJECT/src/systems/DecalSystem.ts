import * as THREE from 'three';
import { SurfaceMaterial } from './ImpactSystem';

interface Decal {
  mesh: THREE.Mesh;
  lifetime: number;
  maxLifetime: number;
  material: THREE.MeshBasicMaterial;
}

export class DecalSystem {
  private decals: Decal[] = [];
  private scene: THREE.Scene;
  private bulletHoleTexture?: THREE.Texture;
  private crackHoleTexture?: THREE.Texture;
  private maxDecals = 50; // Limit to maintain performance and visual clarity

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.loadTextures();
  }

  private loadTextures(): void {
    const textureLoader = new THREE.TextureLoader();

    textureLoader.load(
      'assets/images/Bullet-Hole.png_6e4be8ce.png',
      (texture) => {
        this.bulletHoleTexture = texture;
      },
      undefined,
      (err) => console.warn('Failed to load bullet hole texture:', err)
    );

    textureLoader.load(
      'assets/images/Crack-Hole.png_ee41c0b1.png',
      (texture) => {
        this.crackHoleTexture = texture;
      },
      undefined,
      (err) => console.warn('Failed to load crack hole texture:', err)
    );
  }

  /**
   * Create a bullet hole decal at impact point
   * Decals are oriented to surface normal and fade over time for visual clarity
   */
  public createBulletHole(
    position: THREE.Vector3,
    normal: THREE.Vector3,
    material: SurfaceMaterial
  ): void {
    if (!this.bulletHoleTexture) return;

    // Use crack texture for brick/rock surfaces for variety
    const useCrack = 
      (material === SurfaceMaterial.BRICK || material === SurfaceMaterial.ROCK) &&
      this.crackHoleTexture &&
      Math.random() < 0.3;

    const texture = useCrack ? this.crackHoleTexture : this.bulletHoleTexture;
    const size = 0.15 + Math.random() * 0.1; // Slight size variation

    // Create decal mesh
    const geometry = new THREE.PlaneGeometry(size, size);
    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      depthTest: true,
    });

    const decal = new THREE.Mesh(geometry, mat);
    
    // Position slightly offset from surface to avoid z-fighting
    decal.position.copy(position).add(normal.clone().multiplyScalar(0.01));
    
    // Orient to surface normal
    decal.lookAt(position.clone().add(normal));
    
    // Random rotation for variety
    decal.rotateZ(Math.random() * Math.PI * 2);

    this.scene.add(decal);
    
    // Fade decals after 8 seconds, fully remove after 12 to keep arena clean
    this.decals.push({
      mesh: decal,
      lifetime: 0,
      maxLifetime: 12,
      material: mat,
    });

    // Remove oldest decal if we exceed max
    if (this.decals.length > this.maxDecals) {
      const oldest = this.decals.shift();
      if (oldest) {
        this.scene.remove(oldest.mesh);
        oldest.material.dispose();
        oldest.mesh.geometry.dispose();
      }
    }
  }

  public update(delta: number): void {
    for (let i = this.decals.length - 1; i >= 0; i--) {
      const decal = this.decals[i];
      decal.lifetime += delta;

      // Start fading at 8 seconds
      if (decal.lifetime > 8) {
        const fadeProgress = (decal.lifetime - 8) / (decal.maxLifetime - 8);
        decal.material.opacity = 0.9 * (1 - fadeProgress);
      }

      // Remove when lifetime exceeded
      if (decal.lifetime >= decal.maxLifetime) {
        this.scene.remove(decal.mesh);
        decal.material.dispose();
        decal.mesh.geometry.dispose();
        this.decals.splice(i, 1);
      }
    }
  }

  public clear(): void {
    this.decals.forEach((decal) => {
      this.scene.remove(decal.mesh);
      decal.material.dispose();
      decal.mesh.geometry.dispose();
    });
    this.decals.length = 0;
  }
}

// RIFT Integration - Decal System
// Handles bullet holes, impact marks on surfaces

import * as THREE from 'three';

export enum SurfaceMaterial {
  METAL = 'metal',
  WOOD = 'wood',
  CONCRETE = 'concrete',
  BRICK = 'brick',
  ROCK = 'rock',
  GLASS = 'glass',
  DIRT = 'dirt',
  GRASS = 'grass',
  FLESH = 'flesh',
  DEFAULT = 'default',
}

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
  private maxDecals = 50;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.loadTextures();
  }

  private loadTextures(): void {
    const textureLoader = new THREE.TextureLoader();

    textureLoader.load(
      'textures/effects/bullet-hole.png',
      (texture) => {
        this.bulletHoleTexture = texture;
      },
      undefined,
      () => {}
    );

    textureLoader.load(
      'textures/effects/crack-hole.png',
      (texture) => {
        this.crackHoleTexture = texture;
      },
      undefined,
      () => {}
    );
  }

  /**
   * Create a bullet hole decal at impact point
   */
  public createBulletHole(
    position: THREE.Vector3,
    normal: THREE.Vector3,
    material: SurfaceMaterial = SurfaceMaterial.DEFAULT
  ): void {
    // Use fallback if no texture loaded
    const useCrack = 
      (material === SurfaceMaterial.BRICK || material === SurfaceMaterial.ROCK) &&
      this.crackHoleTexture &&
      Math.random() < 0.3;

    const texture = useCrack ? this.crackHoleTexture : this.bulletHoleTexture;
    const size = 0.15 + Math.random() * 0.1;

    // Create decal mesh
    const geometry = new THREE.PlaneGeometry(size, size);
    const mat = new THREE.MeshBasicMaterial({
      map: texture || null,
      color: texture ? 0xffffff : 0x333333,
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

  /**
   * Detect surface material from mesh userData or name
   */
  public detectSurfaceMaterial(mesh: THREE.Object3D): SurfaceMaterial {
    const userData = mesh.userData;
    if (userData.surfaceMaterial) {
      return userData.surfaceMaterial as SurfaceMaterial;
    }

    const name = mesh.name.toLowerCase();
    if (name.includes('metal') || name.includes('steel')) return SurfaceMaterial.METAL;
    if (name.includes('wood') || name.includes('crate')) return SurfaceMaterial.WOOD;
    if (name.includes('concrete') || name.includes('floor')) return SurfaceMaterial.CONCRETE;
    if (name.includes('brick')) return SurfaceMaterial.BRICK;
    if (name.includes('rock') || name.includes('stone')) return SurfaceMaterial.ROCK;
    if (name.includes('glass')) return SurfaceMaterial.GLASS;
    if (name.includes('dirt') || name.includes('mud')) return SurfaceMaterial.DIRT;
    if (name.includes('grass')) return SurfaceMaterial.GRASS;

    return SurfaceMaterial.DEFAULT;
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

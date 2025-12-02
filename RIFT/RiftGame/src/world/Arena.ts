import * as THREE from 'three';
import { SurfaceMaterial } from '../systems/ImpactSystem';
import { MapConfig, MapObjectConfig } from '../config/MapConfig';

export class Arena {
  private scene: THREE.Scene;
  public arenaObjects: Array<{ mesh: THREE.Mesh; box: THREE.Box3; material: SurfaceMaterial }> = [];
  public navMeshObstacles: Array<{ x: number; z: number; width: number; depth: number }> = [];
  private gridHelper?: THREE.GridHelper;
  private config: MapConfig;

  constructor(scene: THREE.Scene, config: MapConfig) {
    this.scene = scene;
    this.config = config;
    this.build();
  }

  public get size(): number {
    return this.config.size;
  }

  private build(): void {
    const size = this.config.size;


    this.createFloor(size);
    this.createGrid(size);
    this.createWalls(this.config.walls);
    this.createCenterPlatform();
    this.createPlatforms(this.config.platforms);
    this.createRamps(this.config.ramps);
    this.createCover(this.config.covers);
    this.createPillars(this.config.pillars);
  }

  private createFloor(size: number): void {
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(size, size),
      new THREE.MeshStandardMaterial({
        color: 0x1a1a2a,
        metalness: 0.3,
        roughness: 0.7
      })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);
  }

  private createGrid(size: number): void {
    const gridMat = new THREE.ShaderMaterial({
      uniforms: {
        color1: { value: new THREE.Color(0x00ffff) },
        color2: { value: new THREE.Color(0xff00ff) },
        time: { value: 0 },
      },
      vertexShader: `
        varying vec3 vPosition;
        void main() {
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color1;
        uniform vec3 color2;
        uniform float time;
        varying vec3 vPosition;
        
        void main() {
          float pulse = sin(time * 2.0 + length(vPosition.xy) * 0.5) * 0.5 + 0.5;
          vec3 color = mix(color1, color2, pulse);
          gl_FragColor = vec4(color, 0.3);
        }
      `,
      transparent: true,
    });

    this.gridHelper = new THREE.GridHelper(size, 30, 0x00ffff, 0x00ffff);
    this.gridHelper.position.y = 0.02;
    (this.gridHelper.material as any) = gridMat;
    this.scene.add(this.gridHelper);
  }

  private createWalls(walls: MapObjectConfig[]): void {
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x2a2a3a,
      metalness: 0.5,
      roughness: 0.5,
    });

    walls.forEach((w) => {
      const wall = new THREE.Mesh(
        new THREE.BoxGeometry(w.size[0], w.size[1], w.size[2]),
        wallMat
      );
      wall.position.set(w.pos[0], w.pos[1], w.pos[2]);
      if (typeof w.rot === 'number') {
        wall.rotation.y = w.rot;
      } else if (w.rot) {
        wall.rotation.set(w.rot[0], w.rot[1], w.rot[2]);
      }

      wall.receiveShadow = true;
      wall.castShadow = true;
      this.scene.add(wall);
      this.arenaObjects.push({ mesh: wall, box: new THREE.Box3().setFromObject(wall), material: SurfaceMaterial.BRICK });

      if (w.accent) {
        const edge = new THREE.Mesh(
          new THREE.BoxGeometry(w.size[0], 0.2, 0.1),
          new THREE.MeshBasicMaterial({ color: w.accent })
        );
        // Adjust edge position based on wall height and rotation
        // Simple approximation for now, assumes vertical walls
        edge.position.set(w.pos[0], w.pos[1] + w.size[1] / 2 + 0.1, w.pos[2]);
        if (typeof w.rot === 'number') {
          edge.rotation.y = w.rot;
        } else if (w.rot) {
          edge.rotation.set(w.rot[0], w.rot[1], w.rot[2]);
        }
        this.scene.add(edge);
      }
    });
  }

  private createCenterPlatform(): void {
    const centerPlatform = new THREE.Mesh(
      new THREE.CylinderGeometry(6, 6, 0.5, 32),
      new THREE.MeshStandardMaterial({
        color: 0x1a2a3a,
        metalness: 0.8,
        roughness: 0.2,
      })
    );
    centerPlatform.position.set(0, 0.25, 0);
    centerPlatform.receiveShadow = true;
    centerPlatform.castShadow = true;
    this.scene.add(centerPlatform);
    this.arenaObjects.push({
      mesh: centerPlatform,
      box: new THREE.Box3().setFromObject(centerPlatform),
      material: SurfaceMaterial.METAL,
    });

    const centerBorder = new THREE.Mesh(
      new THREE.BoxGeometry(10.2, 0.1, 10.2),
      new THREE.MeshBasicMaterial({ color: 0xff3366 })
    );
    centerBorder.position.set(0, 0.52, 0);
    this.scene.add(centerBorder);
  }

  private createPlatforms(platforms: MapObjectConfig[]): void {
    const platformMat = new THREE.MeshStandardMaterial({
      color: 0x2a3a4a,
      metalness: 0.7,
      roughness: 0.3,
    });

    platforms.forEach((p) => {
      const platform = new THREE.Mesh(
        new THREE.BoxGeometry(p.size[0], p.size[1], p.size[2]),
        platformMat
      );
      platform.position.set(p.pos[0], p.pos[1], p.pos[2]);
      platform.receiveShadow = true;
      platform.castShadow = true;
      this.scene.add(platform);
      this.arenaObjects.push({ mesh: platform, box: new THREE.Box3().setFromObject(platform), material: SurfaceMaterial.METAL });

      if (p.accent) {
        const edge = new THREE.Mesh(
          new THREE.BoxGeometry(p.size[0] + 0.2, 0.15, p.size[2] + 0.2),
          new THREE.MeshBasicMaterial({ color: p.accent })
        );
        edge.position.set(p.pos[0], p.pos[1] + p.size[1] / 2 + 0.08, p.pos[2]);
        this.scene.add(edge);
      }
    });
  }

  private createRamps(ramps: MapObjectConfig[]): void {
    const rampMat = new THREE.MeshStandardMaterial({
      color: 0x3a4a3a,
      metalness: 0.5,
      roughness: 0.5,
    });

    ramps.forEach((r) => {
      const ramp = new THREE.Mesh(new THREE.BoxGeometry(r.size[0], r.size[1], r.size[2]), rampMat);
      ramp.position.set(r.pos[0], r.pos[1], r.pos[2]);
      if (typeof r.rot === 'number') {
        ramp.rotation.x = r.rot; // Ramps usually rotate on X
      } else if (r.rot) {
        ramp.rotation.set(r.rot[0], r.rot[1], r.rot[2]);
      }
      ramp.receiveShadow = true;
      ramp.castShadow = true;
      this.scene.add(ramp);
      this.arenaObjects.push({ mesh: ramp, box: new THREE.Box3().setFromObject(ramp), material: SurfaceMaterial.METAL });
    });
  }

  private createCover(covers: MapObjectConfig[]): void {
    const coverMat = new THREE.MeshStandardMaterial({
      color: 0x4a3a2a,
      metalness: 0.4,
      roughness: 0.6,
    });

    covers.forEach((c) => {
      const cover = new THREE.Mesh(new THREE.BoxGeometry(c.size[0], c.size[1], c.size[2]), coverMat);
      cover.position.set(c.pos[0], c.pos[1], c.pos[2]);
      cover.receiveShadow = true;
      cover.castShadow = true;
      this.scene.add(cover);
      this.arenaObjects.push({ mesh: cover, box: new THREE.Box3().setFromObject(cover), material: SurfaceMaterial.WOOD });
      this.navMeshObstacles.push({
        x: c.pos[0],
        z: c.pos[2],
        width: c.size[0] / 2 + 0.5,
        depth: c.size[2] / 2 + 0.5,
      });
    });
  }

  private createPillars(pillars: number[][]): void {
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0x3a3a4a,
      metalness: 0.8,
      roughness: 0.2,
    });

    pillars.forEach((pos, i) => {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 6, 8), pillarMat);
      // Assuming y=3 is standard for pillars based on previous code
      pillar.position.set(pos[0], 3, pos[2]);
      pillar.receiveShadow = true;
      pillar.castShadow = true;
      this.scene.add(pillar);
      this.arenaObjects.push({ mesh: pillar, box: new THREE.Box3().setFromObject(pillar), material: SurfaceMaterial.METAL });

      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.2, 0.1, 8, 16),
        new THREE.MeshBasicMaterial({
          color: [0x00ffff, 0xff00ff, 0xffff00, 0x00ff88][i % 4]
        })
      );
      ring.position.set(pos[0], 5.5, pos[2]);
      ring.rotation.x = Math.PI / 2;
      this.scene.add(ring);
    });
  }

  public update(time: number): void {
    if (this.gridHelper?.material instanceof THREE.ShaderMaterial) {
      this.gridHelper.material.uniforms.time.value = time;
    }
  }
}

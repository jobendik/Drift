import * as THREE from 'three';
import { Player } from '../entities/Player';
import { Arena } from '../world/Arena';

export interface Pickup {
  mesh: THREE.Object3D;
  effect: (player: Player, weaponAddAmmo?: (amount: number) => void) => void;
  type: string;
}

export class PickupSystem {
  private pickups: Pickup[] = [];
  private scene: THREE.Scene;
  private arena: Arena;
  private healthSound: THREE.Audio;
  private armorSound: THREE.Audio;
  private audioBuffers: Map<string, AudioBuffer> = new Map();

  constructor(scene: THREE.Scene, listener: THREE.AudioListener, arena: Arena) {
    this.scene = scene;
    this.arena = arena;
    this.healthSound = new THREE.Audio(listener);
    this.armorSound = new THREE.Audio(listener);
    this.loadAudio();
  }

  private loadAudio(): void {
    const audioLoader = new THREE.AudioLoader();

    audioLoader.load('assets/audio/level/Health-Regen.mp3_8283c502.mp3', (buffer) => {
      this.audioBuffers.set('health', buffer);
    });

    audioLoader.load('assets/audio/level/Potion-Pickup.mp3_0d141815.mp3', (buffer) => {
      this.audioBuffers.set('armor', buffer);
    });
  }

  public create(type: string, position: THREE.Vector3): void {
    const configs: Record<
      string,
      { color: number; effect: (player: Player, weaponAddAmmo?: (amount: number) => void) => void }
    > = {
      health: {
        color: 0x22c55e,
        effect: (player) => player.heal(30),
      },
      armor: {
        color: 0x3b82f6,
        effect: (player) => player.addArmor(50),
      },
      ammo: {
        color: 0xf59e0b,
        effect: (_player, weaponAddAmmo) => weaponAddAmmo && weaponAddAmmo(60),
      },
      damage: {
        color: 0xef4444,
        effect: (player) => player.setPowerup('damage', 10),
      },
      speed: {
        color: 0x06b6d4,
        effect: (player) => player.setPowerup('speed', 10),
      },
      rapid: {
        color: 0xa855f7,
        effect: (player) => player.setPowerup('rapid', 10),
      },
    };

    const config = configs[type];

    // PERFORMANCE: Simple box geometry for instant, hiccup-free rendering
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.6, 0.6),
      new THREE.MeshStandardMaterial({
        color: config.color,
        emissive: config.color,
        emissiveIntensity: 0.8,
        metalness: 0.3,
        roughness: 0.4
      })
    );

    mesh.position.copy(position);
    this.scene.add(mesh);

    this.pickups.push({ mesh, effect: config.effect, type });
  }

  private playPickupSound(type: string): void {
    if (type === 'health') {
      const buffer = this.audioBuffers.get('health');
      if (buffer) {
        if (this.healthSound.isPlaying) this.healthSound.stop();
        this.healthSound.setBuffer(buffer);
        this.healthSound.setVolume(0.5);
        this.healthSound.play();
      }
    } else if (type === 'armor') {
      const buffer = this.audioBuffers.get('armor');
      if (buffer) {
        if (this.armorSound.isPlaying) this.armorSound.stop();
        this.armorSound.setBuffer(buffer);
        this.armorSound.setVolume(0.5);
        this.armorSound.play();
      }
    }
  }

  public update(playerPos: THREE.Vector3, player: Player, weaponAddAmmo?: (amount: number) => void): string | null {
    let pickedUp: string | null = null;

    this.pickups.forEach((pickup, index) => {
      pickup.mesh.rotation.y += 0.02;
      const time = performance.now() * 0.003;
      pickup.mesh.position.y = 0.5 + Math.sin(time + index) * 0.1;

      const dist = playerPos.distanceTo(pickup.mesh.position);
      if (dist < 1.5) {
        pickup.effect(player, weaponAddAmmo);
        this.playPickupSound(pickup.type);
        this.scene.remove(pickup.mesh);
        this.pickups.splice(index, 1);
        pickedUp = 'pickup';
      }
    });

    return pickedUp;
  }

  public spawnWavePickups(playerHealth: number, maxHealth: number, wave: number): void {
    const getValidPosition = (range: number): THREE.Vector3 => {
      for (let i = 0; i < 20; i++) {
        const pos = new THREE.Vector3((Math.random() - 0.5) * range, 0.5, (Math.random() - 0.5) * range);
        const pickupBox = new THREE.Box3().setFromCenterAndSize(pos, new THREE.Vector3(0.8, 0.8, 0.8)); // Slightly larger check

        let collision = false;
        for (const obj of this.arena.arenaObjects) {
          if (pickupBox.intersectsBox(obj.box)) {
            collision = true;
            break;
          }
        }

        if (!collision) return pos;
      }
      // Fallback to a safe default if we can't find a spot (e.g., center-ish but offset)
      return new THREE.Vector3(5, 0.5, 5);
    };

    this.create('health', getValidPosition(40));
    this.create('ammo', getValidPosition(40));
    this.create('armor', getValidPosition(40));

    if (playerHealth < maxHealth * 0.5) {
      this.create('health', getValidPosition(20));
    }

    const powerupTypes = ['damage', 'speed', 'rapid'];
    this.create(powerupTypes[wave % 3], getValidPosition(20));
  }

  public spawnRandomLoot(mapConfig: any): void {
    const size = mapConfig.size;
    const lootCount = 50; // Total items to spawn

    const getValidPosition = (): THREE.Vector3 => {
      for (let i = 0; i < 20; i++) {
        const x = (Math.random() - 0.5) * (size - 20); // Stay within bounds
        const z = (Math.random() - 0.5) * (size - 20);

        // Raycast down to find ground height? Or just assume y=0.5 for now?
        // For now, assume ground level + simple collision check
        // Ideally we'd use physics or raycasting against the arena mesh
        const pos = new THREE.Vector3(x, 0.5, z);

        // Simple check against walls/platforms (bounding boxes)
        const pickupBox = new THREE.Box3().setFromCenterAndSize(pos, new THREE.Vector3(0.8, 0.8, 0.8));
        let collision = false;
        for (const obj of this.arena.arenaObjects) {
          if (pickupBox.intersectsBox(obj.box)) {
            // If it's a platform, maybe spawn ON TOP?
            // For MVP simplicity, just avoid collision
            collision = true;
            break;
          }
        }
        if (!collision) return pos;
      }
      return new THREE.Vector3(0, 0.5, 0);
    };

    for (let i = 0; i < lootCount; i++) {
      const rand = Math.random();
      let type = 'ammo';
      if (rand < 0.2) type = 'health';
      else if (rand < 0.35) type = 'armor';
      else if (rand < 0.45) type = 'damage';
      else if (rand < 0.55) type = 'speed';
      else if (rand < 0.65) type = 'rapid';

      this.create(type, getValidPosition());
    }
  }

  public clear(): void {
    this.pickups.forEach((p) => this.scene.remove(p.mesh));
    this.pickups.length = 0;
  }

  public setArena(arena: Arena): void {
    this.arena = arena;
  }
}

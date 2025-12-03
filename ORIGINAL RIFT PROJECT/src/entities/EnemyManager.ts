import * as THREE from 'three';
import { ENEMY_TYPES } from '../config/gameConfig';
import { DamageInfo } from '../core/DamageTypes';
import { EnemyFactory } from './EnemyFactory';

export interface Enemy {
  mesh: THREE.Group;
  type: string;
  health: number;
  maxHealth: number;
  speed: number;
  damage: number;
  fireRate: number;
  accuracy: number;
  score: number;
  lastShotTime: number;
  strafeDir: number;
  strafeTime: number;
  weaponType: string;
  shootSound: THREE.Audio;
  hurtSounds: THREE.Audio[];
  deathSound: THREE.Audio;
  jumpSound: THREE.Audio;
  // Changed to Object3D to support Groups (like the new capsule body)
  body: THREE.Object3D;
  head: THREE.Object3D;
  ring?: THREE.Mesh;
  muzzleFlash?: THREE.Mesh;
}

export class EnemyManager {
  private enemies: Enemy[] = [];
  private scene: THREE.Scene;
  private spawnPoints: THREE.Vector3[];
  private listener: THREE.AudioListener;
  private audioLoader: THREE.AudioLoader;
  private audioBuffers: Record<string, AudioBuffer> = {};

  constructor(scene: THREE.Scene, listener: THREE.AudioListener) {
    this.scene = scene;
    this.listener = listener;
    this.audioLoader = new THREE.AudioLoader();
    this.spawnPoints = [
      new THREE.Vector3(25, 0, 25),
      new THREE.Vector3(-25, 0, 25),
      new THREE.Vector3(25, 0, -25),
      new THREE.Vector3(-25, 0, -25),
      new THREE.Vector3(25, 0, 0),
      new THREE.Vector3(-25, 0, 0),
      new THREE.Vector3(0, 0, 25),
      new THREE.Vector3(0, 0, -25),
    ];
    this.loadAudio();
  }

  private loadAudio(): void {
    const audioFiles = {
      pistolShoot: 'assets/audio/weapons/Pistol-Fire.mp3_b6b25ed9.mp3',
      akShoot: 'assets/audio/weapons/AK47-Fire.mp3_aad0f6c9.mp3',
      awpShoot: 'assets/audio/weapons/AWP-Fire.mp3_1b838826.mp3',
      hurtFemale1: 'assets/audio/enemy/Female-Grunt-1.mp3_5f82c672.mp3',
      hurtFemale2: 'assets/audio/enemy/Female-Grunt-2.mp3_b787f958.mp3',
      hurtFemale3: 'assets/audio/enemy/Female-Grunt-3.mp3_4d6460fd.mp3',
      deathFemale: 'assets/audio/enemy/Female-Death-1.mp3_37cc105e.mp3',
      jumpFemale: 'assets/audio/enemy/Female-Jump-2.mp3_3f5bd70e.mp3',
      // Kulu (Heavy) Sounds
      hurtKulu1: 'assets/audio/enemy/Kulu-Grunt-1.mp3_ea942b67.mp3',
      hurtKulu2: 'assets/audio/enemy/Kulu-Grunt-2.mp3_8e323b62.mp3',
      hurtKulu3: 'assets/audio/enemy/Kulu-Grunt-3.mp3_5bae51a4.mp3',
      deathKulu: 'assets/audio/enemy/Kulu-Death-1.mp3_d65e968a.mp3',
      jumpKulu1: 'assets/audio/enemy/Kulu-Jump-1.mp3_3aef7e5f.mp3',
      jumpKulu2: 'assets/audio/enemy/Kulu-Jump-2.mp3_8cba70b6.mp3',
    };

    Object.entries(audioFiles).forEach(([key, path]) => {
      this.audioLoader.load(
        path,
        (buffer) => {
          this.audioBuffers[key] = buffer;
        },
        undefined,
        (error) => {
          console.error(`Failed to load ${key}:`, error);
        }
      );
    });
  }

  public createEnemy(type: string, position: THREE.Vector3): void {
    const typeData = ENEMY_TYPES[type];
    if (!typeData) {
      console.error(`Unknown enemy type: ${type}`);
      return;
    }

    // Use Factory to create mesh
    const group = EnemyFactory.createEnemyMesh(type, typeData.color);
    group.position.copy(position);
    this.scene.add(group);

    // Find body parts
    let body: THREE.Object3D | undefined;
    let head: THREE.Object3D | undefined;

    group.traverse((child) => {
      if (child.name === 'body') body = child;
      if (child.name === 'head') head = child;
    });

    // Fallbacks
    if (!body) {
      // If no body named, use the first mesh found or create a dummy
      const firstMesh = group.children.find(c => c instanceof THREE.Mesh);
      body = firstMesh || new THREE.Mesh();
    }
    if (!head) {
      head = body; // Fallback to body if no head
    }

    // Assign weapon based on enemy type
    let weaponType = 'pistolShoot';
    if (type === 'shooter' || type === 'soldier') {
      weaponType = 'akShoot';
    } else if (type === 'heavy' || type === 'viper') {
      weaponType = 'awpShoot';
    }

    // Create audio objects
    const shootSound = new THREE.Audio(this.listener);
    group.add(shootSound);

    const hurtSounds: THREE.Audio[] = [];
    for (let i = 0; i < 3; i++) {
      const hurtSound = new THREE.Audio(this.listener);
      group.add(hurtSound);
      hurtSounds.push(hurtSound);
    }

    const deathSound = new THREE.Audio(this.listener);
    group.add(deathSound);

    const jumpSound = new THREE.Audio(this.listener);
    group.add(jumpSound);

    // Assign buffers based on enemy type
    if (type === 'heavy' || type === 'bulwark') {
      // Use Kulu sounds for heavy types
      if (this.audioBuffers['deathKulu']) deathSound.setBuffer(this.audioBuffers['deathKulu']);
      if (this.audioBuffers['jumpKulu1']) jumpSound.setBuffer(this.audioBuffers['jumpKulu1']);

      const kuluHurts = ['hurtKulu1', 'hurtKulu2', 'hurtKulu3'];
      hurtSounds.forEach((sound, index) => {
        const key = kuluHurts[index % kuluHurts.length];
        if (this.audioBuffers[key]) sound.setBuffer(this.audioBuffers[key]);
      });
    } else {
      // Default to Female sounds for others
      if (this.audioBuffers['deathFemale']) deathSound.setBuffer(this.audioBuffers['deathFemale']);
      if (this.audioBuffers['jumpFemale']) jumpSound.setBuffer(this.audioBuffers['jumpFemale']);

      const femaleHurts = ['hurtFemale1', 'hurtFemale2', 'hurtFemale3'];
      hurtSounds.forEach((sound, index) => {
        const key = femaleHurts[index % femaleHurts.length];
        if (this.audioBuffers[key]) sound.setBuffer(this.audioBuffers[key]);
      });
    }

    // Set weapon sound
    if (this.audioBuffers[weaponType]) {
      shootSound.setBuffer(this.audioBuffers[weaponType]);
    }

    this.enemies.push({
      mesh: group,
      type,
      health: typeData.health,
      maxHealth: typeData.health,
      speed: typeData.speed,
      damage: typeData.damage,
      fireRate: typeData.fireRate,
      accuracy: typeData.accuracy,
      score: typeData.score,
      lastShotTime: 0,
      strafeDir: Math.random() > 0.5 ? 1 : -1,
      strafeTime: 0,
      weaponType,
      shootSound,
      hurtSounds,
      deathSound,
      jumpSound,
      body,
      head
    });
  }

  private hasLineOfSight(
    enemyPos: THREE.Vector3,
    playerPos: THREE.Vector3,
    obstacles: Array<{ mesh: THREE.Mesh; box: THREE.Box3 }>
  ): boolean {
    const eyeHeight = 1.5;
    const from = enemyPos.clone();
    from.y = eyeHeight;
    const to = playerPos.clone();
    to.y = 0.8;

    const direction = to.clone().sub(from).normalize();
    const distance = from.distanceTo(to);

    const raycaster = new THREE.Raycaster(from, direction, 0, distance - 0.5);

    const meshes = obstacles.map(obj => obj.mesh);
    const intersects = raycaster.intersectObjects(meshes, true);

    return intersects.length === 0;
  }

  public update(
    delta: number,
    playerPos: THREE.Vector3,
    obstacles: Array<{ x: number; z: number; width: number; depth: number }>,
    arenaObjects: Array<{ mesh: THREE.Mesh; box: THREE.Box3 }>,
    onEnemyShoot: (enemy: Enemy) => void,
    onEnemyHitPlayer?: (enemy: Enemy) => void // New callback for melee
  ): void {
    const playerPos2D = playerPos.clone();
    playerPos2D.y = 1;
    const now = performance.now();

    this.enemies.forEach((enemy) => {
      const enemyPos = enemy.mesh.position.clone();
      enemyPos.y = 1;

      const dist = enemyPos.distanceTo(playerPos2D);
      const dir = playerPos2D.clone().sub(enemyPos).normalize();

      // Look at player
      enemy.mesh.lookAt(playerPos2D);

      // --- MOVEMENT LOGIC ---
      let moveDir = dir.clone();

      // Obstacle avoidance
      obstacles.forEach((obs) => {
        const toObstacle = new THREE.Vector2(obs.x - enemyPos.x, obs.z - enemyPos.z);
        const obsDist = toObstacle.length();
        if (obsDist < obs.width + 2) {
          const avoidDir = toObstacle.normalize().multiplyScalar(-1);
          moveDir.x += avoidDir.x * 0.5;
          moveDir.z += avoidDir.y * 0.5;
        }
      });

      // Behavior based on type
      if (enemy.type === 'swarmer' || enemy.type === 'razor' || enemy.type === 'spectre') {
        // Melee / Rush behavior: Run straight at player
        // No strafing, just pure aggression
      } else {
        // Ranged behavior: Strafe and maintain distance
        enemy.strafeTime += delta;
        if (enemy.strafeTime > 2) {
          enemy.strafeDir *= -1;
          enemy.strafeTime = 0;
        }

        if (dist < 15 && dist > 5) {
          const strafeVec = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(enemy.strafeDir);
          moveDir.add(strafeVec.multiplyScalar(0.3));
        }
      }

      moveDir.normalize();

      // Calculate intended movement
      let newX = enemy.mesh.position.x;
      let newZ = enemy.mesh.position.z;

      // Speed modification
      let currentSpeed = enemy.speed;

      // Movement rules
      if (enemy.type === 'swarmer' || enemy.type === 'razor' || enemy.type === 'spectre') {
        // Always move towards player
        newX += moveDir.x * currentSpeed * delta;
        newZ += moveDir.z * currentSpeed * delta;

        // Melee Attack Check
        if (dist < 1.5 && onEnemyHitPlayer) {
          // Cooldown for melee? For now, just hit every frame (player has invuln frames usually)
          // Or better, check a timer.
          if (now - enemy.lastShotTime > 1000) { // 1 sec cooldown on melee hit
            onEnemyHitPlayer(enemy);
            enemy.lastShotTime = now;
          }
        }

      } else {
        // Ranged logic
        if (dist > 8) {
          newX += moveDir.x * currentSpeed * delta;
          newZ += moveDir.z * currentSpeed * delta;
        } else if (dist < 6) {
          newX -= dir.x * currentSpeed * 0.3 * delta;
          newZ -= dir.z * currentSpeed * 0.3 * delta;
        }
      }

      // Collision check
      const enemyRadius = 0.5;
      let canMove = true;

      for (const obj of arenaObjects) {
        const expandedBox = obj.box.clone();
        expandedBox.min.x -= enemyRadius;
        expandedBox.min.z -= enemyRadius;
        expandedBox.max.x += enemyRadius;
        expandedBox.max.z += enemyRadius;

        if (newX >= expandedBox.min.x && newX <= expandedBox.max.x &&
          newZ >= expandedBox.min.z && newZ <= expandedBox.max.z &&
          enemy.mesh.position.y >= expandedBox.min.y && enemy.mesh.position.y <= expandedBox.max.y) {
          canMove = false;
          break;
        }
      }

      if (canMove) {
        enemy.mesh.position.x = newX;
        enemy.mesh.position.z = newZ;
      }

      // --- SHOOTING LOGIC ---
      if (enemy.fireRate > 0) { // Only if it has a fire rate
        if (dist < 30 && now - enemy.lastShotTime > 1000 / enemy.fireRate) {
          if (this.hasLineOfSight(enemy.mesh.position, playerPos, arenaObjects)) {
            enemy.lastShotTime = now;
            onEnemyShoot(enemy);
          }
        }
      }

      // --- VISUAL UPDATES ---

      // Razor spin
      if (enemy.type === 'razor') {
        const blade = enemy.mesh.userData.blade;
        const spikes = enemy.mesh.userData.spikes;
        if (blade) {
          blade.rotation.z += delta * 10;
          blade.rotation.y += delta * 2;
        }
        if (spikes) {
          spikes.rotation.z -= delta * 8;
        }
        enemy.mesh.rotation.x = 0.5; // Tilt forward
      }

      // Spectre pulse
      if (enemy.type === 'spectre') {
        enemy.mesh.position.y = 1.0 + Math.sin(now * 0.003) * 0.15;
        // We need to access the material to pulse opacity
        // Assuming the outer shell is the first child or we can find it
        enemy.mesh.children.forEach(child => {
          if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial && child.material.transparent) {
            const phase = 0.2 + (Math.sin(now * 0.003 * 3) + 1) * 0.15;
            child.material.opacity = phase;
          }
        });
      }

      // Color update based on health
      const healthRatio = enemy.health / enemy.maxHealth;
      const baseColor = new THREE.Color(ENEMY_TYPES[enemy.type].color);
      const currentColor = baseColor.clone().lerp(new THREE.Color(0x333333), 1 - healthRatio);

      enemy.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
          // Don't colorize transparent/special materials too much if we want to keep their effect
          // But for now, let's just darken them
          child.material.color.copy(currentColor);
          child.material.emissive.copy(currentColor);
          child.material.emissiveIntensity = 0.5 * healthRatio;
        }
      });

    });
  }

  public damageEnemy(enemy: Enemy, info: DamageInfo | number, isHeadshot: boolean = false): boolean {
    let damage = 0;
    let headshot = isHeadshot;

    if (typeof info === 'number') {
      damage = info;
    } else {
      damage = info.amount;
      if (info.hitLocation === 'head') {
        headshot = true;
      }
    }

    // Bulwark Shield Logic: Reduced damage from front?
    // For now, let's just give Bulwark flat damage reduction
    if (enemy.type === 'bulwark') {
      damage *= 0.5;
    }

    enemy.health -= headshot ? damage * 2 : damage;

    if (typeof info !== 'number' && info.knockbackForce && info.sourcePosition) {
      const knockbackDir = enemy.mesh.position.clone().sub(info.sourcePosition).normalize();
      knockbackDir.y = 0.5;
      enemy.mesh.position.add(knockbackDir.multiplyScalar(info.knockbackForce * 0.1));
    }

    if (enemy.health <= 0) {
      this.playDeathSound(enemy);
    } else {
      this.playHurtSound(enemy);
    }

    return enemy.health <= 0;
  }

  private playHurtSound(enemy: Enemy): void {
    const randomIndex = Math.floor(Math.random() * 3);
    const hurtKey = `hurtFemale${randomIndex + 1}`;
    if (this.audioBuffers[hurtKey]) {
      const sound = enemy.hurtSounds[randomIndex];
      if (sound.isPlaying) sound.stop();
      sound.setBuffer(this.audioBuffers[hurtKey]);
      sound.setVolume(0.5);
      sound.play();
    }
  }

  private playDeathSound(enemy: Enemy): void {
    if (this.audioBuffers['deathFemale']) {
      if (enemy.deathSound.isPlaying) enemy.deathSound.stop();
      enemy.deathSound.setBuffer(this.audioBuffers['deathFemale']);
      enemy.deathSound.setVolume(0.6);
      enemy.deathSound.play();
    }
  }

  public playShootSound(enemy: Enemy): void {
    if (this.audioBuffers[enemy.weaponType]) {
      if (enemy.shootSound.isPlaying) enemy.shootSound.stop();
      enemy.shootSound.setBuffer(this.audioBuffers[enemy.weaponType]);
      enemy.shootSound.setVolume(0.4);
      enemy.shootSound.play();
    }
  }

  public removeEnemy(enemy: Enemy): void {
    this.scene.remove(enemy.mesh);
    const index = this.enemies.indexOf(enemy);
    if (index > -1) {
      this.enemies.splice(index, 1);
    }
  }

  public getEnemies(): Enemy[] {
    return this.enemies;
  }

  public getEnemyCount(): number {
    return this.enemies.length;
  }

  public clear(): void {
    this.enemies.forEach((e) => this.scene.remove(e.mesh));
    this.enemies.length = 0;
  }

  public spawnWave(wave: number): void {
    const shuffledSpawns = [...this.spawnPoints].sort(() => Math.random() - 0.5);
    let idx = 0;

    // Wave Progression
    // 1: Grunts
    // 2: Grunts + Shooters
    // 3: Shooters + Swarmers
    // 4: Heavy + Shooters
    // 5: Heavy + Viper + Swarmers
    // 6: Bulwark + Spectre
    // 7+: Chaos

    const spawn = (type: string, count: number) => {
      for (let i = 0; i < count; i++) {
        this.createEnemy(type, shuffledSpawns[idx++ % 8].clone());
      }
    };

    if (wave === 1) {
      spawn('grunt', 4);
    } else if (wave === 2) {
      spawn('grunt', 3);
      spawn('shooter', 2);
    } else if (wave === 3) {
      spawn('shooter', 3);
      spawn('swarmer', 4);
    } else if (wave === 4) {
      spawn('heavy', 1);
      spawn('shooter', 4);
      spawn('grunt', 2);
    } else if (wave === 5) {
      spawn('heavy', 2);
      spawn('viper', 2);
      spawn('swarmer', 5);
    } else if (wave === 6) {
      spawn('bulwark', 2);
      spawn('spectre', 3);
      spawn('razor', 3);
    } else {
      // Procedural scaling
      spawn('heavy', Math.floor(wave / 2));
      spawn('bulwark', Math.floor(wave / 3));
      spawn('spectre', Math.floor(wave / 3));
      spawn('razor', Math.floor(wave / 2));
      spawn('shooter', wave);
      spawn('swarmer', wave);
    }
  }
}

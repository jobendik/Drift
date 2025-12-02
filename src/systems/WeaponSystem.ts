import * as THREE from 'three';
import { WEAPON_CONFIG } from '../config/weaponConfigs';
import { SingleWeaponConfig, WeaponType } from '../types/weapons';
import { AssetManager } from '../core/AssetManager';
import { AudioManager } from '../managers/AudioManager';

interface WeaponState {
  currentMag: number;
  reserveAmmo: number;
  lastShotTime: number;
  isReloading: boolean;
  reloadStartTime: number;
}

export class WeaponSystem {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private audioManager: AudioManager;
  private muzzleFlashes: THREE.Group;
  private weaponMesh!: THREE.Object3D;

  // State
  public currentWeapon: WeaponType = WeaponType.AK47;
  private weaponStates: Map<WeaponType, WeaponState> = new Map();

  // Recoil & Spread
  private currentRecoil: { x: number; y: number } = { x: 0, y: 0 };
  private targetRecoil: { x: number; y: number } = { x: 0, y: 0 };
  private currentSpread: number = 0;

  // Weapon model (placeholder position for now)
  // private weaponOffset: THREE.Vector3 = new THREE.Vector3(0.2, -0.2, -0.5);

  // Callbacks
  private shellEjectCallback?: (pos: THREE.Vector3, dir: THREE.Vector3) => void;

  constructor(scene: THREE.Scene, camera: THREE.Camera, _assetManager: AssetManager, audioManager: AudioManager) {
    this.scene = scene;
    this.camera = camera;
    this.audioManager = audioManager;
    this.muzzleFlashes = new THREE.Group();
    this.scene.add(this.muzzleFlashes);

    this.initializeWeaponStates();
    this.loadAllAudio();

    // Initialize weapon model
    this.resetWeaponState();
  }

  public setShellEjectCallback(callback: (pos: THREE.Vector3, dir: THREE.Vector3) => void): void {
    this.shellEjectCallback = callback;
  }

  private initializeWeaponStates(): void {
    (Object.values(WEAPON_CONFIG) as SingleWeaponConfig[]).forEach((config) => {
      // Find the key for this config
      const type = Object.keys(WEAPON_CONFIG).find(key => WEAPON_CONFIG[key as WeaponType] === config) as WeaponType;

      if (type) {
        this.weaponStates.set(type, {
          currentMag: config.magSize,
          reserveAmmo: config.reserveAmmo,
          lastShotTime: 0,
          isReloading: false,
          reloadStartTime: 0
        });
      }
    });
  }

  private loadAllAudio(): void {
    const loadedPaths = new Set<string>();

    // Preload all weapon sounds
    (Object.values(WEAPON_CONFIG) as SingleWeaponConfig[]).forEach((config) => {
      Object.values(config.audio).forEach((path) => {
        if (path && typeof path === 'string' && !loadedPaths.has(path)) {
          this.audioManager.loadAudio(path);
          loadedPaths.add(path);
        }
      });
    });
  }

  public get currentConfig(): SingleWeaponConfig {
    return WEAPON_CONFIG[this.currentWeapon];
  }

  public getEquippedWeapons(): WeaponType[] {
    // For now, return all available weapons in a fixed order
    return Object.values(WeaponType);
  }

  public switchWeapon(weapon: WeaponType | number): void {
    if (typeof weapon === 'number') {
      const weapons = this.getEquippedWeapons();
      if (weapon >= 0 && weapon < weapons.length) {
        this.currentWeapon = weapons[weapon];
      }
    } else {
      this.currentWeapon = weapon;
    }

    // Reset reloading state on switch
    const state = this.weaponStates.get(this.currentWeapon);
    if (state) {
      state.isReloading = false;
    }

    this.resetWeaponState();

    // Play deploy sound if available (optional)
  }

  public scrollWeapon(direction: number): void {
    const weapons = this.getEquippedWeapons();
    let currentIndex = weapons.indexOf(this.currentWeapon);

    if (direction > 0) {
      currentIndex = (currentIndex + 1) % weapons.length;
    } else {
      currentIndex = (currentIndex - 1 + weapons.length) % weapons.length;
    }

    this.switchWeapon(weapons[currentIndex]);
  }

  public get isReloading(): boolean {
    return this.weaponStates.get(this.currentWeapon)?.isReloading || false;
  }

  public get currentMag(): number {
    return this.weaponStates.get(this.currentWeapon)?.currentMag || 0;
  }

  public get reserveAmmo(): number {
    return this.weaponStates.get(this.currentWeapon)?.reserveAmmo || 0;
  }

  public getCurrentSpread(): number {
    return this.currentSpread;
  }

  public getMuzzleWorldPosition(): THREE.Vector3 {
    // In a real implementation, this would be a bone position on the weapon model
    // For now, we approximate based on camera and offset
    const config = WEAPON_CONFIG[this.currentWeapon];
    const offset = config.muzzle.position;

    const muzzlePos = new THREE.Vector3(offset.x, offset.y, offset.z);
    muzzlePos.applyQuaternion(this.camera.quaternion);
    muzzlePos.add(this.camera.position);

    return muzzlePos;
  }

  public shoot(
    camera: THREE.Camera,
    _onGround: boolean,
    isSprinting: boolean,
    _velocity: THREE.Vector3
  ): { shotFired: boolean; direction: THREE.Vector3; directions?: THREE.Vector3[] } {
    const config = WEAPON_CONFIG[this.currentWeapon];
    const state = this.weaponStates.get(this.currentWeapon);

    if (!config || !state) return { shotFired: false, direction: new THREE.Vector3() };

    // Check can fire
    const now = performance.now();
    const msPerShot = 1000 / config.fireRate;

    if (state.isReloading || state.currentMag <= 0 || now - state.lastShotTime < msPerShot) {
      if (state.currentMag <= 0 && !state.isReloading && state.reserveAmmo > 0) {
        this.reload();
      }
      return { shotFired: false, direction: new THREE.Vector3() };
    }

    // Sprint check (cannot fire while sprinting)
    if (isSprinting) {
      return { shotFired: false, direction: new THREE.Vector3() };
    }

    // Update state
    state.lastShotTime = now;
    state.currentMag--;

    // Play sound
    if (config.audio.fire) {
      this.audioManager.playSound(config.audio.fire, 'sfx', { volume: 0.5 });
    }

    // Apply recoil
    this.applyRecoil(config.recoil);

    // Increase spread
    this.currentSpread = Math.min(
      this.currentSpread + config.spread.increasePerShot,
      config.spread.max
    );

    // Create muzzle flash
    this.createMuzzleFlash(this.getMuzzleWorldPosition(), camera.getWorldDirection(new THREE.Vector3()));

    // Eject shell
    if (this.shellEjectCallback) {
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
      this.shellEjectCallback(this.getMuzzleWorldPosition(), right);
    }

    // Calculate shot direction(s)
    const baseDir = camera.getWorldDirection(new THREE.Vector3());

    // Apply recoil to direction
    const euler = new THREE.Euler(this.currentRecoil.y, this.currentRecoil.x, 0, 'YXZ');
    baseDir.applyEuler(euler);

    if (config.pelletCount && config.pelletCount > 1) {
      // Shotgun spread
      const directions: THREE.Vector3[] = [];
      for (let i = 0; i < config.pelletCount; i++) {
        const dir = baseDir.clone();
        this.applySpread(dir, this.currentSpread * 2); // Wider spread for shotgun
        directions.push(dir);
      }
      return { shotFired: true, direction: baseDir, directions };
    } else {
      // Single shot spread
      this.applySpread(baseDir, this.currentSpread);
      return { shotFired: true, direction: baseDir };
    }
  }

  private applySpread(direction: THREE.Vector3, spreadAmount: number): void {
    const u = Math.random() * 2 - 1;
    const v = Math.random() * 2 - 1;

    const right = new THREE.Vector3().crossVectors(direction, new THREE.Vector3(0, 1, 0)).normalize();
    const up = new THREE.Vector3().crossVectors(right, direction).normalize();

    direction.addScaledVector(right, u * spreadAmount);
    direction.addScaledVector(up, v * spreadAmount);
    direction.normalize();
  }

  private applyRecoil(recoilConfig: { pitchAmount: number; yawAmount: number }): void {
    this.targetRecoil.x += (Math.random() - 0.5) * recoilConfig.yawAmount;
    this.targetRecoil.y += recoilConfig.pitchAmount;
  }

  private createMuzzleFlash(position: THREE.Vector3, direction: THREE.Vector3): void {
    const flash = new THREE.PointLight(0xffaa00, 1, 3);
    flash.position.copy(position).add(direction.clone().multiplyScalar(0.5));
    this.muzzleFlashes.add(flash);

    // Remove flash after a short duration
    setTimeout(() => {
      this.muzzleFlashes.remove(flash);
    }, 50);
  }

  public reload(): void {
    const state = this.weaponStates.get(this.currentWeapon);
    const config = WEAPON_CONFIG[this.currentWeapon];

    if (!state || !config || state.isReloading || state.currentMag === config.magSize || state.reserveAmmo <= 0) {
      return;
    }

    state.isReloading = true;
    state.reloadStartTime = performance.now();

    if (config.audio.reload) {
      this.audioManager.playSound(config.audio.reload, 'sfx', { volume: 0.5 });
    }
  }

  public update(deltaTime: number, _mouseMovement: { x: number, y: number }, isSprinting: boolean, _headBobTime: number = 0): void {
    const config = WEAPON_CONFIG[this.currentWeapon];
    const state = this.weaponStates.get(this.currentWeapon);

    if (!config || !state) return;

    // Handle Reloading
    if (state.isReloading) {
      if (performance.now() - state.reloadStartTime >= config.reloadTime * 1000) {
        const needed = config.magSize - state.currentMag;
        const toAdd = Math.min(needed, state.reserveAmmo);

        state.currentMag += toAdd;
        state.reserveAmmo -= toAdd;
        state.isReloading = false;
      }
    }

    // Recoil recovery
    this.currentRecoil.x = THREE.MathUtils.lerp(this.currentRecoil.x, this.targetRecoil.x, deltaTime * 10);
    this.currentRecoil.y = THREE.MathUtils.lerp(this.currentRecoil.y, this.targetRecoil.y, deltaTime * 10);

    this.targetRecoil.x = THREE.MathUtils.lerp(this.targetRecoil.x, 0, deltaTime * config.recoil.recoveryRate);
    this.targetRecoil.y = THREE.MathUtils.lerp(this.targetRecoil.y, 0, deltaTime * config.recoil.recoveryRate);

    // Spread recovery
    const minSpread = isSprinting ? config.spread.base * 2 : config.spread.base;
    this.currentSpread = THREE.MathUtils.lerp(this.currentSpread, minSpread, deltaTime * config.spread.recoveryRate);
  }

  private resetWeaponState(): void {
    console.log('DEBUG: resetWeaponState START');
    // Remove old model
    if (this.weaponMesh && this.weaponMesh.parent) {
      this.weaponMesh.parent.remove(this.weaponMesh);
    }

    // Create new model
    const group = this.createWeaponModel();
    this.weaponMesh = group;

    // Position relative to camera (adjusted for new models)
    this.weaponMesh.position.set(0.25, -0.25, -0.4);

    // Add to camera
    this.camera.add(this.weaponMesh);
    console.log('DEBUG: Weapon added to camera. Weapon UUID:', this.weaponMesh.uuid);
    console.log('DEBUG: Camera UUID:', this.camera.uuid);
  }

  // Weapon model creation
  private createWeaponModel(): THREE.Group {
    switch (this.currentWeapon) {
      case WeaponType.AK47: return this.createAK47Model();
      case WeaponType.AWP: return this.createAWPModel();
      case WeaponType.LMG: return this.createLMGModel();
      case WeaponType.M4: return this.createM4Model();
      case WeaponType.Pistol: return this.createPistolModel();
      case WeaponType.Scar: return this.createScarModel();
      case WeaponType.Shotgun: return this.createShotgunModel();
      case WeaponType.Sniper: return this.createSniperModel();
      case WeaponType.Tec9: return this.createTec9Model();
      default: return this.createAK47Model();
    }
  }

  private createAK47Model(): THREE.Group {
    const group = new THREE.Group();

    // Body
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.12, 0.6),
      new THREE.MeshStandardMaterial({ color: 0x5d4037, metalness: 0.1, roughness: 0.8 }) // Wood
    );
    body.position.set(0, 0, -0.1);
    group.add(body);

    // Metal parts
    const receiver = new THREE.Mesh(
      new THREE.BoxGeometry(0.09, 0.13, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8, roughness: 0.4 })
    );
    receiver.position.set(0, 0.01, -0.1);
    group.add(receiver);

    // Barrel
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, 0.6),
      new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.9, roughness: 0.3 })
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.04, -0.5);
    group.add(barrel);

    // Magazine (Curved look via rotation)
    const mag = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.25, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x333333 })
    );
    mag.position.set(0, -0.15, -0.05);
    mag.rotation.x = 0.3;
    group.add(mag);

    return group;
  }

  private createAWPModel(): THREE.Group {
    const group = new THREE.Group();

    // Green Body
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.15, 0.8),
      new THREE.MeshStandardMaterial({ color: 0x2e7d32, metalness: 0.2, roughness: 0.7 })
    );
    body.position.set(0, 0, -0.2);
    group.add(body);

    // Long Barrel
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 1.0),
      new THREE.MeshStandardMaterial({ color: 0x111111 })
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.05, -0.8);
    group.add(barrel);

    // Scope
    const scope = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.05, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x111111 })
    );
    scope.rotation.x = Math.PI / 2;
    scope.position.set(0, 0.12, -0.1);
    group.add(scope);

    return group;
  }

  private createLMGModel(): THREE.Group {
    const group = new THREE.Group();

    // Bulky Body
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 0.2, 0.7),
      new THREE.MeshStandardMaterial({ color: 0x424242 })
    );
    body.position.set(0, 0, -0.1);
    group.add(body);

    // Box Mag
    const mag = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.2, 0.15),
      new THREE.MeshStandardMaterial({ color: 0x2e7d32 })
    );
    mag.position.set(0, -0.15, 0);
    group.add(mag);

    // Barrel
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.7),
      new THREE.MeshStandardMaterial({ color: 0x111111 })
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0, -0.6);
    group.add(barrel);

    return group;
  }

  private createM4Model(): THREE.Group {
    const group = new THREE.Group();

    // Body
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.12, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x1a1a1a })
    );
    body.position.set(0, 0, -0.1);
    group.add(body);

    // Barrel with handguard
    const handguard = new THREE.Mesh(
      new THREE.BoxGeometry(0.09, 0.09, 0.35),
      new THREE.MeshStandardMaterial({ color: 0x222222 })
    );
    handguard.position.set(0, 0.02, -0.4);
    group.add(handguard);

    // Carry handle / Sight
    const sight = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.06, 0.15),
      new THREE.MeshStandardMaterial({ color: 0x111111 })
    );
    sight.position.set(0, 0.1, -0.1);
    group.add(sight);

    return group;
  }

  private createPistolModel(): THREE.Group {
    const group = new THREE.Group();

    // Slide
    const slide = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.08, 0.25),
      new THREE.MeshStandardMaterial({ color: 0xbdc3c7, metalness: 0.8 })
    );
    slide.position.set(0, 0.05, 0);
    group.add(slide);

    // Grip
    const grip = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.15, 0.07),
      new THREE.MeshStandardMaterial({ color: 0x2c3e50 })
    );
    grip.position.set(0, -0.05, 0.05);
    grip.rotation.x = -0.2;
    group.add(grip);

    return group;
  }

  private createScarModel(): THREE.Group {
    const group = new THREE.Group();

    // Tan Body
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.15, 0.6),
      new THREE.MeshStandardMaterial({ color: 0xd2b48c }) // Tan
    );
    body.position.set(0, 0, -0.1);
    group.add(body);

    // Upper receiver
    const upper = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.08, 0.7),
      new THREE.MeshStandardMaterial({ color: 0xc2a47c })
    );
    upper.position.set(0, 0.08, -0.15);
    group.add(upper);

    // Mag
    const mag = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.2, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x222222 })
    );
    mag.position.set(0, -0.15, -0.05);
    group.add(mag);

    return group;
  }

  private createShotgunModel(): THREE.Group {
    const group = new THREE.Group();

    // Body
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.12, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x333333 })
    );
    body.position.set(0, 0, -0.1);
    group.add(body);

    // Long Barrel
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.8),
      new THREE.MeshStandardMaterial({ color: 0x111111 })
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.02, -0.6);
    group.add(barrel);

    // Pump
    const pump = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.06, 0.2),
      new THREE.MeshStandardMaterial({ color: 0x5d4037 }) // Wood pump
    );
    pump.position.set(0, -0.05, -0.5);
    group.add(pump);

    return group;
  }

  private createSniperModel(): THREE.Group {
    const group = new THREE.Group();

    // Body
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.1, 0.7),
      new THREE.MeshStandardMaterial({ color: 0x222222 })
    );
    body.position.set(0, 0, -0.2);
    group.add(body);

    // Barrel
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, 0.9),
      new THREE.MeshStandardMaterial({ color: 0x111111 })
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.05, -0.8);
    group.add(barrel);

    // Scope
    const scope = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.04, 0.25),
      new THREE.MeshStandardMaterial({ color: 0x111111 })
    );
    scope.rotation.x = Math.PI / 2;
    scope.position.set(0, 0.1, -0.1);
    group.add(scope);

    return group;
  }

  private createTec9Model(): THREE.Group {
    const group = new THREE.Group();

    // Body
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.08, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x222222 })
    );
    body.position.set(0, 0.05, 0);
    group.add(body);

    // Barrel shroud
    const shroud = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.2),
      new THREE.MeshStandardMaterial({ color: 0x111111, wireframe: false })
    );
    shroud.rotation.x = Math.PI / 2;
    shroud.position.set(0, 0.05, -0.25);
    group.add(shroud);

    // Mag (Forward of trigger)
    const mag = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 0.2, 0.05),
      new THREE.MeshStandardMaterial({ color: 0x111111 })
    );
    mag.position.set(0, -0.1, -0.1);
    group.add(mag);

    return group;
  }
}

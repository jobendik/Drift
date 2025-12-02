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
}

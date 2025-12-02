// RIFT Integration - Advanced Weapon System
// Features: Recoil, Spread, Spray Patterns, Muzzle Effects, Shell Ejection, Animations

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { WeaponType, SingleWeaponConfig } from '../types/weapons';
import { WEAPON_CONFIG } from '../config/weaponConfigs';
import { ParticleSystem } from './ParticleSystem';

export class WeaponSystem {
  public currentWeaponType: WeaponType = WeaponType.AK47;
  public lastWeaponType: WeaponType = WeaponType.Pistol;
  private weapons: Record<WeaponType, { mag: number; reserve: number }>;
  private equippedWeapons: WeaponType[] = Object.values(WeaponType);

  public isReloading = false;
  public isZoomed = false;
  public reloadTimer = 0;
  private lastShotTime = 0;
  public shotsFiredInBurst = 0;
  public timeSinceLastShot = 0;

  // Recoil
  public recoilPitch = 0;
  public recoilYaw = 0;
  public recoilRecoveryTimer = 0;
  public weaponKickZ = 0;
  public weaponKickRotX = 0;
  public microShake = { x: 0, y: 0, timer: 0 };

  // Spread
  public currentBloom = 0;

  // Screen effects
  public fovPunch = 0;
  public cameraShake = { x: 0, y: 0, intensity: 0 };
  public positionalShake = { x: 0, y: 0, z: 0, intensity: 0 };
  public chromaIntensity = 0;

  // Animation
  public weaponSwayX = 0;
  public weaponSwayY = 0;
  public sprintBlend = 0;
  public reloadBlend = 0;

  // Weapon Switching
  public switchState: 'idle' | 'switching_out' | 'switching_in' = 'idle';
  public switchTimer = 0;
  public switchDuration = 0.2;
  private pendingWeaponIndex = -1;
  private lastEmptySoundTime = 0;

  // Systems
  private particleSystem: ParticleSystem;

  // Audio
  private audioBuffers: Record<string, AudioBuffer> = {};
  private fireSound: THREE.Audio;
  private reloadSound: THREE.Audio;
  private loadSound: THREE.Audio;
  private cockSound: THREE.Audio;
  private zoomSound: THREE.Audio;
  private tailSound: THREE.Audio;

  // Textures
  private muzzleTexture?: THREE.Texture;

  // Weapon model
  private weaponGroup: THREE.Group;
  private muzzleFlash: THREE.Sprite;
  private muzzleFlash2: THREE.Sprite;
  private muzzleLight: THREE.PointLight;
  private camera: THREE.Camera;
  private gltfLoader: GLTFLoader;
  private loadedModels: Map<WeaponType, THREE.Group> = new Map();

  // Muzzle Flash
  private muzzleFlashTimer = 0;
  private muzzleFlashDuration = 0.05;

  // Shell ejection callback
  private onShellEject?: (position: THREE.Vector3, direction: THREE.Vector3) => void;
  private scene?: THREE.Scene;

  constructor(camera: THREE.Camera, listener: THREE.AudioListener, particleSystem: ParticleSystem, scene?: THREE.Scene) {
    this.camera = camera;
    this.particleSystem = particleSystem;
    this.gltfLoader = new GLTFLoader();
    this.scene = scene;

    // Initialize weapons ammo
    this.weapons = {} as Record<WeaponType, { mag: number; reserve: number }>;
    (Object.values(WeaponType) as WeaponType[]).forEach((type) => {
      this.weapons[type] = {
        mag: WEAPON_CONFIG[type].magSize,
        reserve: WEAPON_CONFIG[type].reserveAmmo,
      };
    });

    this.weaponGroup = this.createWeaponModel();
    
    // Add weapon to scene if provided, otherwise add to camera (fallback)
    if (scene) {
      scene.add(this.weaponGroup);
    } else {
      (camera as THREE.Object3D).add(this.weaponGroup);
    }
    
    // Preload available weapon models
    this.preloadWeaponModels();

    // Initialize Audio
    this.fireSound = new THREE.Audio(listener);
    this.reloadSound = new THREE.Audio(listener);
    this.tailSound = new THREE.Audio(listener);
    this.loadSound = new THREE.Audio(listener);
    this.cockSound = new THREE.Audio(listener);
    this.zoomSound = new THREE.Audio(listener);

    this.loadAllAudio();
    this.loadTextures();

    // Create muzzle effects
    const initialConfig = WEAPON_CONFIG[this.currentWeaponType];
    const initialPos = initialConfig.muzzle.position;

    const spriteMat = new THREE.SpriteMaterial({
      map: this.muzzleTexture || null,
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
    });
    this.muzzleFlash = new THREE.Sprite(spriteMat);
    this.muzzleFlash.scale.set(0.8, 0.8, 1);
    this.muzzleFlash.position.set(initialPos.x, initialPos.y, initialPos.z);
    this.weaponGroup.add(this.muzzleFlash);

    const spriteMat2 = new THREE.SpriteMaterial({
      map: this.muzzleTexture || null,
      color: 0xffaa00,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
    });
    this.muzzleFlash2 = new THREE.Sprite(spriteMat2);
    this.muzzleFlash2.scale.set(0.6, 0.6, 1);
    this.muzzleFlash2.position.set(initialPos.x, initialPos.y, initialPos.z - 0.02);
    this.weaponGroup.add(this.muzzleFlash2);

    this.muzzleLight = new THREE.PointLight(initialConfig.muzzle.lightColor, 0, initialConfig.muzzle.lightRange);
    this.muzzleLight.position.copy(this.muzzleFlash.position);
    this.weaponGroup.add(this.muzzleLight);
  }

  private loadAllAudio(): void {
    const audioLoader = new THREE.AudioLoader();
    const loadedPaths = new Set<string>();

    (Object.values(WEAPON_CONFIG) as SingleWeaponConfig[]).forEach((config) => {
      Object.values(config.audio).forEach((path) => {
        if (path && typeof path === 'string' && !loadedPaths.has(path)) {
          loadedPaths.add(path);
          audioLoader.load(
            path,
            (buffer) => {
              this.audioBuffers[path] = buffer;
            },
            undefined,
            () => {} // Silently fail
          );
        }
      });
    });
  }

  private loadTextures(): void {
    const textureLoader = new THREE.TextureLoader();

    textureLoader.load(
      '/textures/muzzle.png',
      (texture) => {
        this.muzzleTexture = texture;
        if (this.muzzleFlash) {
          this.muzzleFlash.material.map = texture;
          this.muzzleFlash.material.needsUpdate = true;
        }
        if (this.muzzleFlash2) {
          this.muzzleFlash2.material.map = texture;
          this.muzzleFlash2.material.needsUpdate = true;
        }
      },
      undefined,
      () => {}
    );
  }

  // ========== PUBLIC GETTERS/SETTERS ==========

  public get currentMag(): number {
    return this.weapons[this.currentWeaponType].mag;
  }

  public set currentMag(value: number) {
    this.weapons[this.currentWeaponType].mag = value;
  }

  public get reserveAmmo(): number {
    return this.weapons[this.currentWeaponType].reserve;
  }

  public set reserveAmmo(value: number) {
    this.weapons[this.currentWeaponType].reserve = value;
  }

  public get currentConfig(): SingleWeaponConfig {
    return WEAPON_CONFIG[this.currentWeaponType];
  }

  public getCurrentSpread(): number {
    const config = WEAPON_CONFIG[this.currentWeaponType];
    return config.spread.base + this.currentBloom;
  }

  // ========== LOADOUT MANAGEMENT ==========

  public setLoadout(primary: string, secondary: string): void {
    const newLoadout: WeaponType[] = [];

    const isValidWeapon = (w: string): w is WeaponType => {
      return Object.values(WeaponType).includes(w as WeaponType);
    };

    if (isValidWeapon(primary)) {
      newLoadout.push(primary);
    } else {
      newLoadout.push(WeaponType.AK47);
    }

    if (isValidWeapon(secondary)) {
      newLoadout.push(secondary);
    } else {
      newLoadout.push(WeaponType.Pistol);
    }

    this.equippedWeapons = newLoadout;
    this.currentWeaponType = this.equippedWeapons[0];
    this.resetWeaponState();
  }

  public switchWeapon(index: number): void {
    if (index >= 0 && index < this.equippedWeapons.length) {
      const newType = this.equippedWeapons[index];
      if (newType !== this.currentWeaponType) {
        if (this.isReloading) {
          this.isReloading = false;
          this.reloadTimer = 0;
          if (this.reloadSound.isPlaying) this.reloadSound.stop();
        }

        if (this.switchState === 'idle') {
          this.pendingWeaponIndex = index;
          this.switchState = 'switching_out';
          this.switchTimer = 0;
        } else {
          this.pendingWeaponIndex = index;
        }
      }
    }
  }

  public toggleLastWeapon(): void {
    const index = this.equippedWeapons.indexOf(this.lastWeaponType);
    if (index !== -1) {
      this.switchWeapon(index);
    } else {
      const currentIndex = this.equippedWeapons.indexOf(this.currentWeaponType);
      const nextIndex = (currentIndex + 1) % this.equippedWeapons.length;
      this.switchWeapon(nextIndex);
    }
  }

  public scrollWeapon(delta: number): void {
    let currentIndex = this.equippedWeapons.indexOf(this.currentWeaponType);
    if (currentIndex === -1) currentIndex = 0;

    currentIndex += delta;
    if (currentIndex < 0) currentIndex = this.equippedWeapons.length - 1;
    if (currentIndex >= this.equippedWeapons.length) currentIndex = 0;

    this.switchWeapon(currentIndex);
  }

  // ========== ZOOM ==========

  public setZoom(zoomed: boolean): boolean {
    if (this.currentWeaponType !== WeaponType.Sniper && this.currentWeaponType !== WeaponType.AWP) {
      return false;
    }

    if (this.isZoomed === zoomed) return false;

    this.isZoomed = zoomed;
    this.weaponGroup.visible = !zoomed;

    const config = WEAPON_CONFIG[this.currentWeaponType];
    if (config.audio.zoom && this.audioBuffers[config.audio.zoom]) {
      if (this.zoomSound.isPlaying) this.zoomSound.stop();
      this.zoomSound.setBuffer(this.audioBuffers[config.audio.zoom]);
      this.zoomSound.setVolume(0.4);
      this.zoomSound.play();
    }

    return true;
  }

  public setVisible(visible: boolean): void {
    this.weaponGroup.visible = visible;
  }

  // ========== SHOOTING ==========

  public canShoot(playerPowerup: string | null): boolean {
    if (this.isReloading || this.currentMag <= 0) return false;

    const config = WEAPON_CONFIG[this.currentWeaponType];
    const now = performance.now();
    const fireRate = config.fireRate * (playerPowerup === 'rapid' ? 2.5 : 1);

    return now - this.lastShotTime >= 1000 / fireRate;
  }

  public shoot(
    camera: THREE.Camera,
    playerOnGround: boolean,
    playerIsSprinting: boolean,
    playerVelocity: THREE.Vector3
  ): { direction: THREE.Vector3; shotFired: boolean; directions?: THREE.Vector3[] } {
    if (this.isReloading) {
      return { direction: new THREE.Vector3(), shotFired: false };
    }

    if (this.currentMag <= 0) {
      const now = performance.now();
      if (now - this.lastEmptySoundTime > 250) {
        this.playEmptySound();
        this.lastEmptySoundTime = now;
      }
      return { direction: new THREE.Vector3(), shotFired: false };
    }

    if (!this.canShoot(null)) {
      return { direction: new THREE.Vector3(), shotFired: false };
    }

    const config = WEAPON_CONFIG[this.currentWeaponType];

    // Reset burst if enough time passed
    if (this.timeSinceLastShot > config.sprayPattern.resetTime) {
      this.shotsFiredInBurst = 0;
    }

    this.lastShotTime = performance.now();
    this.timeSinceLastShot = 0;
    this.currentMag--;

    // Calculate shot directions (multiple for shotgun)
    const pelletCount = config.pelletCount || 1;
    const directions: THREE.Vector3[] = [];

    for (let i = 0; i < pelletCount; i++) {
      const dir = this.calculateShotDirection(camera, playerOnGround, playerIsSprinting, playerVelocity);
      directions.push(dir);
    }

    // Apply effects
    this.applyRecoil();
    this.playFireSound();
    this.triggerMuzzleFlash();
    this.triggerScreenEffects();
    this.spawnSmoke();

    // Shell ejection
    if (this.onShellEject) {
      this.onShellEject(this.getEjectionPortPosition(), this.getEjectionDirection());
    }

    this.shotsFiredInBurst++;

    return {
      direction: directions[0],
      shotFired: true,
      directions: pelletCount > 1 ? directions : undefined
    };
  }

  private calculateShotDirection(
    camera: THREE.Camera,
    playerOnGround: boolean,
    playerIsSprinting: boolean,
    playerVelocity: THREE.Vector3
  ): THREE.Vector3 {
    const config = WEAPON_CONFIG[this.currentWeaponType];
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);

    // Calculate spread
    let spread = config.spread.base;
    const horizSpeed = Math.sqrt(playerVelocity.x ** 2 + playerVelocity.z ** 2);

    if (!playerOnGround) {
      spread *= 2.0;
    } else if (playerIsSprinting) {
      spread *= 1.5;
    } else if (horizSpeed > 1) {
      spread *= 1.2;
    }

    spread += this.currentBloom;

    // Spray pattern
    let patternPitch = 0, patternYaw = 0;
    if (config.sprayPattern.enabled) {
      const idx = Math.min(this.shotsFiredInBurst, config.sprayPattern.vertical.length - 1);
      patternPitch = config.sprayPattern.vertical[idx] * config.sprayPattern.scale;
      patternYaw = (config.sprayPattern.horizontal[idx] || 0) * config.sprayPattern.scale;
    }

    // Apply offsets
    dir.x += (Math.random() - 0.5) * spread + patternYaw;
    dir.y += (Math.random() - 0.5) * spread - patternPitch;
    dir.normalize();

    // Add bloom
    this.currentBloom = Math.min(config.spread.max, this.currentBloom + config.spread.increasePerShot);

    return dir;
  }

  private applyRecoil(): void {
    const config = WEAPON_CONFIG[this.currentWeaponType];
    const cfg = config.recoil;

    const pitchKick = cfg.pitchAmount + (Math.random() - 0.5) * cfg.pitchRandom;
    const yawKick = (Math.random() - 0.5) * cfg.yawAmount + (Math.random() - 0.5) * cfg.yawRandom;

    this.recoilPitch = Math.min(0.5, this.recoilPitch + pitchKick);
    this.recoilYaw = Math.max(-0.5, Math.min(0.5, this.recoilYaw + yawKick));
    this.recoilRecoveryTimer = 0.1;

    this.weaponKickZ = cfg.kickZ;
    this.weaponKickRotX = (cfg.kickRotX * Math.PI) / 180;

    this.microShake.timer = 0.1;
    this.microShake.x = (Math.random() - 0.5) * config.screen.shakeIntensity;
    this.microShake.y = (Math.random() - 0.5) * config.screen.shakeIntensity;
  }

  private playFireSound(): void {
    const config = WEAPON_CONFIG[this.currentWeaponType];
    const soundPath = config.audio.fire;
    
    if (this.audioBuffers[soundPath]) {
      if (this.fireSound.isPlaying) this.fireSound.stop();
      this.fireSound.setBuffer(this.audioBuffers[soundPath]);
      this.fireSound.setVolume(0.5);
      this.fireSound.play();
    }

    // Play tail sound for echo/reverb
    if (config.audio.tail && this.audioBuffers[config.audio.tail]) {
      if (this.tailSound.isPlaying) this.tailSound.stop();
      this.tailSound.setBuffer(this.audioBuffers[config.audio.tail]);
      this.tailSound.setVolume(0.3);
      this.tailSound.play();
    }
  }

  private playEmptySound(): void {
    if (this.cockSound.isPlaying) this.cockSound.stop();
    const config = WEAPON_CONFIG[this.currentWeaponType];
    const sound = config.audio.cock || config.audio.reload;
    if (sound && this.audioBuffers[sound]) {
      this.cockSound.setBuffer(this.audioBuffers[sound]);
      this.cockSound.setVolume(0.3);
      this.cockSound.setPlaybackRate(3.0);
      this.cockSound.play();
    }
  }

  private triggerMuzzleFlash(): void {
    const config = WEAPON_CONFIG[this.currentWeaponType];
    const cfg = config.muzzle;

    const scale = cfg.flashScale.min + Math.random() * (cfg.flashScale.max - cfg.flashScale.min);
    this.muzzleFlash.scale.set(scale * 1.0, scale * 1.0, 1);
    const flashMat = this.muzzleFlash.material as THREE.SpriteMaterial;

    if (this.muzzleTexture && !flashMat.map) {
      flashMat.map = this.muzzleTexture;
      flashMat.needsUpdate = true;
    }

    flashMat.color.setHex(cfg.lightColor);
    flashMat.opacity = 1.2;
    flashMat.rotation = Math.random() * Math.PI * 2;

    this.muzzleFlash2.scale.set(scale * 0.8, scale * 0.8, 1);
    const flash2Mat = this.muzzleFlash2.material as THREE.SpriteMaterial;
    if (this.muzzleTexture && !flash2Mat.map) {
      flash2Mat.map = this.muzzleTexture;
      flash2Mat.needsUpdate = true;
    }
    flash2Mat.color.setHex(cfg.lightColor);
    flash2Mat.opacity = 0.9;
    flash2Mat.rotation = Math.random() * Math.PI * 2 + Math.PI / 4;

    this.muzzleLight.color.setHex(cfg.lightColor);
    this.muzzleLight.intensity = cfg.lightIntensity;
    this.muzzleLight.distance = cfg.lightRange;

    this.muzzleFlashTimer = cfg.flashDuration;
    this.muzzleFlashDuration = cfg.flashDuration;
  }

  private triggerScreenEffects(): void {
    const config = WEAPON_CONFIG[this.currentWeaponType];
    const cfg = config.screen;

    this.fovPunch = Math.min(cfg.maxFovPunch, this.fovPunch + cfg.fovPunch);
    this.cameraShake.intensity = Math.max(this.cameraShake.intensity, cfg.shakeIntensity);
    this.chromaIntensity = Math.min(cfg.maxChroma, this.chromaIntensity + cfg.chromaIntensity);
  }

  private spawnSmoke(): void {
    const muzzlePos = this.getMuzzleWorldPosition();
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    this.particleSystem.spawnMuzzleSmoke(muzzlePos, dir);
  }

  // ========== RELOAD ==========

  public reload(): void {
    if (this.isReloading || this.currentMag === this.reserveAmmo) return;

    const config = WEAPON_CONFIG[this.currentWeaponType];

    if (config.audio.reload && this.audioBuffers[config.audio.reload]) {
      if (this.reloadSound.isPlaying) this.reloadSound.stop();
      this.reloadSound.setBuffer(this.audioBuffers[config.audio.reload]);
      this.reloadSound.setVolume(0.5);
      this.reloadSound.play();
    }

    this.isReloading = true;
    this.reloadTimer = config.reloadTime;

    if (this.isZoomed) {
      this.setZoom(false);
    }
  }

  public tryReload(onReloadComplete: () => void): boolean {
    const config = WEAPON_CONFIG[this.currentWeaponType];
    if (this.isReloading || this.currentMag >= config.magSize || this.reserveAmmo <= 0) {
      return false;
    }

    this.isReloading = true;

    const soundPath = config.audio.reload;
    if (this.audioBuffers[soundPath]) {
      if (this.reloadSound.isPlaying) this.reloadSound.stop();
      this.reloadSound.setBuffer(this.audioBuffers[soundPath]);
      this.reloadSound.setVolume(0.5);
      this.reloadSound.play();
    }

    // Play load sound mid-reload
    if (config.audio.load && this.audioBuffers[config.audio.load]) {
      const loadPath = config.audio.load;
      setTimeout(() => {
        if (this.loadSound.isPlaying) this.loadSound.stop();
        this.loadSound.setBuffer(this.audioBuffers[loadPath]);
        this.loadSound.setVolume(0.5);
        this.loadSound.play();
      }, (config.reloadTime * 0.5) * 1000);
    }

    // Play cock sound near end
    if (config.audio.cock && this.audioBuffers[config.audio.cock]) {
      const cockPath = config.audio.cock;
      setTimeout(() => {
        if (this.cockSound.isPlaying) this.cockSound.stop();
        this.cockSound.setBuffer(this.audioBuffers[cockPath]);
        this.cockSound.setVolume(0.5);
        this.cockSound.play();
      }, (config.reloadTime * 0.8) * 1000);
    }

    setTimeout(() => {
      const needed = config.magSize - this.currentMag;
      const toLoad = Math.min(needed, this.reserveAmmo);
      this.currentMag += toLoad;
      this.reserveAmmo -= toLoad;
      this.isReloading = false;
      onReloadComplete();
    }, config.reloadTime * 1000);

    return true;
  }

  public addAmmo(amount: number): void {
    this.reserveAmmo += amount;
  }

  // ========== UPDATE LOOP ==========

  public update(delta: number, mouseMovement: { x: number; y: number }, isSprinting: boolean, headBobTime: number = 0): void {
    const config = WEAPON_CONFIG[this.currentWeaponType];
    this.timeSinceLastShot += delta;

    // Bloom decay
    this.currentBloom = Math.max(0, this.currentBloom - config.spread.recoveryRate * delta);

    // Recoil recovery
    if (this.recoilRecoveryTimer > 0) {
      this.recoilRecoveryTimer -= delta;
    } else {
      this.recoilPitch = Math.max(0, this.recoilPitch - config.recoil.recoveryRate * delta);
      this.recoilYaw *= 1 - config.recoil.recoveryRate * delta;
    }

    // Weapon kickback recovery
    this.weaponKickZ *= 1 - 5 * delta;
    this.weaponKickRotX *= 1 - 5 * delta;

    // Micro-shake
    if (this.microShake.timer > 0) {
      this.microShake.timer -= delta;
      this.microShake.x *= config.screen.shakeDecay;
      this.microShake.y *= config.screen.shakeDecay;
    }

    // Camera shake
    if (this.cameraShake.intensity > 0) {
      this.cameraShake.x = (Math.random() - 0.5) * this.cameraShake.intensity;
      this.cameraShake.y = (Math.random() - 0.5) * this.cameraShake.intensity;
      this.cameraShake.intensity *= config.screen.shakeDecay;
    }

    // Positional shake
    if (this.positionalShake.intensity > 0) {
      this.positionalShake.x = (Math.random() - 0.5) * this.positionalShake.intensity;
      this.positionalShake.y = (Math.random() - 0.5) * this.positionalShake.intensity;
      this.positionalShake.z = (Math.random() - 0.5) * this.positionalShake.intensity;
      this.positionalShake.intensity *= config.screen.shakeDecay;
    }

    // FOV punch recovery
    this.fovPunch = Math.max(0, this.fovPunch - config.screen.fovPunchRecovery * delta);

    // Chroma recovery
    this.chromaIntensity *= config.screen.chromaDecay;
    if (this.chromaIntensity < 0.0001) this.chromaIntensity = 0;

    // Weapon sway
    const cfg = config.animation;
    this.weaponSwayX += (mouseMovement.x * cfg.swayAmount - this.weaponSwayX) * cfg.swayRecovery * delta;
    this.weaponSwayY += (mouseMovement.y * cfg.swayAmount - this.weaponSwayY) * cfg.swayRecovery * delta;

    // Sprint blend
    const targetSprint = isSprinting ? 1 : 0;
    this.sprintBlend += (targetSprint - this.sprintBlend) * cfg.sprintLerpSpeed * delta;

    // Reload blend
    const targetReload = this.isReloading ? 1 : 0;
    this.reloadBlend += (targetReload - this.reloadBlend) * cfg.reloadLerpSpeed * delta;

    // Switch animation
    this.updateSwitchAnimation(delta);

    // Muzzle flash decay
    this.updateMuzzleFlash(delta);

    // Apply weapon transform
    this.updateWeaponTransform(delta, headBobTime);
  }

  private updateSwitchAnimation(delta: number): void {
    if (this.switchState === 'switching_out') {
      this.switchTimer += delta;
      if (this.switchTimer >= this.switchDuration) {
        this.lastWeaponType = this.currentWeaponType;
        this.currentWeaponType = this.equippedWeapons[this.pendingWeaponIndex];
        this.resetWeaponState();

        // Play deploy sound
        const config = WEAPON_CONFIG[this.currentWeaponType];
        const deploySound = config.audio.cock || config.audio.load || config.audio.reload;

        if (deploySound && this.audioBuffers[deploySound]) {
          if (this.cockSound.isPlaying) this.cockSound.stop();
          this.cockSound.setBuffer(this.audioBuffers[deploySound]);
          this.cockSound.setVolume(0.5);
          this.cockSound.setPlaybackRate(1.2);
          this.cockSound.play();
        }

        this.switchState = 'switching_in';
        this.switchTimer = 0;
      }
    } else if (this.switchState === 'switching_in') {
      this.switchTimer += delta;
      if (this.switchTimer >= this.switchDuration) {
        this.switchState = 'idle';
      }
    }
  }

  private updateMuzzleFlash(delta: number): void {
    const config = WEAPON_CONFIG[this.currentWeaponType];
    
    if (this.muzzleFlashTimer > 0) {
      this.muzzleFlashTimer -= delta;
      if (this.muzzleFlashTimer <= 0) {
        this.muzzleFlashTimer = 0;
        (this.muzzleFlash.material as THREE.SpriteMaterial).opacity = 0;
        (this.muzzleFlash2.material as THREE.SpriteMaterial).opacity = 0;
        this.muzzleLight.intensity = 0;
      } else {
        const ratio = this.muzzleFlashTimer / this.muzzleFlashDuration;
        (this.muzzleFlash.material as THREE.SpriteMaterial).opacity = ratio * 1.2;
        (this.muzzleFlash2.material as THREE.SpriteMaterial).opacity = ratio * 0.9;
        this.muzzleLight.intensity = ratio * config.muzzle.lightIntensity;

        this.muzzleFlash.material.rotation += delta * 10;
        this.muzzleFlash2.material.rotation -= delta * 10;
      }
    }
  }

  private updateWeaponTransform(delta: number, headBobTime: number): void {
    const config = WEAPON_CONFIG[this.currentWeaponType];
    const cfg = config.animation;

    let targetX = cfg.baseX - this.weaponSwayX;
    let targetY = cfg.baseY - this.weaponSwayY;
    let targetZ = cfg.baseZ;

    // Weapon bob
    const bobX = Math.cos(headBobTime * 0.5) * 0.015 * cfg.bobInfluence;
    const bobY = Math.sin(headBobTime) * 0.035 * cfg.bobInfluence;
    targetX += bobX;
    targetY += bobY;

    // Kickback
    targetZ += this.weaponKickZ;

    // Sprint offset
    targetX += cfg.sprintOffsetX * this.sprintBlend;
    targetY += cfg.sprintOffsetY * this.sprintBlend;

    // Reload offset
    targetY -= cfg.reloadDipY * this.reloadBlend;

    // Switch offset
    let switchOffset = 0;
    if (this.switchState === 'switching_out') {
      switchOffset = this.switchTimer / this.switchDuration;
    } else if (this.switchState === 'switching_in') {
      switchOffset = 1 - (this.switchTimer / this.switchDuration);
    }
    switchOffset = 1 - Math.pow(1 - switchOffset, 3);

    targetY -= switchOffset * 0.3;
    let targetRotX = -this.weaponKickRotX + (cfg.reloadRotX * this.reloadBlend) + (switchOffset * Math.PI / 6);
    let targetRotZ = cfg.sprintRotZ * this.sprintBlend;

    // Smooth lerp for local offsets
    const lerpSpeed = 15;
    const localX = this.weaponGroup.userData.localX ?? cfg.baseX;
    const localY = this.weaponGroup.userData.localY ?? cfg.baseY;
    const localZ = this.weaponGroup.userData.localZ ?? cfg.baseZ;
    const localRotX = this.weaponGroup.userData.localRotX ?? 0;
    const localRotZ = this.weaponGroup.userData.localRotZ ?? 0;
    
    const newLocalX = localX + (targetX - localX) * lerpSpeed * delta;
    const newLocalY = localY + (targetY - localY) * lerpSpeed * delta;
    const newLocalZ = localZ + (targetZ - localZ) * lerpSpeed * delta;
    const newLocalRotX = localRotX + (targetRotX - localRotX) * lerpSpeed * delta;
    const newLocalRotZ = localRotZ + (targetRotZ - localRotZ) * lerpSpeed * delta;
    
    this.weaponGroup.userData.localX = newLocalX;
    this.weaponGroup.userData.localY = newLocalY;
    this.weaponGroup.userData.localZ = newLocalZ;
    this.weaponGroup.userData.localRotX = newLocalRotX;
    this.weaponGroup.userData.localRotZ = newLocalRotZ;

    // If weapon is in scene (not child of camera), transform to world space
    if (this.scene && this.weaponGroup.parent === this.scene) {
      // Get camera's world position and quaternion
      const camWorldPos = new THREE.Vector3();
      const camWorldQuat = new THREE.Quaternion();
      this.camera.matrixWorld.decompose(camWorldPos, camWorldQuat, new THREE.Vector3());
      
      // Create local offset vector
      const localOffset = new THREE.Vector3(newLocalX, newLocalY, newLocalZ);
      
      // Transform local offset to world space
      localOffset.applyQuaternion(camWorldQuat);
      
      // Set weapon world position
      this.weaponGroup.position.copy(camWorldPos).add(localOffset);
      
      // Set weapon world rotation (camera rotation + local rotation)
      const localEuler = new THREE.Euler(newLocalRotX, 0, newLocalRotZ, 'YXZ');
      const localQuat = new THREE.Quaternion().setFromEuler(localEuler);
      const worldQuat = camWorldQuat.clone().multiply(localQuat);
      this.weaponGroup.quaternion.copy(worldQuat);
    } else {
      // Weapon is child of camera, use local coordinates directly
      this.weaponGroup.position.set(newLocalX, newLocalY, newLocalZ);
      this.weaponGroup.rotation.x = newLocalRotX;
      this.weaponGroup.rotation.z = newLocalRotZ;
    }
  }

  // ========== UTILITIES ==========

  private resetWeaponState(): void {
    this.isReloading = false;
    this.isZoomed = false;
    this.weaponGroup.visible = true;
    this.reloadTimer = 0;
    this.shotsFiredInBurst = 0;
    this.currentBloom = 0;
    this.recoilPitch = 0;
    this.recoilYaw = 0;

    if (this.weaponGroup.parent) {
      this.weaponGroup.parent.remove(this.weaponGroup);
    }

    this.weaponGroup = this.createWeaponModel();

    this.weaponGroup.add(this.muzzleFlash);
    this.weaponGroup.add(this.muzzleFlash2);
    this.weaponGroup.add(this.muzzleLight);

    // Add to scene if available, otherwise to camera
    if (this.scene) {
      this.scene.add(this.weaponGroup);
    } else {
      (this.camera as THREE.Object3D).add(this.weaponGroup);
    }

    const config = WEAPON_CONFIG[this.currentWeaponType];
    this.muzzleLight.color.setHex(config.muzzle.lightColor);
    this.muzzleLight.distance = config.muzzle.lightRange;

    const pos = config.muzzle.position;
    this.muzzleFlash.position.set(pos.x, pos.y, pos.z);
    this.muzzleFlash2.position.set(pos.x, pos.y, pos.z - 0.02);
    this.muzzleLight.position.copy(this.muzzleFlash.position);
  }

  public getMuzzleWorldPosition(): THREE.Vector3 {
    this.weaponGroup.updateMatrixWorld(true);
    const worldPos = new THREE.Vector3();
    this.muzzleFlash.getWorldPosition(worldPos);
    return worldPos;
  }

  public setShellEjectCallback(callback: (position: THREE.Vector3, direction: THREE.Vector3) => void): void {
    this.onShellEject = callback;
  }

  private getEjectionPortPosition(): THREE.Vector3 {
    const offset = new THREE.Vector3(0.15, 0.05, -0.2);
    return offset.applyMatrix4(this.weaponGroup.matrixWorld);
  }

  private getEjectionDirection(): THREE.Vector3 {
    const dir = new THREE.Vector3(0.8 + Math.random() * 0.4, 0.5 + Math.random() * 0.2, 0.2);
    dir.applyQuaternion(this.camera.quaternion);
    return dir.normalize();
  }

  public reset(): void {
    const config = WEAPON_CONFIG[this.currentWeaponType];
    this.currentMag = config.magSize;
    this.reserveAmmo = config.reserveAmmo;
    this.isReloading = false;
    this.recoilPitch = 0;
    this.recoilYaw = 0;
    this.currentBloom = 0;
    this.shotsFiredInBurst = 0;
    this.fovPunch = 0;
    this.cameraShake.intensity = 0;
    this.chromaIntensity = 0;
  }

  // ========== WEAPON MODELS ==========

  /**
   * Preload all available weapon GLB models
   */
  private async preloadWeaponModels(): Promise<void> {
    // Updated paths to match actual file locations in public/models/
    // Use absolute paths from root since Vite serves public/ from root
    const modelPaths: Partial<Record<WeaponType, { path: string; scale: number; position: { x: number; y: number; z: number }; rotation?: { x: number; y: number; z: number } }>> = {
      [WeaponType.AK47]: {
        path: '/models/ak-47/AK-47.glb',
        scale: 0.008,
        position: { x: 0.15, y: -0.15, z: -0.35 },
        rotation: { x: 0, y: Math.PI, z: 0 }
      },
      [WeaponType.Scar]: {
        path: '/models/scar/GUN_Lilium_Scar.glb_5a9a71e6.glb',
        scale: 0.15,
        position: { x: 0.2, y: -0.18, z: -0.4 },
        rotation: { x: 0, y: Math.PI, z: 0 }
      },
      [WeaponType.Shotgun]: {
        path: '/models/shotgun/GUN_Lilium_Shotgun_Reload.glb_3626d44e.glb',
        scale: 0.15,
        position: { x: 0.2, y: -0.2, z: -0.45 },
        rotation: { x: 0, y: Math.PI, z: 0 }
      },
      [WeaponType.Sniper]: {
        path: '/models/sniper/GUN_Lilium_Sniper.glb_e81eb344.glb',
        scale: 0.12,
        position: { x: 0.25, y: -0.22, z: -0.5 },
        rotation: { x: 0, y: Math.PI, z: 0 }
      },
      [WeaponType.Tec9]: {
        path: '/models/tec-1/GUN_Lilium_Tec9_reload.glb_3a690346.glb',
        scale: 0.12,
        position: { x: 0.18, y: -0.15, z: -0.3 },
        rotation: { x: 0, y: Math.PI, z: 0 }
      },
    };

    console.log('Starting weapon model preload...');

    for (const [weaponType, config] of Object.entries(modelPaths)) {
      if (!config) continue;
      try {
        console.log(`Loading weapon model: ${weaponType} from ${config.path}`);
        const gltf = await this.gltfLoader.loadAsync(config.path);
        const model = gltf.scene;
        
        // Scale and position the model appropriately for first-person view
        model.scale.setScalar(config.scale);
        model.position.set(config.position.x, config.position.y, config.position.z);
        
        // Apply rotation if specified
        if (config.rotation) {
          model.rotation.set(config.rotation.x, config.rotation.y, config.rotation.z);
        }
        
        // Ensure materials are visible
        model.traverse((child: any) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material) {
              child.material.side = 2; // THREE.DoubleSide
            }
          }
        });
        
        this.loadedModels.set(weaponType as WeaponType, model);
        console.log(`Successfully loaded weapon model: ${weaponType}`);
      } catch (error) {
        console.warn(`Failed to load weapon model ${weaponType} from ${config.path}:`, error);
      }
    }
    
    console.log(`Weapon preload complete. Loaded ${this.loadedModels.size} models.`);
  }

  public getEquippedWeapons(): WeaponType[] {
    return this.equippedWeapons;
  }

  public getMuzzlePosition(): THREE.Vector3 {
    return this.getMuzzleWorldPosition();
  }

  private createWeaponModel(): THREE.Group {
    const group = new THREE.Group();
    
    // Try to get the GLB model for current weapon
    const loadedModel = this.loadedModels.get(this.currentWeaponType);
    if (loadedModel) {
      const clonedModel = loadedModel.clone();
      group.add(clonedModel);
      console.log(`Using GLB model for ${this.currentWeaponType}`);
      return group;
    }
    
    console.log(`No GLB model found for ${this.currentWeaponType}, using procedural fallback`);
    
    // Fallback to procedural models for weapons without GLB
    switch (this.currentWeaponType) {
      case WeaponType.AK47: return this.createAK47Model();
      case WeaponType.AWP: return this.createAWPModel();
      case WeaponType.LMG: return this.createLMGModel();
      case WeaponType.M4: return this.createM4Model();
      case WeaponType.Pistol: return this.createPistolModel();
      case WeaponType.Scar: return this.createScarModel();
      case WeaponType.Shotgun: return this.createShotgunModel();
      case WeaponType.Sniper: return this.createSniperModel();
      case WeaponType.Tec9: return this.createTec9Model();
      default: return this.createPlaceholderModel();
    }
  }
  
  private createPlaceholderModel(): THREE.Group {
    const group = new THREE.Group();
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.1, 0.4),
      new THREE.MeshStandardMaterial({ color: 0xff0000 })
    );
    box.position.set(0, 0, -0.2);
    group.add(box);
    group.position.set(0.25, -0.25, -0.4);
    return group;
  }

  private createAK47Model(): THREE.Group {
    const group = new THREE.Group();

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.12, 0.6),
      new THREE.MeshStandardMaterial({ color: 0x5d4037, metalness: 0.1, roughness: 0.8 })
    );
    body.position.set(0, 0, -0.1);
    group.add(body);

    const receiver = new THREE.Mesh(
      new THREE.BoxGeometry(0.09, 0.13, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8, roughness: 0.4 })
    );
    receiver.position.set(0, 0.01, -0.1);
    group.add(receiver);

    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, 0.6),
      new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.9, roughness: 0.3 })
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.04, -0.5);
    group.add(barrel);

    const mag = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.25, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x333333 })
    );
    mag.position.set(0, -0.15, -0.05);
    mag.rotation.x = 0.3;
    group.add(mag);

    group.position.set(0.25, -0.25, -0.4);
    return group;
  }

  private createAWPModel(): THREE.Group {
    const group = new THREE.Group();

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.15, 0.8),
      new THREE.MeshStandardMaterial({ color: 0x2e7d32, metalness: 0.2, roughness: 0.7 })
    );
    body.position.set(0, 0, -0.2);
    group.add(body);

    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 1.0),
      new THREE.MeshStandardMaterial({ color: 0x111111 })
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.05, -0.8);
    group.add(barrel);

    const scope = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.05, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x111111 })
    );
    scope.rotation.x = Math.PI / 2;
    scope.position.set(0, 0.12, -0.1);
    group.add(scope);

    group.position.set(0.3, -0.3, -0.5);
    return group;
  }

  private createLMGModel(): THREE.Group {
    const group = new THREE.Group();

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 0.2, 0.7),
      new THREE.MeshStandardMaterial({ color: 0x424242 })
    );
    body.position.set(0, 0, -0.1);
    group.add(body);

    const mag = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.2, 0.15),
      new THREE.MeshStandardMaterial({ color: 0x2e7d32 })
    );
    mag.position.set(0, -0.15, 0);
    group.add(mag);

    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.7),
      new THREE.MeshStandardMaterial({ color: 0x111111 })
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0, -0.6);
    group.add(barrel);

    group.position.set(0.3, -0.35, -0.4);
    return group;
  }

  private createM4Model(): THREE.Group {
    const group = new THREE.Group();

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.12, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x1a1a1a })
    );
    body.position.set(0, 0, -0.1);
    group.add(body);

    const handguard = new THREE.Mesh(
      new THREE.BoxGeometry(0.09, 0.09, 0.35),
      new THREE.MeshStandardMaterial({ color: 0x222222 })
    );
    handguard.position.set(0, 0.02, -0.4);
    group.add(handguard);

    const sight = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.06, 0.15),
      new THREE.MeshStandardMaterial({ color: 0x111111 })
    );
    sight.position.set(0, 0.1, -0.1);
    group.add(sight);

    group.position.set(0.25, -0.25, -0.4);
    return group;
  }

  private createPistolModel(): THREE.Group {
    const group = new THREE.Group();

    const slide = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.08, 0.25),
      new THREE.MeshStandardMaterial({ color: 0xbdc3c7, metalness: 0.8 })
    );
    slide.position.set(0, 0.05, 0);
    group.add(slide);

    const grip = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.15, 0.07),
      new THREE.MeshStandardMaterial({ color: 0x2c3e50 })
    );
    grip.position.set(0, -0.05, 0.05);
    grip.rotation.x = -0.2;
    group.add(grip);

    group.position.set(0.2, -0.2, -0.3);
    return group;
  }

  private createScarModel(): THREE.Group {
    const group = new THREE.Group();

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.15, 0.6),
      new THREE.MeshStandardMaterial({ color: 0xd2b48c })
    );
    body.position.set(0, 0, -0.1);
    group.add(body);

    const upper = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.08, 0.7),
      new THREE.MeshStandardMaterial({ color: 0xc2a47c })
    );
    upper.position.set(0, 0.08, -0.15);
    group.add(upper);

    const mag = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.2, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x222222 })
    );
    mag.position.set(0, -0.15, -0.05);
    group.add(mag);

    group.position.set(0.25, -0.25, -0.4);
    return group;
  }

  private createShotgunModel(): THREE.Group {
    const group = new THREE.Group();

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.12, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x333333 })
    );
    body.position.set(0, 0, -0.1);
    group.add(body);

    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.8),
      new THREE.MeshStandardMaterial({ color: 0x111111 })
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.02, -0.6);
    group.add(barrel);

    const pump = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.06, 0.2),
      new THREE.MeshStandardMaterial({ color: 0x5d4037 })
    );
    pump.position.set(0, -0.05, -0.5);
    group.add(pump);

    group.position.set(0.25, -0.25, -0.4);
    return group;
  }

  private createSniperModel(): THREE.Group {
    const group = new THREE.Group();

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.1, 0.7),
      new THREE.MeshStandardMaterial({ color: 0x222222 })
    );
    body.position.set(0, 0, -0.2);
    group.add(body);

    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, 0.9),
      new THREE.MeshStandardMaterial({ color: 0x111111 })
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.05, -0.8);
    group.add(barrel);

    const scope = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.04, 0.25),
      new THREE.MeshStandardMaterial({ color: 0x111111 })
    );
    scope.rotation.x = Math.PI / 2;
    scope.position.set(0, 0.1, -0.1);
    group.add(scope);

    group.position.set(0.3, -0.3, -0.5);
    return group;
  }

  private createTec9Model(): THREE.Group {
    const group = new THREE.Group();

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.08, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x222222 })
    );
    body.position.set(0, 0.05, 0);
    group.add(body);

    const shroud = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.2),
      new THREE.MeshStandardMaterial({ color: 0x111111, wireframe: false })
    );
    shroud.rotation.x = Math.PI / 2;
    shroud.position.set(0, 0.05, -0.25);
    group.add(shroud);

    const mag = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 0.2, 0.05),
      new THREE.MeshStandardMaterial({ color: 0x111111 })
    );
    mag.position.set(0, -0.1, -0.1);
    group.add(mag);

    group.position.set(0.2, -0.2, -0.3);
    return group;
  }
}

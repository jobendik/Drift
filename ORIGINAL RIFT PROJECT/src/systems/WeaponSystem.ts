import * as THREE from 'three';
import { WEAPON_CONFIG } from '../config/gameConfig';
import { WeaponType } from '../types';
import { ParticleSystem } from './ParticleSystem';

export class WeaponSystem {
  public currentWeaponType: WeaponType = WeaponType.AK47;
  public lastWeaponType: WeaponType = WeaponType.Pistol;
  private weapons: Record<WeaponType, { mag: number; reserve: number }>;
  private equippedWeapons: WeaponType[] = Object.values(WeaponType); // Default to all

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
  public switchDuration = 0.2; // seconds
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

  // Muzzle Flash
  private muzzleFlashTimer = 0;
  private muzzleFlashDuration = 0.05;

  constructor(camera: THREE.Camera, listener: THREE.AudioListener, particleSystem: ParticleSystem) {
    this.camera = camera;
    this.particleSystem = particleSystem;
    // Initialize weapons ammo
    this.weapons = {} as any;
    Object.values(WeaponType).forEach((type) => {
      this.weapons[type] = {
        mag: WEAPON_CONFIG[type].magSize,
        reserve: WEAPON_CONFIG[type].reserveAmmo,
      };
    });

    this.weaponGroup = this.createWeaponModel();
    (camera as any).add(this.weaponGroup);

    // Initialize Audio
    this.fireSound = new THREE.Audio(listener);
    this.reloadSound = new THREE.Audio(listener);
    this.tailSound = new THREE.Audio(listener);
    this.loadSound = new THREE.Audio(listener);
    this.cockSound = new THREE.Audio(listener);
    this.zoomSound = new THREE.Audio(listener);

    this.loadAllAudio();
    this.loadTextures();

    // Create muzzle effects with initial weapon's position
    const initialConfig = WEAPON_CONFIG[this.currentWeaponType];
    const initialPos = initialConfig.muzzle.position;

    // Use sprite for muzzle flash with texture - larger and more visible
    const spriteMat = new THREE.SpriteMaterial({
      map: this.muzzleTexture || null,
      color: 0xffffff, // White to let texture color show through, or tint if needed
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
    });
    this.muzzleFlash = new THREE.Sprite(spriteMat);
    this.muzzleFlash.scale.set(0.8, 0.8, 1); // Larger for texture
    this.muzzleFlash.position.set(initialPos.x, initialPos.y, initialPos.z);
    this.weaponGroup.add(this.muzzleFlash);

    const spriteMat2 = new THREE.SpriteMaterial({
      map: this.muzzleTexture || null,
      color: 0xffaa00, // Tint secondary flash
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

    Object.values(WEAPON_CONFIG).forEach((config) => {
      Object.values(config.audio).forEach((path) => {
        if (path && !loadedPaths.has(path)) {
          loadedPaths.add(path);
          audioLoader.load(
            path,
            (buffer) => {
              this.audioBuffers[path] = buffer;
            },
            undefined,
            (error) => {
              console.warn(`Failed to load audio: ${path}`, error);
            }
          );
        }
      });
    });
  }

  private loadTextures(): void {
    const textureLoader = new THREE.TextureLoader();

    textureLoader.load(
      'assets/images/muzzle.png_19188667.png',
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
      (err) => console.warn('Failed to load muzzle texture:', err)
    );
  }

  public setLoadout(primary: string, secondary: string): void {
    const newLoadout: WeaponType[] = [];

    // Helper to check if a string is a valid WeaponType
    const isValidWeapon = (w: string): w is WeaponType => {
      return Object.values(WeaponType).includes(w as WeaponType);
    };

    if (isValidWeapon(primary)) {
      newLoadout.push(primary);
    } else {
      console.warn(`Invalid primary weapon: ${primary}, defaulting to AK47`);
      newLoadout.push(WeaponType.AK47);
    }

    if (isValidWeapon(secondary)) {
      newLoadout.push(secondary);
    } else {
      console.warn(`Invalid secondary weapon: ${secondary}, defaulting to Pistol`);
      newLoadout.push(WeaponType.Pistol);
    }

    this.equippedWeapons = newLoadout;
    console.log('WeaponSystem loadout set:', this.equippedWeapons);

    // Switch to primary immediately
    this.currentWeaponType = this.equippedWeapons[0];
    this.resetWeaponState();
  }

  public switchWeapon(index: number): void {
    // Index is now into equippedWeapons, not all types
    if (index >= 0 && index < this.equippedWeapons.length) {
      const newType = this.equippedWeapons[index];
      if (newType !== this.currentWeaponType) {
        // Cancel reload if active
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
          // If already switching, just update the pending target
          this.pendingWeaponIndex = index;
        }
      }
    }
  }

  public toggleLastWeapon(): void {
    // Find index of last weapon in equipped list
    const index = this.equippedWeapons.indexOf(this.lastWeaponType);
    if (index !== -1) {
      this.switchWeapon(index);
    } else {
      // If last weapon is not in loadout (e.g. after loadout change), switch to other weapon
      const currentIndex = this.equippedWeapons.indexOf(this.currentWeaponType);
      const nextIndex = (currentIndex + 1) % this.equippedWeapons.length;
      this.switchWeapon(nextIndex);
    }
  }

  public scrollWeapon(delta: number): void {
    let currentIndex = this.equippedWeapons.indexOf(this.currentWeaponType);
    if (currentIndex === -1) currentIndex = 0; // Should not happen

    currentIndex += delta;

    if (currentIndex < 0) currentIndex = this.equippedWeapons.length - 1;
    if (currentIndex >= this.equippedWeapons.length) currentIndex = 0;

    this.switchWeapon(currentIndex);
  }

  public setZoom(zoomed: boolean): boolean {
    // Only allow zoom for sniper weapons
    if (this.currentWeaponType !== WeaponType.Sniper && this.currentWeaponType !== WeaponType.AWP) {
      return false;
    }

    if (this.isZoomed === zoomed) return false;

    this.isZoomed = zoomed;
    this.weaponGroup.visible = !zoomed; // Hide weapon when zoomed

    // Play zoom sound
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

  public reload(): void {
    if (this.isReloading || this.currentMag === this.reserveAmmo) return;

    const config = WEAPON_CONFIG[this.currentWeaponType];

    // Play reload sound
    if (config.audio.reload && this.audioBuffers[config.audio.reload]) {
      if (this.reloadSound.isPlaying) this.reloadSound.stop();
      this.reloadSound.setBuffer(this.audioBuffers[config.audio.reload]);
      this.reloadSound.setVolume(0.5);
      this.reloadSound.play();
    }

    this.isReloading = true;
    this.reloadTimer = config.reloadTime;

    // Unzoom if reloading
    if (this.isZoomed) {
      this.setZoom(false);
    }
  }

  private resetWeaponState(): void {
    this.isReloading = false;
    this.isZoomed = false;
    this.weaponGroup.visible = true;
    this.reloadTimer = 0;
    this.shotsFiredInBurst = 0;
    this.currentBloom = 0;
    this.recoilPitch = 0;
    this.recoilYaw = 0;

    // Remove old model
    if (this.weaponGroup.parent) {
      this.weaponGroup.parent.remove(this.weaponGroup);
    }

    // Create new model
    this.weaponGroup = this.createWeaponModel();

    // Re-add muzzle effects
    this.weaponGroup.add(this.muzzleFlash);
    this.weaponGroup.add(this.muzzleFlash2);
    this.weaponGroup.add(this.muzzleLight);

    // Add to camera
    (this.camera as any).add(this.weaponGroup);

    // Update muzzle light color/range/position based on new weapon
    const config = WEAPON_CONFIG[this.currentWeaponType];
    this.muzzleLight.color.setHex(config.muzzle.lightColor);
    this.muzzleLight.distance = config.muzzle.lightRange;

    // Update muzzle flash positions for this weapon
    const pos = config.muzzle.position;
    this.muzzleFlash.position.set(pos.x, pos.y, pos.z);
    this.muzzleFlash2.position.set(pos.x, pos.y, pos.z - 0.02);
    this.muzzleLight.position.copy(this.muzzleFlash.position);
  } public get currentMag(): number {
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

  // Weapon model
  private createWeaponModel(): THREE.Group {
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

    group.position.set(0.25, -0.25, -0.4);
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

    group.position.set(0.3, -0.3, -0.5);
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

    group.position.set(0.3, -0.35, -0.4);
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

    group.position.set(0.25, -0.25, -0.4);
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

    group.position.set(0.2, -0.2, -0.3);
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

    group.position.set(0.25, -0.25, -0.4);
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

    group.position.set(0.25, -0.25, -0.4);
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

    group.position.set(0.3, -0.3, -0.5);
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

    group.position.set(0.2, -0.2, -0.3);
    return group;
  }

  private playEmptySound(): void {
    if (this.cockSound.isPlaying) this.cockSound.stop();
    // Use cock sound or reload sound
    const config = WEAPON_CONFIG[this.currentWeaponType];
    const sound = config.audio.cock || config.audio.reload;
    if (sound && this.audioBuffers[sound]) {
      this.cockSound.setBuffer(this.audioBuffers[sound]);
      this.cockSound.setVolume(0.3);
      this.cockSound.setPlaybackRate(3.0); // Very fast for a click
      this.cockSound.play();
    }
  }

  public canShoot(playerPowerup: string | null): boolean {
    if (this.isReloading || this.currentMag <= 0) return false;

    const config = WEAPON_CONFIG[this.currentWeaponType];
    const now = performance.now();
    const fireRate = config.fireRate * (playerPowerup === 'rapid' ? 2.5 : 1);

    // For semi-auto, ensure trigger release (simple check: time > 1/fireRate)
    // But for true semi-auto we'd need input state "justPressed".
    // Assuming input system handles "justPressed" or we just rely on fireRate.

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

    // Calculate shot direction(s) - shotguns fire multiple pellets
    const pelletCount = config.pelletCount || 1;
    const directions: THREE.Vector3[] = [];

    for (let i = 0; i < pelletCount; i++) {
      const dir = this.calculateShotDirection(camera, playerOnGround, playerIsSprinting, playerVelocity);
      directions.push(dir);
    }

    // Apply recoil
    this.applyRecoil();

    // Play sound
    const soundPath = config.audio.fire;
    if (this.audioBuffers[soundPath]) {
      if (this.fireSound.isPlaying) this.fireSound.stop();
      this.fireSound.setBuffer(this.audioBuffers[soundPath]);
      this.fireSound.setVolume(0.5);
      this.fireSound.play();
    }

    // Play tail sound if available (for echo/reverb effect)
    if (config.audio.tail && this.audioBuffers[config.audio.tail]) {
      if (this.tailSound.isPlaying) this.tailSound.stop();
      this.tailSound.setBuffer(this.audioBuffers[config.audio.tail]);
      this.tailSound.setVolume(0.3);
      this.tailSound.play();
    }

    // Trigger effects
    this.triggerMuzzleFlash();
    this.triggerScreenEffects();
    this.spawnSmoke();

    // Trigger shell ejection
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
      spread *= 2.0; // config.spread.air
    } else if (playerIsSprinting) {
      spread *= 1.5; // config.spread.sprint
    } else if (horizSpeed > 1) {
      spread *= 1.2; // config.spread.move
    }

    spread += this.currentBloom;

    // First shot accuracy
    // if (this.shotsFiredInBurst === 0) {
    //   spread *= config.spread.firstShotBonus; // Missing in interface
    // }

    // Spray pattern
    let patternPitch = 0,
      patternYaw = 0;
    if (config.sprayPattern.enabled) {
      const idx = Math.min(this.shotsFiredInBurst, config.sprayPattern.vertical.length - 1);
      patternPitch = config.sprayPattern.vertical[idx] * config.sprayPattern.scale;
      patternYaw =
        (config.sprayPattern.horizontal[idx] || 0) * config.sprayPattern.scale;
    }

    // Apply offsets
    dir.x += (Math.random() - 0.5) * spread + patternYaw;
    dir.y += (Math.random() - 0.5) * spread - patternPitch;
    dir.normalize();

    // Add bloom
    this.currentBloom = Math.min(
      config.spread.max, // config.spread.maxBloom -> max
      this.currentBloom + config.spread.increasePerShot // bloomPerShot -> increasePerShot
    );

    return dir;
  }

  public getCurrentSpread(): number {
    const config = WEAPON_CONFIG[this.currentWeaponType];
    // Return base weapon spread + current bloom (accumulated from firing)
    return config.spread.base + this.currentBloom;
  }

  private applyRecoil(): void {
    const config = WEAPON_CONFIG[this.currentWeaponType];
    const cfg = config.recoil;

    const pitchKick = cfg.pitchAmount + (Math.random() - 0.5) * cfg.pitchRandom;
    const yawKick = (Math.random() - 0.5) * cfg.yawAmount + (Math.random() - 0.5) * cfg.yawRandom;

    // maxPitch/maxYaw missing in interface, using hardcoded limits
    this.recoilPitch = Math.min(0.5, this.recoilPitch + pitchKick);
    this.recoilYaw = Math.max(-0.5, Math.min(0.5, this.recoilYaw + yawKick));
    this.recoilRecoveryTimer = 0.1; // cfg.recoveryDelay missing

    this.weaponKickZ = cfg.kickZ; // kickBackZ -> kickZ
    this.weaponKickRotX = (cfg.kickRotX * Math.PI) / 180; // kickRotationX -> kickRotX

    this.microShake.timer = 0.1; // cfg.shakeDuration missing
    this.microShake.x = (Math.random() - 0.5) * config.screen.shakeIntensity;
    this.microShake.y = (Math.random() - 0.5) * config.screen.shakeIntensity;
  }

  private triggerMuzzleFlash(): void {
    const config = WEAPON_CONFIG[this.currentWeaponType];
    const cfg = config.muzzle;

    // Enhanced sprite-based muzzle flash - much larger and more visible
    const scale = cfg.flashScale.min + Math.random() * (cfg.flashScale.max - cfg.flashScale.min);
    this.muzzleFlash.scale.set(scale * 1.0, scale * 1.0, 1); // Doubled from 0.5
    const flashMat = this.muzzleFlash.material as THREE.SpriteMaterial;

    // Update texture if loaded
    if (this.muzzleTexture && !flashMat.map) {
      flashMat.map = this.muzzleTexture;
      flashMat.needsUpdate = true;
    }

    flashMat.color.setHex(cfg.lightColor);
    flashMat.opacity = 1.2; // Exaggerated brightness
    flashMat.rotation = Math.random() * Math.PI * 2;

    this.muzzleFlash2.scale.set(scale * 0.8, scale * 0.8, 1); // Doubled from 0.4
    const flash2Mat = this.muzzleFlash2.material as THREE.SpriteMaterial;
    if (this.muzzleTexture && !flash2Mat.map) {
      flash2Mat.map = this.muzzleTexture;
      flash2Mat.needsUpdate = true;
    }
    flash2Mat.color.setHex(cfg.lightColor);
    flash2Mat.opacity = 0.9;
    flash2Mat.rotation = Math.random() * Math.PI * 2 + Math.PI / 4; // Offset rotation

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

  public tryReload(onReloadComplete: () => void): boolean {
    const config = WEAPON_CONFIG[this.currentWeaponType];
    if (this.isReloading || this.currentMag >= config.magSize || this.reserveAmmo <= 0) {
      return false;
    }

    this.isReloading = true;

    // Play reload sound
    const soundPath = config.audio.reload;
    if (this.audioBuffers[soundPath]) {
      if (this.reloadSound.isPlaying) this.reloadSound.stop();
      this.reloadSound.setBuffer(this.audioBuffers[soundPath]);
      this.reloadSound.setVolume(0.5);
      this.reloadSound.play();
    }

    // Play load sound after a delay (mid-reload for shotgun/sniper)
    if (config.audio.load && this.audioBuffers[config.audio.load]) {
      const loadPath = config.audio.load;
      setTimeout(() => {
        if (this.loadSound.isPlaying) this.loadSound.stop();
        this.loadSound.setBuffer(this.audioBuffers[loadPath]);
        this.loadSound.setVolume(0.5);
        this.loadSound.play();
      }, (config.reloadTime * 0.5) * 1000);
    }

    // Play cock sound near the end (for shotgun)
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

  public update(delta: number, mouseMovement: { x: number; y: number }, isSprinting: boolean, headBobTime: number = 0): void {
    const config = WEAPON_CONFIG[this.currentWeaponType];
    this.timeSinceLastShot += delta;

    // Bloom decay
    this.currentBloom = Math.max(0, this.currentBloom - config.spread.recoveryRate * delta); // bloomRecovery -> recoveryRate

    // Recoil recovery
    if (this.recoilRecoveryTimer > 0) {
      this.recoilRecoveryTimer -= delta;
    } else {
      this.recoilPitch = Math.max(0, this.recoilPitch - config.recoil.recoveryRate * delta); // recoverySpeed -> recoveryRate
      this.recoilYaw *= 1 - config.recoil.recoveryRate * delta;
    }

    // Weapon kickback recovery
    this.weaponKickZ *= 1 - 5 * delta; // kickBackRecovery missing, using 5
    this.weaponKickRotX *= 1 - 5 * delta;

    // Micro-shake
    if (this.microShake.timer > 0) {
      this.microShake.timer -= delta;
      this.microShake.x *= config.screen.shakeDecay; // shakeDecay from screen? or recoil?
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

    // Switch animation logic
    if (this.switchState === 'switching_out') {
      this.switchTimer += delta;
      if (this.switchTimer >= this.switchDuration) {
        // Perform switch
        this.lastWeaponType = this.currentWeaponType;
        const types = Object.values(WeaponType);
        this.currentWeaponType = types[this.pendingWeaponIndex];
        this.resetWeaponState();
        console.log(`Switched to ${WEAPON_CONFIG[this.currentWeaponType].name}`);

        // Play deploy sound
        const config = WEAPON_CONFIG[this.currentWeaponType];
        const deploySound = config.audio.cock || config.audio.load || config.audio.reload;

        if (deploySound && this.audioBuffers[deploySound]) {
          if (this.cockSound.isPlaying) this.cockSound.stop();
          this.cockSound.setBuffer(this.audioBuffers[deploySound]);
          this.cockSound.setVolume(0.5);
          this.cockSound.setPlaybackRate(1.2); // Faster for deploy
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

    // Muzzle flash decay
    if (this.muzzleFlashTimer > 0) {
      this.muzzleFlashTimer -= delta;
      if (this.muzzleFlashTimer <= 0) {
        this.muzzleFlashTimer = 0;
        (this.muzzleFlash.material as THREE.SpriteMaterial).opacity = 0;
        (this.muzzleFlash2.material as THREE.SpriteMaterial).opacity = 0;
        this.muzzleLight.intensity = 0;
      } else {
        // Fade out
        const ratio = this.muzzleFlashTimer / this.muzzleFlashDuration;
        (this.muzzleFlash.material as THREE.SpriteMaterial).opacity = ratio * 1.2;
        (this.muzzleFlash2.material as THREE.SpriteMaterial).opacity = ratio * 0.9;
        this.muzzleLight.intensity = ratio * config.muzzle.lightIntensity;

        // Rotate slightly during flash
        this.muzzleFlash.material.rotation += delta * 10;
        this.muzzleFlash2.material.rotation -= delta * 10;
      }
    }

    // Apply weapon position/rotation
    this.updateWeaponTransform(delta, headBobTime);
  }

  private updateWeaponTransform(delta: number, headBobTime: number): void {
    const config = WEAPON_CONFIG[this.currentWeaponType];
    const cfg = config.animation;

    // Calculate target position/rotation
    let targetX = cfg.baseX - this.weaponSwayX;
    let targetY = cfg.baseY - this.weaponSwayY;
    let targetZ = cfg.baseZ;

    // Weapon bob (breathing/walking motion)
    const bobX = Math.cos(headBobTime * 0.5) * 0.015 * cfg.bobInfluence;
    const bobY = Math.sin(headBobTime) * 0.035 * cfg.bobInfluence;
    targetX += bobX;
    targetY += bobY;

    // Kickback from shooting
    targetZ += this.weaponKickZ;

    // Sprint offset
    targetX += cfg.sprintOffsetX * this.sprintBlend;
    targetY += cfg.sprintOffsetY * this.sprintBlend;

    // Reload offset
    targetY -= cfg.reloadDipY * this.reloadBlend;

    // Switch offset
    let switchOffset = 0;
    if (this.switchState === 'switching_out') {
      switchOffset = this.switchTimer / this.switchDuration; // 0 to 1
    } else if (this.switchState === 'switching_in') {
      switchOffset = 1 - (this.switchTimer / this.switchDuration); // 1 to 0
    }
    // Ease out cubic
    switchOffset = 1 - Math.pow(1 - switchOffset, 3);

    targetY -= switchOffset * 0.3; // Dip down
    let targetRotX = -this.weaponKickRotX + (cfg.reloadRotX * this.reloadBlend) + (switchOffset * Math.PI / 6); // Rotate down

    let targetRotZ = (cfg.sprintRotZ * this.sprintBlend);

    // Smooth lerp to target
    const lerpSpeed = 15;
    this.weaponGroup.position.x += (targetX - this.weaponGroup.position.x) * lerpSpeed * delta;
    this.weaponGroup.position.y += (targetY - this.weaponGroup.position.y) * lerpSpeed * delta;
    this.weaponGroup.position.z += (targetZ - this.weaponGroup.position.z) * lerpSpeed * delta;
    this.weaponGroup.rotation.x += (targetRotX - this.weaponGroup.rotation.x) * lerpSpeed * delta;
    this.weaponGroup.rotation.z += (targetRotZ - this.weaponGroup.rotation.z) * lerpSpeed * delta;
  }

  /**
   * Get the world position of the weapon's muzzle for bullet tracer origin
   * Uses the actual muzzle flash position from weapon configuration
   */
  public getMuzzleWorldPosition(): THREE.Vector3 {
    // Update the weapon group's world matrix to get accurate positions
    this.weaponGroup.updateMatrixWorld(true);

    // Get the world position of the muzzle flash (which has weapon-specific offset)
    const worldPos = new THREE.Vector3();
    this.muzzleFlash.getWorldPosition(worldPos);

    return worldPos;
  }

  // Shell Ejection
  private onShellEject?: (position: THREE.Vector3, direction: THREE.Vector3) => void;

  public setShellEjectCallback(callback: (position: THREE.Vector3, direction: THREE.Vector3) => void): void {
    this.onShellEject = callback;
  }

  private getEjectionPortPosition(): THREE.Vector3 {
    // Approximate ejection port on the right side of the weapon
    const offset = new THREE.Vector3(0.15, 0.05, -0.2);
    return offset.applyMatrix4(this.weaponGroup.matrixWorld);
  }

  private getEjectionDirection(): THREE.Vector3 {
    // Eject to the right and slightly up/back
    const dir = new THREE.Vector3(0.8 + Math.random() * 0.4, 0.5 + Math.random() * 0.2, 0.2);
    dir.applyQuaternion(this.camera.quaternion); // Use camera rotation as base
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
}

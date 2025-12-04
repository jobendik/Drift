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
  private camera: THREE.Camera;
  private audioManager: AudioManager;
  private weaponMesh!: THREE.Object3D;

  // Muzzle flash effects (persistent)
  private muzzleFlash!: THREE.Sprite;
  private muzzleFlash2!: THREE.Sprite;
  private muzzleLight!: THREE.PointLight;
  private muzzleFlashTimer: number = 0;
  private muzzleFlashDuration: number = 0.05;

  // State
  public currentWeapon: WeaponType = WeaponType.AK47;
  private weaponStates: Map<WeaponType, WeaponState> = new Map();
  public isZoomed: boolean = false;

  // Recoil & Spread
  private currentRecoil: { x: number; y: number } = { x: 0, y: 0 };
  private targetRecoil: { x: number; y: number } = { x: 0, y: 0 };
  private currentSpread: number = 0;

  // Weapon Animation
  private weaponSwayX: number = 0;
  private weaponSwayY: number = 0;
  private weaponKickZ: number = 0;
  private weaponKickRotX: number = 0;
  private sprintBlend: number = 0;
  private reloadBlend: number = 0;
  private zoomBlend: number = 0; // 0 = hip fire, 1 = fully zoomed

  // Weapon model (placeholder position for now)
  // private weaponOffset: THREE.Vector3 = new THREE.Vector3(0.2, -0.2, -0.5);

  // Callbacks
  private shellEjectCallback?: (pos: THREE.Vector3, dir: THREE.Vector3) => void;
  private zoomCallback?: (isZoomed: boolean) => void;

  // Third-person mode for AI enemies
  private isThirdPerson: boolean = false;
  private thirdPersonParent: THREE.Object3D | null = null;

  constructor(_scene: THREE.Scene, camera: THREE.Camera, _assetManager: AssetManager, audioManager: AudioManager) {
    this.camera = camera;
    this.audioManager = audioManager;

    this.initializeWeaponStates();
    this.loadAllAudio();

    // Initialize muzzle flash effects
    this.initializeMuzzleFlash();

    // Initialize weapon model
    this.resetWeaponState();
  }

  public setShellEjectCallback(callback: (pos: THREE.Vector3, dir: THREE.Vector3) => void): void {
    this.shellEjectCallback = callback;
  }

  public setZoomCallback(callback: (isZoomed: boolean) => void): void {
    this.zoomCallback = callback;
  }

  /**
   * Set zoom/ADS state - only works for sniper weapons (AWP, Sniper)
   * @param zoomed Whether to zoom in or out
   * @returns True if zoom state changed, false otherwise
   */
  public setZoom(zoomed: boolean): boolean {
    // Only allow zoom for sniper-type weapons
    if (this.currentWeapon !== WeaponType.Sniper && this.currentWeapon !== WeaponType.AWP) {
      return false;
    }

    if (this.isZoomed === zoomed) return false;

    this.isZoomed = zoomed;
    
    // Don't instantly hide - let the animation blend handle visibility
    // The weapon will smoothly lower and fade out during zoom transition

    // Notify callback (for HUD scope overlay and FOV)
    if (this.zoomCallback) {
      this.zoomCallback(zoomed);
    }

    return true;
  }

  /**
   * Configure weapon system for third-person view (for AI enemies)
   * @param parent The object to attach the weapon to (e.g., hand bone)
   */
  public setThirdPersonMode(parent: THREE.Object3D): void {
    this.isThirdPerson = true;
    this.thirdPersonParent = parent;
    
    // Re-attach current weapon to new parent with third-person positioning
    if (this.weaponMesh) {
      if (this.weaponMesh.parent) {
        this.weaponMesh.parent.remove(this.weaponMesh);
      }
      
      // Scale down for third-person and position in hand
      this.weaponMesh.scale.set(0.7, 0.7, 0.7);
      this.weaponMesh.position.set(0, 0, 0);
      this.weaponMesh.rotation.set(0, Math.PI, 0); // Flip to face forward
      
      parent.add(this.weaponMesh);
    }
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

  private initializeMuzzleFlash(): void {
    const initialConfig = WEAPON_CONFIG[this.currentWeapon];
    const initialPos = initialConfig.muzzle.position;

    // Primary muzzle flash sprite
    const spriteMat = new THREE.SpriteMaterial({
      color: 0xffffaa,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
    });
    this.muzzleFlash = new THREE.Sprite(spriteMat);
    this.muzzleFlash.scale.set(0.3, 0.3, 1);
    this.muzzleFlash.position.set(initialPos.x, initialPos.y, initialPos.z);

    // Secondary muzzle flash sprite (for depth)
    const spriteMat2 = new THREE.SpriteMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
    });
    this.muzzleFlash2 = new THREE.Sprite(spriteMat2);
    this.muzzleFlash2.scale.set(0.2, 0.2, 1);
    this.muzzleFlash2.position.set(initialPos.x, initialPos.y, initialPos.z - 0.02);

    // Muzzle light
    this.muzzleLight = new THREE.PointLight(initialConfig.muzzle.lightColor, 0, initialConfig.muzzle.lightRange);
    this.muzzleLight.position.copy(this.muzzleFlash.position);
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
    // Unzoom when switching weapons
    if (this.isZoomed) {
      this.setZoom(false);
    }

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
    // Calculate muzzle position: weapon base position + muzzle offset from weapon config
    const config = WEAPON_CONFIG[this.currentWeapon];
    const muzzleOffset = config.muzzle.position;

    // Start with weapon base position in first-person (relative to camera)
    // Weapon position is (0.25, -0.25, -0.4) relative to camera
    const weaponBasePos = new THREE.Vector3(0.25, -0.25, -0.4);
    
    // Add muzzle offset (relative to weapon)
    // Note: muzzle z should be negative to be forward of weapon
    const muzzlePos = weaponBasePos.clone();
    muzzlePos.x += muzzleOffset.x;
    muzzlePos.y += muzzleOffset.y;
    muzzlePos.z += muzzleOffset.z; // muzzle.z is typically negative (forward)
    
    // Transform from camera-local space to world space
    muzzlePos.applyMatrix4(this.camera.matrixWorld);

    return muzzlePos;
  }

  /**
   * Get the ejection port position (right side of weapon, where shells eject from)
   */
  private getEjectionPortPosition(): THREE.Vector3 {
    // Start with weapon base position (relative to camera)
    const weaponBasePos = new THREE.Vector3(0.25, -0.25, -0.4);
    
    // Ejection port is on the right side of the weapon, behind the muzzle
    // Offset: right +0.08, up +0.05, slight forward -0.1 (relative to weapon base)
    weaponBasePos.x += 0.08;  // Right side
    weaponBasePos.y += 0.05;  // Slightly above weapon center
    weaponBasePos.z += -0.1;  // Slightly forward of weapon center
    
    // Transform to world space
    weaponBasePos.applyMatrix4(this.camera.matrixWorld);
    return weaponBasePos;
  }

  /**
   * Get the shell ejection direction (right, up, and slightly back)
   */
  private getEjectionDirection(): THREE.Vector3 {
    // Shells eject to the right, upward, and slightly backward
    // Add randomization for natural variation
    const dir = new THREE.Vector3(
      0.8 + Math.random() * 0.4,   // Right (0.8-1.2)
      0.5 + Math.random() * 0.3,   // Up (0.5-0.8)
      0.1 + Math.random() * 0.2    // Slightly back (0.1-0.3)
    );
    dir.applyQuaternion(this.camera.quaternion);
    return dir.normalize();
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

    // Apply recoil (includes weapon visual kick)
    this.applyRecoil(config.recoil);

    // Increase spread
    this.currentSpread = Math.min(
      this.currentSpread + config.spread.increasePerShot,
      config.spread.max
    );

    // Trigger muzzle flash
    this.triggerMuzzleFlash();

    // Eject shell from ejection port (right side of weapon)
    if (this.shellEjectCallback) {
      const ejectionPos = this.getEjectionPortPosition();
      const ejectionDir = this.getEjectionDirection();
      this.shellEjectCallback(ejectionPos, ejectionDir);
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

  private applyRecoil(recoilConfig: { pitchAmount: number; yawAmount: number; kickZ: number; kickRotX: number }): void {
    // Camera recoil
    this.targetRecoil.x += (Math.random() - 0.5) * recoilConfig.yawAmount;
    this.targetRecoil.y += recoilConfig.pitchAmount;

    // Weapon visual kick from config
    this.weaponKickZ = recoilConfig.kickZ;
    this.weaponKickRotX = (recoilConfig.kickRotX * Math.PI) / 180; // Convert degrees to radians
    
    console.log('Recoil applied - kickZ:', this.weaponKickZ, 'kickRotX:', this.weaponKickRotX, 'config:', recoilConfig);
  }

  private triggerMuzzleFlash(): void {
    const config = WEAPON_CONFIG[this.currentWeapon];

    // Set flash active
    this.muzzleFlashTimer = config.muzzle.flashDuration;
    this.muzzleFlashDuration = config.muzzle.flashDuration;

    // Set initial opacity
    (this.muzzleFlash.material as THREE.SpriteMaterial).opacity = 1.2;
    (this.muzzleFlash2.material as THREE.SpriteMaterial).opacity = 0.9;
    
    // Set light intensity
    this.muzzleLight.intensity = config.muzzle.lightIntensity;

    // Randomize rotation for variety
    this.muzzleFlash.material.rotation = Math.random() * Math.PI * 2;
    this.muzzleFlash2.material.rotation = Math.random() * Math.PI * 2;
  }

  public reload(): void {
    const state = this.weaponStates.get(this.currentWeapon);
    const config = WEAPON_CONFIG[this.currentWeapon];

    if (!state || !config || state.isReloading || state.currentMag === config.magSize || state.reserveAmmo <= 0) {
      return;
    }

    // Unzoom if reloading while zoomed
    if (this.isZoomed) {
      this.setZoom(false);
    }

    state.isReloading = true;
    state.reloadStartTime = performance.now();

    if (config.audio.reload) {
      this.audioManager.playSound(config.audio.reload, 'sfx', { volume: 0.5 });
    }
  }

  public update(deltaTime: number, mouseMovement: { x: number, y: number }, isSprinting: boolean, headBobTime: number = 0): void {
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

    // Weapon kickback recovery
    this.weaponKickZ *= 1 - 5 * deltaTime;
    this.weaponKickRotX *= 1 - 5 * deltaTime;

		// Weapon sway (follows mouse movement with lag)
		const swayAmount = 0.01; // How much weapon lags behind mouse
		const swayRecovery = 8; // How fast it returns to center
		this.weaponSwayX += (mouseMovement.x * swayAmount - this.weaponSwayX) * swayRecovery * deltaTime;
		this.weaponSwayY += (mouseMovement.y * swayAmount - this.weaponSwayY) * swayRecovery * deltaTime;    // Sprint blend
    const targetSprint = isSprinting ? 1 : 0;
    this.sprintBlend += (targetSprint - this.sprintBlend) * 8 * deltaTime;

    // Reload blend
    const targetReload = state.isReloading ? 1 : 0;
    this.reloadBlend += (targetReload - this.reloadBlend) * 8 * deltaTime;

    // Zoom blend (smooth transition for scope animation)
    const targetZoom = this.isZoomed ? 1 : 0;
    this.zoomBlend += (targetZoom - this.zoomBlend) * 10 * deltaTime; // Slightly faster for snappy feel

    // Update muzzle flash
    if (this.muzzleFlashTimer > 0) {
      this.muzzleFlashTimer -= deltaTime;
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
        this.muzzleFlash.material.rotation += deltaTime * 10;
        this.muzzleFlash2.material.rotation -= deltaTime * 10;
      }
    }

    // Update weapon transform (position and rotation)
    this.updateWeaponTransform(deltaTime, headBobTime);
  }

  private updateWeaponTransform(delta: number, headBobTime: number): void {
    if (!this.weaponMesh) return;
    
    // Skip FPS-style animations for third-person mode
    if (this.isThirdPerson) {
      // Simple kickback for third-person
      const kickZ = this.weaponKickZ * 0.5; // Reduced kickback
      this.weaponMesh.position.z = kickZ;
      return;
    }

    // Hide weapon smoothly when fully zoomed
    // Start hiding at 70% zoom progress for smooth transition
    const hideThreshold = 0.7;
    if (this.zoomBlend > hideThreshold) {
      const hideProgress = (this.zoomBlend - hideThreshold) / (1 - hideThreshold);
      this.weaponMesh.visible = hideProgress < 0.99;
    } else {
      this.weaponMesh.visible = true;
    }

    // Base position
    let targetX = 0.25 - this.weaponSwayX;
    let targetY = -0.25 - this.weaponSwayY;
    let targetZ = -0.4;

    // Weapon bob (breathing/walking motion) - reduce during zoom
    const bobInfluence = 1.0 - this.zoomBlend * 0.8; // Less bob when zooming
    const bobX = Math.cos(headBobTime * 0.5) * 0.015 * bobInfluence;
    const bobY = Math.sin(headBobTime) * 0.035 * bobInfluence;
    targetX += bobX;
    targetY += bobY;

    // Kickback from shooting
    targetZ += this.weaponKickZ;

    // Sprint offset (lower and to the side)
    targetX += 0.1 * this.sprintBlend;
    targetY -= 0.2 * this.sprintBlend;

    // Reload offset (dip down)
    targetY -= 0.15 * this.reloadBlend;

    // Zoom animation: weapon raises up to bring scope to eye level
    // Also moves forward and centers for proper ADS position
    targetY += 0.15 * this.zoomBlend;  // Raise the weapon up
    targetZ -= 0.2 * this.zoomBlend;   // Pull forward toward eye
    targetX -= 0.15 * this.zoomBlend;  // Center the weapon

    // Rotation
    let targetRotX = -this.weaponKickRotX + (0.3 * this.reloadBlend);
    let targetRotZ = (0.2 * this.sprintBlend);
    
    // Zoom rotation: tilt weapon slightly to align scope
    targetRotX += 0.1 * this.zoomBlend;

    // Smooth lerp to target
    const lerpSpeed = 15;
    this.weaponMesh.position.x += (targetX - this.weaponMesh.position.x) * lerpSpeed * delta;
    this.weaponMesh.position.y += (targetY - this.weaponMesh.position.y) * lerpSpeed * delta;
    this.weaponMesh.position.z += (targetZ - this.weaponMesh.position.z) * lerpSpeed * delta;
    this.weaponMesh.rotation.x += (targetRotX - this.weaponMesh.rotation.x) * lerpSpeed * delta;
    this.weaponMesh.rotation.z += (targetRotZ - this.weaponMesh.rotation.z) * lerpSpeed * delta;
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

    // Add muzzle effects to weapon
    const config = WEAPON_CONFIG[this.currentWeapon];
    const pos = config.muzzle.position;
    
    this.muzzleFlash.position.set(pos.x, pos.y, pos.z);
    this.muzzleFlash2.position.set(pos.x, pos.y, pos.z - 0.02);
    this.muzzleLight.position.copy(this.muzzleFlash.position);
    this.muzzleLight.color.setHex(config.muzzle.lightColor);
    this.muzzleLight.distance = config.muzzle.lightRange;

    this.weaponMesh.add(this.muzzleFlash);
    this.weaponMesh.add(this.muzzleFlash2);
    this.weaponMesh.add(this.muzzleLight);

    // Attach to appropriate parent based on mode
    if (this.isThirdPerson && this.thirdPersonParent) {
      // Third-person mode: attach to hand bone with appropriate transform
      this.weaponMesh.scale.set(0.7, 0.7, 0.7);
      this.weaponMesh.position.set(0, 0, 0);
      this.weaponMesh.rotation.set(0, Math.PI, 0); // Face forward
      this.thirdPersonParent.add(this.weaponMesh);
      console.log('DEBUG: Weapon added to third-person parent');
    } else {
      // First-person mode: attach to camera
      this.weaponMesh.scale.set(1.0, 1.0, 1.0);
      this.weaponMesh.position.set(0.25, -0.25, -0.4);
      this.camera.add(this.weaponMesh);
      console.log('DEBUG: Weapon added to camera. Weapon UUID:', this.weaponMesh.uuid);
      console.log('DEBUG: Camera UUID:', this.camera.uuid);
    }
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

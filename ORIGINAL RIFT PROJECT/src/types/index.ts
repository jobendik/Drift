export interface PlayerConfig {
  maxHealth: number;
  maxArmor: number;
  maxStamina: number;
  height: number;
  walkSpeed: number;
  sprintSpeed: number;
  jumpForce: number;
  gravity: number;
  groundAccel: number;
  airAccel: number;
  groundDecel: number;
  airDecel: number;
  jumpBuffer: number;
  coyoteTime: number;
  jumpCutMultiplier: number;
  stepHeight: number;
  staminaDrain: number;
  staminaRegen: number;
  slideSpeed: number;
  slideDuration: number;
  slideFriction: number;
  slideCooldown: number;
}

export interface CameraConfig {
  baseFOV: number;
  sprintFOV: number;
  jumpFOV: number;
  landFOV: number;
  fovLerpSpeed: number;
  bobFrequency: number;
  bobAmplitudeX: number;
  bobAmplitudeY: number;
  breathFrequency: number;
  breathAmplitude: number;
  jumpStretch: number;
  mouseSensitivity: number;
}

export interface ArenaConfig {
  size: number;
  wallHeight: number;
}

export enum WeaponType {
  AK47 = 'AK47',
  AWP = 'AWP',
  LMG = 'LMG',
  M4 = 'M4',
  Pistol = 'Pistol',
  Scar = 'Scar',
  Shotgun = 'Shotgun',
  Sniper = 'Sniper',
  Tec9 = 'Tec9'
}

export interface WeaponStats {
  name: string;
  damage: number;
  fireRate: number;
  magSize: number;
  reserveAmmo: number;
  reloadTime: number;
  automatic: boolean;
  pelletCount?: number; // For shotguns - number of pellets per shot
  falloff?: {
    startDistance: number;
    endDistance: number;
    minDamage: number;
  };
  audio: {
    fire: string;
    reload: string;
    load?: string;
    cock?: string;
    tail?: string;
    zoom?: string;
  };
  recoil: {
    pitchAmount: number;
    pitchRandom: number;
    yawAmount: number;
    yawRandom: number;
    recoveryRate: number;
    kickZ: number;
    kickRotX: number;
  };
  spread: {
    base: number;
    max: number;
    increasePerShot: number;
    recoveryRate: number;
  };
  muzzle: {
    lightColor: number;
    lightRange: number;
    flashScale: { min: number; max: number };
    flashDuration: number;
    lightIntensity: number;
    smokeParticles: number;
    smokeSpeed: number;
    position: { x: number; y: number; z: number };
  };
  sprayPattern: {
    enabled: boolean;
    resetTime: number;
    scale: number;
    vertical: number[];
    horizontal: number[];
  };
  screen: {
    maxFovPunch: number;
    fovPunch: number;
    shakeIntensity: number;
    maxChroma: number;
    chromaIntensity: number;
    shakeDecay: number;
    fovPunchRecovery: number;
    chromaDecay: number;
  };
  animation: {
    swayAmount: number;
    swayRecovery: number;
    sprintLerpSpeed: number;
    reloadLerpSpeed: number;
    baseX: number;
    baseY: number;
    baseZ: number;
    bobInfluence: number;
    sprintOffsetX: number;
    sprintOffsetY: number;
    reloadDipY: number;
    reloadRotX: number;
    sprintRotZ: number;
  };
}

export type WeaponConfig = Record<WeaponType, WeaponStats>;

export interface EnemyType {
  health: number;
  speed: number;
  damage: number;
  fireRate: number;
  accuracy: number;
  color: number;
  score: number;
}

export interface GameState {
  running: boolean;
  paused: boolean;
  wave: number;
  score: number;
  kills: number;
  shotsFired: number;
  shotsHit: number;
  timeStarted: number;
  waveInProgress: boolean;
  betweenWaves: boolean;
  inStartScreen: boolean;
}

// Surface materials for impact system
export { SurfaceMaterial } from '../systems/ImpactSystem';

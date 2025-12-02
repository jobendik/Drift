// RIFT Integration - Game Configuration

import { PlayerConfig, CameraConfig } from '../types';

export const PLAYER_CONFIG: PlayerConfig = {
  maxHealth: 100,
  maxArmor: 100,
  maxStamina: 100,
  height: 1.7,
  walkSpeed: 8,
  sprintSpeed: 13,
  jumpForce: 12,
  gravity: 35,
  groundAccel: 50,
  airAccel: 20,
  groundDecel: 30,
  airDecel: 5,
  jumpBuffer: 0.1,
  coyoteTime: 0.15,
  jumpCutMultiplier: 0.5,
  stepHeight: 0.5,
  staminaDrain: 20,
  staminaRegen: 30,
  slideSpeed: 18,
  slideDuration: 1.0,
  slideFriction: 2.5,
  slideCooldown: 1.0,
};

export const CAMERA_CONFIG: CameraConfig = {
  baseFOV: 75,
  sprintFOV: 85,
  jumpFOV: 78,
  landFOV: 70,
  fovLerpSpeed: 10,
  bobFrequency: 12,
  bobAmplitudeX: 0.015,
  bobAmplitudeY: 0.035,
  breathFrequency: 2,
  breathAmplitude: 0.005,
  jumpStretch: 0.2,
  mouseSensitivity: 0.002,
};

export const ARENA_CONFIG = {
  size: 60,
  wallHeight: 8,
};

export const LOBBY_URL = '/social/';

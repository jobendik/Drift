import * as THREE from 'three';

export enum DamageType {
  Bullet,
  Explosive,
  Melee,
  Environment,
  Fall
}

export interface DamageInfo {
  amount: number;
  sourcePosition?: THREE.Vector3;
  type: DamageType;
  instigator?: any; // Could be Player or Enemy
  hitLocation?: 'head' | 'body' | 'limb';
  knockbackForce?: number;
}

export interface Damageable {
  health: number;
  maxHealth: number;
  takeDamage(info: DamageInfo): void;
  isDead(): boolean;
}

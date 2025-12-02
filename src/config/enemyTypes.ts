// RIFT Integration - Enemy Type Configurations

export interface EnemyType {
  health: number;
  speed: number;
  damage: number;
  fireRate: number;
  accuracy: number;
  color: number;
  score: number;
}

export const ENEMY_TYPES: Record<string, EnemyType> = {
  grunt: {
    health: 40,
    speed: 4,
    damage: 10,
    fireRate: 1,
    accuracy: 0.05,
    color: 0x00FFFF, // Cyan
    score: 100,
  },
  shooter: {
    health: 60,
    speed: 5,
    damage: 15,
    fireRate: 2,
    accuracy: 0.02,
    color: 0x9D00FF, // Purple
    score: 200,
  },
  heavy: {
    health: 200,
    speed: 2,
    damage: 25,
    fireRate: 0.5,
    accuracy: 0.05,
    color: 0xFF0000, // Red
    score: 300,
  },
  swarmer: {
    health: 30,
    speed: 9, // Very fast
    damage: 15, // Melee damage
    fireRate: 0, // Melee only
    accuracy: 1,
    color: 0xFF5500, // Orange
    score: 50,
  },
  viper: {
    health: 50,
    speed: 6,
    damage: 40,
    fireRate: 0.5,
    accuracy: 0.001, // Pinpoint
    color: 0x00FF88, // Green
    score: 250,
  },
  bulwark: {
    health: 300,
    speed: 1.5,
    damage: 20,
    fireRate: 1,
    accuracy: 0.1,
    color: 0x0066FF, // Blue
    score: 400,
  },
  spectre: {
    health: 40,
    speed: 7,
    damage: 25,
    fireRate: 0, // Melee/Close range
    accuracy: 1,
    color: 0x5555FF, // Ghost Blue
    score: 350,
  },
  razor: {
    health: 80,
    speed: 8,
    damage: 30,
    fireRate: 0, // Melee
    accuracy: 1,
    color: 0xFF00FF, // Magenta
    score: 300,
  },
};

// Wave composition helpers
export function getWaveEnemies(wave: number): Array<{ type: string; count: number }> {
  const baseCount = 3 + Math.floor(wave * 1.5);
  
  if (wave <= 2) {
    return [{ type: 'grunt', count: baseCount }];
  } else if (wave <= 4) {
    return [
      { type: 'grunt', count: Math.floor(baseCount * 0.7) },
      { type: 'shooter', count: Math.floor(baseCount * 0.3) },
    ];
  } else if (wave <= 6) {
    return [
      { type: 'grunt', count: Math.floor(baseCount * 0.5) },
      { type: 'shooter', count: Math.floor(baseCount * 0.3) },
      { type: 'swarmer', count: Math.floor(baseCount * 0.2) },
    ];
  } else if (wave <= 8) {
    return [
      { type: 'grunt', count: Math.floor(baseCount * 0.3) },
      { type: 'shooter', count: Math.floor(baseCount * 0.3) },
      { type: 'heavy', count: Math.floor(baseCount * 0.2) },
      { type: 'swarmer', count: Math.floor(baseCount * 0.2) },
    ];
  } else {
    // Late waves - mix everything
    return [
      { type: 'grunt', count: Math.floor(baseCount * 0.2) },
      { type: 'shooter', count: Math.floor(baseCount * 0.2) },
      { type: 'heavy', count: Math.floor(baseCount * 0.15) },
      { type: 'swarmer', count: Math.floor(baseCount * 0.15) },
      { type: 'viper', count: Math.floor(baseCount * 0.1) },
      { type: 'bulwark', count: Math.floor(baseCount * 0.1) },
      { type: 'spectre', count: Math.floor(baseCount * 0.05) },
      { type: 'razor', count: Math.floor(baseCount * 0.05) },
    ];
  }
}

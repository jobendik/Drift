// RIFT Integration - Game Mode Interface

/**
 * Interface that all game modes must implement
 */
export interface IGameMode {
  /** Initialize the game mode (setup) */
  init(): void;
  
  /** Start the game mode (begin gameplay) */
  start(): void;
  
  /** Update the game mode each frame */
  update(delta: number): void;
  
  /** Clean up the game mode when switching/ending */
  cleanup(): void;
  
  /** Get the display name of the mode */
  getName(): string;
  
  /** Get the mode type identifier */
  getType(): GameModeType;
  
  /** Check if the game is over */
  isGameOver(): boolean;
  
  /** Handle player death */
  onPlayerDeath(playerId: string): void;
  
  /** Handle player kill */
  onPlayerKill(killerId: string, victimId: string, weapon: string, headshot: boolean): void;
}

/**
 * Available game mode types
 */
export enum GameModeType {
  FREE_FOR_ALL = 'FREE_FOR_ALL',
  TEAM_DEATHMATCH = 'TEAM_DEATHMATCH',
  CAPTURE_THE_FLAG = 'CAPTURE_THE_FLAG',
  WAVE_SURVIVAL = 'WAVE_SURVIVAL',
  PRACTICE = 'PRACTICE',
}

/**
 * Team identifiers
 */
export enum Team {
  NONE = 'NONE',
  RED = 'RED',
  BLUE = 'BLUE',
}

/**
 * Game mode configuration
 */
export interface GameModeConfig {
  name: string;
  type: GameModeType;
  description: string;
  minPlayers: number;
  maxPlayers: number;
  timeLimit?: number; // seconds, 0 = unlimited
  scoreLimit?: number; // 0 = unlimited
  respawnTime?: number; // seconds
  teamBased: boolean;
  friendlyFire: boolean;
}

/**
 * Player score data
 */
export interface PlayerScore {
  id: string;
  name: string;
  team: Team;
  kills: number;
  deaths: number;
  assists: number;
  score: number;
  headshots: number;
  damageDealt: number;
}

/**
 * Game state for modes
 */
export interface GameModeState {
  isRunning: boolean;
  isPaused: boolean;
  timeRemaining: number;
  redScore: number;
  blueScore: number;
  wave: number;
  roundNumber: number;
  scores: Map<string, PlayerScore>;
}

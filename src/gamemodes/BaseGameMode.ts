// RIFT Integration - Base Game Mode

import { 
  IGameMode, 
  GameModeType, 
  GameModeConfig, 
  GameModeState, 
  PlayerScore, 
  Team 
} from './IGameMode';
import { HUDManager } from '../ui/HUDManager';

// Forward declare World type to avoid circular dependency
interface World {
  player: {
    uuid: string;
    health: number;
    maxHealth: number;
    respawn: () => void;
  };
  competitors: Array<{
    uuid: string;
    name: string;
    health: number;
  }>;
  spawningManager: {
    respawnCompetitor: (entity: unknown) => void;
  };
}

/**
 * Base class for all game modes
 * Provides common functionality and structure
 */
export abstract class BaseGameMode implements IGameMode {
  protected world: World;
  protected hudManager: HUDManager;
  protected config: GameModeConfig;
  protected state: GameModeState;
  protected isActive: boolean = false;

  constructor(world: World, hudManager: HUDManager, config: GameModeConfig) {
    this.world = world;
    this.hudManager = hudManager;
    this.config = config;
    
    this.state = {
      isRunning: false,
      isPaused: false,
      timeRemaining: config.timeLimit || 0,
      redScore: 0,
      blueScore: 0,
      wave: 1,
      roundNumber: 1,
      scores: new Map(),
    };
  }

  public init(): void {
    console.log(`Initializing ${this.getName()} mode...`);
    this.resetState();
    this.setupHUD();
  }

  public start(): void {
    console.log(`Starting ${this.getName()} mode...`);
    this.isActive = true;
    this.state.isRunning = true;
    this.hudManager.showMessage(`${this.getName()} Started!`, 3000);
  }

  public update(delta: number): void {
    if (!this.isActive || !this.state.isRunning || this.state.isPaused) {
      return;
    }

    // Update time if time-limited
    if (this.config.timeLimit && this.config.timeLimit > 0) {
      this.state.timeRemaining -= delta;
      this.updateTimer();

      if (this.state.timeRemaining <= 0) {
        this.onTimeUp();
      }
    }

    // Check score limit
    if (this.config.scoreLimit && this.config.scoreLimit > 0) {
      if (this.checkScoreLimit()) {
        this.onScoreLimitReached();
      }
    }
  }

  public cleanup(): void {
    console.log(`Cleaning up ${this.getName()} mode...`);
    this.isActive = false;
    this.state.isRunning = false;
    this.hideHUD();
  }

  public abstract getName(): string;
  public abstract getType(): GameModeType;

  public isGameOver(): boolean {
    return !this.state.isRunning;
  }

  public onPlayerDeath(playerId: string): void {
    const score = this.state.scores.get(playerId);
    if (score) {
      score.deaths++;
      this.state.scores.set(playerId, score);
    }

    // Schedule respawn if applicable
    if (this.config.respawnTime !== undefined) {
      setTimeout(() => {
        this.respawnPlayer(playerId);
      }, this.config.respawnTime * 1000);
    }
  }

  public onPlayerKill(
    killerId: string,
    victimId: string,
    weapon: string,
    headshot: boolean
  ): void {
    // Update killer score
    const killerScore = this.state.scores.get(killerId);
    if (killerScore) {
      killerScore.kills++;
      killerScore.score += headshot ? 150 : 100;
      if (headshot) {
        killerScore.headshots++;
      }
      this.state.scores.set(killerId, killerScore);
    }

    // Add to killfeed
    const killerName = this.getPlayerName(killerId);
    const victimName = this.getPlayerName(victimId);
    this.hudManager.addKillFeed(killerName, victimName, weapon, headshot);

    // Show hitmarker/kill feedback if local player got the kill
    if (killerId === this.world.player.uuid) {
      this.hudManager.showHitmarker(true);
      this.hudManager.showKillIcon();
    }
  }

  // ========== Protected Methods ==========

  protected resetState(): void {
    this.state = {
      isRunning: false,
      isPaused: false,
      timeRemaining: this.config.timeLimit || 0,
      redScore: 0,
      blueScore: 0,
      wave: 1,
      roundNumber: 1,
      scores: new Map(),
    };

    // Initialize player scores
    this.initializePlayerScores();
  }

  protected initializePlayerScores(): void {
    // Add local player
    this.state.scores.set(this.world.player.uuid, this.createEmptyScore(
      this.world.player.uuid,
      'Player',
      Team.NONE
    ));

    // Add competitors (bots/enemies)
    for (const competitor of this.world.competitors) {
      if (competitor.uuid !== this.world.player.uuid) {
        this.state.scores.set(competitor.uuid, this.createEmptyScore(
          competitor.uuid,
          competitor.name || `Bot_${competitor.uuid.slice(0, 4)}`,
          Team.NONE
        ));
      }
    }
  }

  protected createEmptyScore(id: string, name: string, team: Team): PlayerScore {
    return {
      id,
      name,
      team,
      kills: 0,
      deaths: 0,
      assists: 0,
      score: 0,
      headshots: 0,
      damageDealt: 0,
    };
  }

  protected getPlayerName(playerId: string): string {
    const score = this.state.scores.get(playerId);
    if (score) {
      return score.name;
    }
    return playerId === this.world.player.uuid ? 'You' : `Player_${playerId.slice(0, 4)}`;
  }

  protected setupHUD(): void {
    // Override in subclasses for mode-specific HUD
  }

  protected hideHUD(): void {
    // Override in subclasses for mode-specific HUD cleanup
  }

  protected updateTimer(): void {
    // Format time as MM:SS
    const minutes = Math.floor(Math.max(0, this.state.timeRemaining) / 60);
    const seconds = Math.floor(Math.max(0, this.state.timeRemaining) % 60);
    const timerElement = document.getElementById('game-timer');
    if (timerElement) {
      timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  }

  protected checkScoreLimit(): boolean {
    // Override in subclasses
    return false;
  }

  protected onTimeUp(): void {
    this.endGame('TIME UP');
  }

  protected onScoreLimitReached(): void {
    this.endGame('SCORE LIMIT REACHED');
  }

  protected endGame(reason: string): void {
    this.state.isRunning = false;
    const winner = this.determineWinner();
    this.hudManager.showMessage(`${reason}\n${winner}`, 5000);
  }

  protected determineWinner(): string {
    // Override in subclasses for mode-specific win conditions
    let highestScore = -1;
    let winnerName = 'No Winner';

    this.state.scores.forEach((score, _id) => {
      if (score.score > highestScore) {
        highestScore = score.score;
        winnerName = score.name;
      }
    });

    return `Winner: ${winnerName} (${highestScore} points)`;
  }

  protected respawnPlayer(playerId: string): void {
    if (playerId === this.world.player.uuid) {
      // Respawn local player
      if (this.world.player.respawn) {
        this.world.player.respawn();
      }
    } else {
      // Find and respawn competitor
      const competitor = this.world.competitors.find(c => c.uuid === playerId);
      if (competitor) {
        this.world.spawningManager.respawnCompetitor(competitor);
      }
    }
  }

  // ========== Public Getters ==========

  public getState(): GameModeState {
    return { ...this.state };
  }

  public getConfig(): GameModeConfig {
    return { ...this.config };
  }

  public getScores(): PlayerScore[] {
    return Array.from(this.state.scores.values()).sort((a, b) => b.score - a.score);
  }

  public pause(): void {
    this.state.isPaused = true;
  }

  public resume(): void {
    this.state.isPaused = false;
  }
}

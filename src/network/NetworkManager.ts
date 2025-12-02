// RIFT Integration - Network Manager
// Handles multiplayer networking via Socket.IO

import * as THREE from 'three';
import { 
  NetworkConfig, 
  DEFAULT_NETWORK_CONFIG, 
  NetworkMatchState,
} from './types';
import { RemotePlayer } from './RemotePlayer';

// Socket.IO types (dynamic import for optional multiplayer)
interface Socket {
  connected: boolean;
  emit: (event: string, data?: unknown) => void;
  on: (event: string, callback: (...args: unknown[]) => void) => void;
  off: (event: string, callback?: (...args: unknown[]) => void) => void;
}

type IoFunction = (url: string, options: unknown) => Socket;

/**
 * Network Manager - Handles all multiplayer networking
 * 
 * Features:
 * - Socket.IO connection management
 * - Player state synchronization
 * - Remote player management
 * - Kill/damage events
 * - Team management
 */
export class NetworkManager {
  private socket: Socket | null = null;
  private config: NetworkConfig;
  private scene: THREE.Scene;

  // Remote players
  private remotePlayers: Map<string, RemotePlayer> = new Map();
  private deadPlayers: Set<string> = new Set();

  // Local player info
  public myUserId: string = '';
  public myTeam: string = '';
  public playerTeams: Map<string, string> = new Map();

  // Match state
  private matchId: string = '';
  private matchState: NetworkMatchState | null = null;

  // Update timing
  private lastUpdate: number = 0;

  // Event callbacks
  private onKillCallback?: (attackerId: string, victimId: string, weaponType: string) => void;
  private onDamageCallback?: (targetId: string, attackerId: string, damage: number) => void;
  private onMatchEndCallback?: (state: NetworkMatchState) => void;
  private onScoreUpdateCallback?: (state: NetworkMatchState) => void;

  // Socket.IO reference (loaded dynamically)
  private io: IoFunction | null = null;

  constructor(scene: THREE.Scene, config?: Partial<NetworkConfig>) {
    this.scene = scene;
    this.config = { ...DEFAULT_NETWORK_CONFIG, ...config };
  }

  /**
   * Initialize network connection
   */
  public async connect(token: string, matchId: string = 'default_match'): Promise<boolean> {
    if (this.socket?.connected) {
      console.log('Already connected');
      return true;
    }

    this.matchId = matchId;
    this.myUserId = this.extractUserId(token);

    try {
      // Dynamically import socket.io-client
      // @ts-ignore - socket.io-client is an optional dependency
      const socketIo = await import('socket.io-client');
      this.io = socketIo.io || socketIo.default?.io;

      if (!this.io) {
        throw new Error('socket.io-client not properly loaded');
      }

      console.log('Connecting to game server...');
      
      this.socket = this.io(this.config.serverUrl, {
        auth: { token },
        transports: ['websocket'],
      });

      this.setupListeners();
      return true;
    } catch (error) {
      console.warn('Socket.IO not available, multiplayer disabled:', error);
      return false;
    }
  }

  /**
   * Extract user ID from token
   */
  private extractUserId(token: string): string {
    const parts = token.split('-');
    return parts[parts.length - 1] || '0';
  }

  /**
   * Setup socket event listeners
   */
  private setupListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Connected to game server');
      this.socket?.emit('join_match', this.matchId);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from game server');
    });

    this.socket.on('player_joined', (data: unknown) => {
      const { userId, team } = data as { userId: string; team?: string };
      console.log(`Player ${userId} joined (${team || 'no team'})`);

      if (team) {
        this.playerTeams.set(userId, team);
      }

      if (userId !== this.myUserId && !this.remotePlayers.has(userId)) {
        this.addRemotePlayer(userId);
      }
    });

    this.socket.on('player_update', (data: unknown) => {
      const { userId, position, rotation, isSprinting, isGrounded } = data as {
        userId: string;
        position: { x: number; y: number; z: number };
        rotation: { x: number; y: number };
        isSprinting: boolean;
        isGrounded: boolean;
      };

      const userIdStr = String(userId);

      // Ignore dead players and self
      if (this.deadPlayers.has(userIdStr) || userIdStr === this.myUserId) {
        return;
      }

      let remotePlayer = this.remotePlayers.get(userIdStr);
      if (!remotePlayer) {
        remotePlayer = this.addRemotePlayer(userIdStr);
      }

      remotePlayer.updateState(position, rotation, isSprinting, isGrounded);
    });

    this.socket.on('player_shoot', (data: unknown) => {
      const { userId } = data as { userId: string };
      console.log(`Player ${userId} shot`);
      // TODO: Show muzzle flash/tracer for remote player
    });

    this.socket.on('player_damaged', (data: unknown) => {
      const { targetId, attackerId, damage } = data as {
        targetId: string;
        attackerId: string;
        damage: number;
      };

      console.log(`Player ${targetId} took ${damage} damage from ${attackerId}`);

      if (String(targetId) === this.myUserId && this.onDamageCallback) {
        this.onDamageCallback(targetId, attackerId, damage);
      }
    });

    this.socket.on('player_killed', (data: unknown) => {
      const { victimId, attackerId, weaponType } = data as {
        victimId: string;
        attackerId: string;
        weaponType: string;
      };

      console.log(`Player ${victimId} killed by ${attackerId} with ${weaponType}`);

      const victimIdStr = String(victimId);
      this.deadPlayers.add(victimIdStr);

      // Remove dead player mesh
      const deadPlayer = this.remotePlayers.get(victimIdStr);
      if (deadPlayer) {
        deadPlayer.die();
        setTimeout(() => {
          deadPlayer.destroy();
          this.remotePlayers.delete(victimIdStr);
        }, 2000);
      }

      // Trigger callback
      if (this.onKillCallback) {
        this.onKillCallback(attackerId, victimId, weaponType);
      }
    });

    this.socket.on('player_respawned', (data: unknown) => {
      const { userId, team } = data as { userId: string; team?: string };
      const userIdStr = String(userId);
      
      console.log(`Player ${userIdStr} respawned (${team || 'no team'})`);

      if (team) {
        this.playerTeams.set(userIdStr, team);
      }

      this.deadPlayers.delete(userIdStr);

      if (userIdStr !== this.myUserId && !this.remotePlayers.has(userIdStr)) {
        this.addRemotePlayer(userIdStr);
      }
    });

    this.socket.on('match_state', (state: unknown) => {
      console.log('Received match state:', state);
      this.matchState = state as NetworkMatchState;

      // Sync teams
      if (this.matchState.teams) {
        Object.entries(this.matchState.teams).forEach(([uid, team]) => {
          this.playerTeams.set(uid, team);
          if (uid === this.myUserId) {
            this.myTeam = team;
          } else {
            const rp = this.remotePlayers.get(uid);
            if (rp) rp.setTeam(team);
          }
        });
      }

      if (this.onScoreUpdateCallback) {
        this.onScoreUpdateCallback(this.matchState);
      }
    });

    this.socket.on('score_update', (state: unknown) => {
      console.log('Score update:', state);
      this.matchState = state as NetworkMatchState;
      
      if (this.onScoreUpdateCallback) {
        this.onScoreUpdateCallback(this.matchState);
      }
    });

    this.socket.on('match_ended', (state: unknown) => {
      console.log('Match ended:', state);
      this.matchState = state as NetworkMatchState;
      
      if (this.onMatchEndCallback) {
        this.onMatchEndCallback(this.matchState);
      }
    });
  }

  /**
   * Add a remote player to the scene
   */
  private addRemotePlayer(userId: string): RemotePlayer {
    const player = new RemotePlayer(this.scene, userId);
    this.remotePlayers.set(userId, player);

    const team = this.playerTeams.get(userId);
    if (team) {
      player.setTeam(team);
    }

    return player;
  }

  /**
   * Update network state - call each frame
   */
  public update(
    delta: number,
    localPlayer: { position: THREE.Vector3; velocity: THREE.Vector3; isSprinting: boolean; isGrounded: boolean },
    camera: THREE.Camera
  ): void {
    // Update remote players interpolation
    this.remotePlayers.forEach(p => p.update(delta));

    // Send local player update at fixed rate
    const now = Date.now();
    if (now - this.lastUpdate > this.config.updateRate) {
      this.sendPlayerUpdate(localPlayer, camera);
      this.lastUpdate = now;
    }
  }

  /**
   * Send local player state to server
   */
  private sendPlayerUpdate(
    player: { position: THREE.Vector3; velocity: THREE.Vector3; isSprinting: boolean; isGrounded: boolean },
    camera: THREE.Camera
  ): void {
    if (!this.socket?.connected) return;

    this.socket.emit('player_update', {
      matchId: this.matchId,
      position: {
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z,
      },
      rotation: {
        x: camera.rotation.x,
        y: camera.rotation.y,
      },
      velocity: {
        x: player.velocity.x,
        y: player.velocity.y,
        z: player.velocity.z,
      },
      isSprinting: player.isSprinting,
      isGrounded: player.isGrounded,
    });
  }

  /**
   * Send shoot event
   */
  public sendShoot(origin: THREE.Vector3, direction: THREE.Vector3, weaponType: string): void {
    if (!this.socket?.connected) return;

    this.socket.emit('player_shoot', {
      matchId: this.matchId,
      origin: { x: origin.x, y: origin.y, z: origin.z },
      direction: { x: direction.x, y: direction.y, z: direction.z },
      weaponType,
    });
  }

  /**
   * Send hit event
   */
  public sendPlayerHit(targetId: string, damage: number, hitLocation: THREE.Vector3): void {
    if (!this.socket?.connected) return;

    // Check friendly fire
    const targetTeam = this.playerTeams.get(targetId);
    if (this.myTeam && targetTeam && this.myTeam === targetTeam) {
      console.log('Friendly fire blocked');
      return;
    }

    this.socket.emit('player_hit', {
      matchId: this.matchId,
      targetId,
      damage,
      hitLocation: { x: hitLocation.x, y: hitLocation.y, z: hitLocation.z },
    });
  }

  /**
   * Send death event
   */
  public sendPlayerDied(attackerId: string, weaponType: string): void {
    if (!this.socket?.connected) return;

    this.socket.emit('player_died', {
      matchId: this.matchId,
      attackerId,
      weaponType,
    });
  }

  /**
   * Send respawn event
   */
  public sendPlayerRespawn(): void {
    if (!this.socket?.connected) return;

    this.socket.emit('player_respawn', {
      matchId: this.matchId,
    });
  }

  // ========== Event Callbacks ==========

  public onKill(callback: (attackerId: string, victimId: string, weaponType: string) => void): void {
    this.onKillCallback = callback;
  }

  public onDamage(callback: (targetId: string, attackerId: string, damage: number) => void): void {
    this.onDamageCallback = callback;
  }

  public onMatchEnd(callback: (state: NetworkMatchState) => void): void {
    this.onMatchEndCallback = callback;
  }

  public onScoreUpdate(callback: (state: NetworkMatchState) => void): void {
    this.onScoreUpdateCallback = callback;
  }

  // ========== Getters ==========

  public get otherPlayers(): Map<string, RemotePlayer> {
    return this.remotePlayers;
  }

  public getRemotePlayers(): RemotePlayer[] {
    return Array.from(this.remotePlayers.values());
  }

  public getMatchState(): NetworkMatchState | null {
    return this.matchState;
  }

  public isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  // ========== Cleanup ==========

  public disconnect(): void {
    if (this.socket) {
      this.socket.off('connect');
      this.socket.off('disconnect');
      this.socket.off('player_joined');
      this.socket.off('player_update');
      this.socket.off('player_shoot');
      this.socket.off('player_damaged');
      this.socket.off('player_killed');
      this.socket.off('player_respawned');
      this.socket.off('match_state');
      this.socket.off('score_update');
      this.socket.off('match_ended');
      
      this.socket.emit('disconnect');
      this.socket = null;
    }

    // Clean up remote players
    this.remotePlayers.forEach(player => player.destroy());
    this.remotePlayers.clear();
    this.deadPlayers.clear();
  }
}

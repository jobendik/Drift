import { io, Socket } from 'socket.io-client';
import * as THREE from 'three';
import { Game } from '../Game';
import { RemotePlayer } from '../entities/RemotePlayer';

export class NetworkManager {
    private socket: Socket;
    private game: Game;
    private remotePlayers: Map<string, RemotePlayer> = new Map();
    private deadPlayers: Set<any> = new Set(); // Track dead players to prevent recreation
    private updateRate = 50; // ms
    private lastUpdate = 0;
    private matchId = 'deathmatch_room'; // Default room for now
    private scores: any = { players: {} };

    public myUserId: string;
    public myTeam: string = '';
    public playerTeams: Map<string, string> = new Map();

    constructor(game: Game) {
        this.game = game;
        this.myUserId = '0';
        // Socket initialized in connect()
        this.socket = null as any;
    }

    public connect(token: string, matchId?: string) {
        if (this.socket) return; // Already connected

        this.matchId = matchId || 'deathmatch_room';

        // Extract user ID from token for local comparison
        const userIdStr = token.split('-').pop() || '0';
        this.myUserId = userIdStr;

        console.log('Connecting to game server...');
        this.socket = io('/', {
            auth: { token },
            transports: ['websocket']
        });

        this.setupListeners();
    }

    private setupListeners() {
        this.socket.on('connect', () => {
            console.log('Connected to game server');
            this.socket.emit('join_match', this.matchId);
        });

        this.socket.on('player_joined', (data: { userId: string, team?: string }) => {
            console.log(`Player ${data.userId} joined (${data.team})`);

            if (data.team) {
                this.playerTeams.set(data.userId, data.team);
            }

            // Create remote player if not exists
            if (!this.remotePlayers.has(data.userId)) {
                this.addRemotePlayer(data.userId);
            }
        });

        this.socket.on('player_update', (data: any) => {
            const { userId, position, rotation, isSprinting, isGrounded } = data;
            const userIdStr = String(userId);

            // Ignore updates for dead players
            if (this.deadPlayers.has(userId)) {
                return;
            }

            let remotePlayer = this.remotePlayers.get(userIdStr);
            if (!remotePlayer) {
                remotePlayer = this.addRemotePlayer(userIdStr);
            }

            remotePlayer.updateState(position, rotation, isSprinting, isGrounded);
        });

        this.socket.on('player_shoot', (data: any) => {
            const { userId } = data;
            // const { origin, direction, weaponType } = data; // Available for visual effects
            // Show muzzle flash / tracer for remote player
            // TODO: Implement visual effects for remote shooting
            console.log(`Player ${userId} shot`);
        });

        this.socket.on('player_damaged', (data: any) => {
            const { targetId, attackerId, damage } = data;
            // const { hitLocation } = data; // Available for effects
            console.log(`Player ${targetId} took ${damage} damage from ${attackerId}`);

            // If I am the target, take damage (convert targetId to string for comparison)
            if (this.game.handleRemoteDamage && String(targetId) === this.myUserId) {
                this.game.handleRemoteDamage(data);
            }
        });

        this.socket.on('player_killed', (data: any) => {
            const { attackerId, victimId, weaponType } = data;
            console.log(`Player ${victimId} killed by ${attackerId} with ${weaponType}`);

            // Mark player as dead to ignore future updates
            this.deadPlayers.add(victimId);

            // Remove the dead player's mesh (ensure ID is string)
            const victimIdStr = String(victimId);
            if (this.remotePlayers.has(victimIdStr)) {
                const deadPlayer = this.remotePlayers.get(victimIdStr);
                if (deadPlayer) {
                    deadPlayer.destroy();
                    this.remotePlayers.delete(victimIdStr);
                    console.log(`Player ${victimIdStr} removed from scene`);
                }
            }

            if (this.game.handleKillFeed) {
                this.game.handleKillFeed(attackerId, victimId, weaponType);
            }

            // Pass team info for TDM scoring
            const victimTeam = this.playerTeams.get(String(victimId)) || (String(victimId) === this.myUserId ? this.myTeam : '');
            const attackerTeam = this.playerTeams.get(String(attackerId)) || (String(attackerId) === this.myUserId ? this.myTeam : '');

            if (this.game.gameModeManager.getCurrentMode()?.getName() === 'Team Deathmatch') {
                (this.game.gameModeManager.getCurrentMode() as any).onPlayerKilled(String(victimId), String(attackerId), victimTeam, attackerTeam);
            }
        });

        this.socket.on('player_respawned', (data: any) => {
            const { userId, team } = data;
            const userIdStr = String(userId);
            console.log(`Player ${userIdStr} respawned (${team})`);

            if (team) {
                this.playerTeams.set(userIdStr, team);
            }

            // Remove from dead players list
            this.deadPlayers.delete(userIdStr);

            // Recreate the remote player if they don't exist (ensure ID is string)
            if (!this.remotePlayers.has(userIdStr) && userIdStr !== this.myUserId) {
                this.addRemotePlayer(userIdStr);
            }
        });

        this.socket.on('match_state', (state: any) => {
            console.log('Received match state:', state);
            this.scores = state;

            // Sync teams
            if (state.teams) {
                Object.entries(state.teams).forEach(([uid, team]: [string, any]) => {
                    this.playerTeams.set(uid, team);
                    if (uid === this.myUserId) {
                        this.myTeam = team;
                        console.log('My team:', this.myTeam);
                    } else {
                        // Update existing remote player color
                        const rp = this.remotePlayers.get(uid);
                        if (rp) rp.setTeam(team);
                    }
                });
            }

            if (this.game.handleScoreUpdate) {
                this.game.handleScoreUpdate(this.scores);
            }
        });

        this.socket.on('score_update', (state: any) => {
            console.log('Received score update:', state);
            this.scores = state;
            if (this.game.handleScoreUpdate) {
                this.game.handleScoreUpdate(this.scores);
            }
        });

        this.socket.on('match_ended', (finalState: any) => {
            console.log('Match ended:', finalState);
            this.scores = finalState;
            if (this.game.handleMatchEnd) {
                this.game.handleMatchEnd(finalState);
            }
        });

        this.socket.on('flag_update', (data: { action: string, team: string, playerId: string, position?: any }) => {
            console.log(`Flag Update: ${data.action} ${data.team} by ${data.playerId}`);
            const mode = this.game.gameModeManager.getCurrentMode();
            if (mode && mode.getName() === 'Capture The Flag') {
                (mode as any).onFlagAction(data.action, data.team, data.playerId);
            }
        });
    }

    public getRemotePlayers(): RemotePlayer[] {
        return Array.from(this.remotePlayers.values());
    }

    public get otherPlayers(): Map<string, RemotePlayer> {
        return this.remotePlayers;
    }

    public getScores() {
        return this.scores;
    }

    private addRemotePlayer(userId: string): RemotePlayer {
        const player = new RemotePlayer(this.game.getScene(), userId);
        this.remotePlayers.set(userId, player);

        // Set team color if known
        const team = this.playerTeams.get(userId);
        if (team) {
            player.setTeam(team);
        }

        return player;
    }

    public update(dt: number, player: any, camera: any) {
        // Update remote players (interpolation)
        this.remotePlayers.forEach(p => p.update(dt));

        // Send local update
        const now = Date.now();
        if (now - this.lastUpdate > this.updateRate) {
            this.sendPlayerUpdate(player, camera);
            this.lastUpdate = now;
        }
    }

    private sendPlayerUpdate(player: any, camera: any) {
        if (!this.socket || !this.socket.connected) return;

        const position = camera.position; // FPS camera position
        const rotation = {
            y: camera.rotation.y,
            x: camera.rotation.x
        };

        this.socket.emit('player_update', {
            matchId: this.matchId,
            position: { x: position.x, y: position.y, z: position.z },
            rotation,
            velocity: { x: player.velocity.x, y: player.velocity.y, z: player.velocity.z },
            isSprinting: player.isSprinting,
            isGrounded: player.onGround
        });
    }

    public sendShoot(origin: THREE.Vector3, direction: THREE.Vector3, weaponType: string) {
        if (!this.socket) return;
        this.socket.emit('player_shoot', {
            matchId: this.matchId,
            origin,
            direction,
            weaponType
        });
    }

    public sendPlayerHit(targetId: string, damage: number, hitLocation: THREE.Vector3) {
        // Friendly Fire Check
        const targetTeam = this.playerTeams.get(targetId);
        if (this.myTeam && targetTeam && this.myTeam === targetTeam) {
            console.log('Friendly fire! Damage ignored.');
            return;
        }

        if (!this.socket) return;

        this.socket.emit('player_hit', {
            matchId: this.matchId,
            targetId,
            damage,
            hitLocation
        });
    }

    public sendPlayerDied(attackerId: string, weaponType: string) {
        if (!this.socket) return;
        this.socket.emit('player_died', {
            matchId: this.matchId,
            attackerId,
            weaponType
        });
    }

    public sendPlayerRespawn() {
        if (!this.socket) return;
        this.socket.emit('player_respawn', {
            matchId: this.matchId
        });
    }

    public sendFlagAction(action: string, team: string, position?: THREE.Vector3) {
        if (!this.socket) return;
        this.socket.emit('flag_action', {
            matchId: this.matchId,
            action,
            team,
            position: position ? { x: position.x, y: position.y, z: position.z } : undefined
        });
    }
}

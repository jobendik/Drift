import { Game } from '../../Game';
import { IGameMode } from './IGameMode';
import * as THREE from 'three';

import { BATTLE_ROYALE_MAP } from '../../config/maps';

export class BattleRoyaleMode implements IGameMode {
    private game: Game;
    private isActive: boolean = false;
    private zoneRadius: number = 500;
    private zoneCenter: { x: number, z: number } = { x: 0, z: 0 };
    private minZoneRadius: number = 20;
    private shrinkRate: number = 5; // Units per second
    private timeUntilShrink: number = 10; // Seconds before shrinking starts
    private damagePerSecond: number = 5;
    private damageTimer: number = 0;

    constructor(game: Game) {
        this.game = game;
    }

    public init(): void {
        console.log('Initializing Battle Royale Mode');
        // Load BR Map
        // Note: In a real scenario, we might need a way to reload the arena dynamically
        // For now, we assume the game started with this mode or we force a reload
        // Since Game.ts loads the map in constructor, we might need to add a method to Game to switch maps
        // But for this MVP, let's assume the user launched with ?mode=battle-royale which loads the correct map in Game.ts logic (to be added)
    }

    public start(): void {
        this.isActive = true;
        this.zoneRadius = BATTLE_ROYALE_MAP.size / 2;
        this.timeUntilShrink = 30; // 30 seconds prep time
        console.log('Battle Royale Started! Zone Radius:', this.zoneRadius);

        // Notify HUD
        this.game.hudManager.showMessage('BATTLE ROYALE STARTED', 3000);

        this.spawnPlayer();

        // Calculate enemies needed to reach 20 total participants
        const remoteCount = this.game.networkManager.getRemotePlayers().length;
        const totalTarget = 20;
        // +1 for local player
        const enemiesNeeded = Math.max(5, totalTarget - (remoteCount + 1));

        console.log(`Spawning ${enemiesNeeded} enemies for ${remoteCount + 1} players`);
        this.spawnEnemies(enemiesNeeded);
    }

    private spawnEnemies(count: number): void {
        const types = ['grunt', 'shooter', 'heavy', 'viper'];
        const minRadius = 50;
        const maxRadius = this.zoneRadius - 20;

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = minRadius + Math.random() * (maxRadius - minRadius);
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;

            const type = types[Math.floor(Math.random() * types.length)];
            this.game.enemyManager.createEnemy(type, new THREE.Vector3(x, 2, z));
        }
    }

    private spawnPlayer(): void {
        // Random spawn between radius 50 and 200 to avoid central building and outer edge
        const minRadius = 60;
        const maxRadius = 200;
        const angle = Math.random() * Math.PI * 2;
        const radius = minRadius + Math.random() * (maxRadius - minRadius);

        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        // Set player position (y = 30 for sky drop, or 2 for ground)
        // Let's do a sky drop!
        this.game.player.position.set(x, 50, z);
        this.game.player.velocity.set(0, 0, 0);

        // Reset camera look to center
        this.game.player.rotation.y = Math.atan2(-x, -z);
    }

    public update(dt: number): void {
        if (!this.isActive) return;

        // Zone Logic
        if (this.timeUntilShrink > 0) {
            this.timeUntilShrink -= dt;
            if (this.timeUntilShrink <= 0) {
                if (!this.game.player.isDead()) {
                    this.game.hudManager.showMessage('THE STORM IS SHRINKING!', 3000);
                }
            }
        } else {
            if (this.zoneRadius > this.minZoneRadius) {
                this.zoneRadius -= this.shrinkRate * dt;
            }
        }

        // Check Player in Zone
        const playerPos = this.game.player.position;
        const dist = Math.sqrt(Math.pow(playerPos.x - this.zoneCenter.x, 2) + Math.pow(playerPos.z - this.zoneCenter.z, 2));

        if (!this.game.player.isDead() && dist > this.zoneRadius) {
            this.damageTimer += dt;
            if (this.damageTimer >= 1.0) {
                this.game.player.takeDamage(this.damagePerSecond);
                if (this.game.player.isDead()) {
                    this.game.handleDeath();
                }
                this.damageTimer = 0;
                this.game.hudManager.flashDamage();
                console.log('Taking storm damage!');
            }
        } else {
            this.damageTimer = 0;
        }

        // Update HUD
        // We need to add updateZoneInfo to HUDManager first, but we can call it safely if we check
        if ((this.game.hudManager as any).updateZoneInfo) {
            (this.game.hudManager as any).updateZoneInfo(this.zoneRadius, Math.max(0, this.timeUntilShrink));
        }

        // Win Condition Check
        const remotePlayers = this.game.networkManager.getRemotePlayers();
        const enemies = this.game.enemyManager.getEnemyCount();
        const alivePlayers = remotePlayers.length + enemies + (this.game.player.health > 0 ? 1 : 0);

        if ((this.game.hudManager as any).updateAliveCount) {
            (this.game.hudManager as any).updateAliveCount(alivePlayers);
        }

        if (alivePlayers <= 1 && this.game.player.health > 0) {
            this.victory();
        }
    }

    public cleanup(): void {
        this.isActive = false;
    }

    public getName(): string {
        return 'Battle Royale';
    }

    private victory(): void {
        this.isActive = false;
        this.game.hudManager.showMessage('VICTORY ROYALE!', 5000);

        // Show Victory Screen
        this.game.hudManager.showGameOver({
            wave: 1,
            kills: this.game.gameState.kills,
            accuracy: 0, // TODO: Track accuracy
            time: "WINNER",
            score: this.game.gameState.score
        });

        // Update Title
        const gameOverTitle = document.querySelector('#game-over h1');
        if (gameOverTitle) {
            gameOverTitle.textContent = "VICTORY ROYALE";
            (gameOverTitle as HTMLElement).style.color = '#ffd700'; // Gold
        }

        // Disable controls
        this.game.tryExitPointerLock();
    }
}

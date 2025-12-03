import { BaseGameMode } from './BaseGameMode';

export class MultiplayerDeathmatchMode extends BaseGameMode {
    public getName(): string {
        return 'Multiplayer Deathmatch';
    }

    public start(): void {
        super.start();

        // Multiplayer specific setup
        // Ensure we are connected
        console.log('Starting Multiplayer Deathmatch...');

        // We might want to clear existing enemies if any
        this.game.enemyManager.clear();

        // Trigger a respawn/join event if needed
        this.game.networkManager.sendPlayerRespawn();
    }

    public update(dt: number): void {
        super.update(dt);

        // Check for other players
        const otherPlayerCount = this.game.networkManager.otherPlayers.size;
        if (otherPlayerCount === 0) {
            this.game.hudManager.showWaitingForPlayers(true);
        } else {
            this.game.hudManager.showWaitingForPlayers(false);
        }
    }

    public cleanup(): void {
        super.cleanup();
        // Disconnect or leave room?
        // For now, we might just want to stop sending updates
    }
}

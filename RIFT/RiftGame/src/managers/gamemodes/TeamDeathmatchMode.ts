import { BaseGameMode } from './BaseGameMode';

export class TeamDeathmatchMode extends BaseGameMode {
    private redScore: number = 0;
    private blueScore: number = 0;
    private scoreLimit: number = 50;

    public getName(): string {
        return 'Team Deathmatch';
    }

    public start(): void {
        super.start();
        console.log('Starting Team Deathmatch...');

        this.redScore = 0;
        this.blueScore = 0;

        // Clear existing enemies
        this.game.enemyManager.clear();

        // Show Team Scoreboard
        this.game.hudManager.showTeamScoreboard(true);
        this.updateScores();

        // Trigger respawn
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

    public onPlayerKilled(victimId: string, killerId: string, victimTeam: string, killerTeam: string): void {
        console.log(`TDM Kill: ${killerId} (${killerTeam}) killed ${victimId} (${victimTeam})`);

        // Update Killfeed
        // Assuming weapon is 'Plasma Rifle' and headshot is false for now as we don't have that data passed yet
        // We might need to update the signature of onPlayerKilled in the future to include weapon/headshot
        const killerName = killerId === this.game.networkManager.myUserId ? 'YOU' : `Player ${killerId}`;
        const victimName = victimId === this.game.networkManager.myUserId ? 'YOU' : `Player ${victimId}`;

        this.game.killfeedManager.addKill(killerName, victimName, 'Plasma Rifle', false, false, killerTeam, victimTeam);

        if (victimTeam !== killerTeam) {
            if (killerTeam === 'red') {
                this.redScore++;
            } else if (killerTeam === 'blue') {
                this.blueScore++;
            }
            this.updateScores();
            this.checkWinCondition();
        }
    }

    private updateScores(): void {
        this.game.hudManager.updateTeamScores(this.redScore, this.blueScore);
    }

    private checkWinCondition(): void {
        if (this.redScore >= this.scoreLimit) {
            this.endGame('RED TEAM WINS');
        } else if (this.blueScore >= this.scoreLimit) {
            this.endGame('BLUE TEAM WINS');
        }
    }

    private endGame(message: string): void {
        this.game.hudManager.showMessage(message, 5000);
        setTimeout(() => {
            // Restart or return to lobby?
            // For now, just reset scores
            this.redScore = 0;
            this.blueScore = 0;
            this.updateScores();
            this.game.networkManager.sendPlayerRespawn();
        }, 5000);
    }

    public cleanup(): void {
        super.cleanup();
        this.game.hudManager.showTeamScoreboard(false);
    }
}

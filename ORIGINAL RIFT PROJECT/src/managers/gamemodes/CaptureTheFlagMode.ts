import { BaseGameMode } from './BaseGameMode';
import { Flag } from '../../entities/Flag';
import * as THREE from 'three';

export class CaptureTheFlagMode extends BaseGameMode {
    private redFlag: Flag | null = null;
    private blueFlag: Flag | null = null;
    private redScore: number = 0;
    private blueScore: number = 0;
    private scoreLimit: number = 3;

    public getName(): string {
        return 'Capture The Flag';
    }

    public start(): void {
        super.start();
        console.log('Starting Capture The Flag...');

        this.redScore = 0;
        this.blueScore = 0;

        // Clear enemies
        this.game.enemyManager.clear();

        // Spawn Flags (Hardcoded positions for now, ideally from map data)
        // Assuming map is roughly centered at 0,0
        this.redFlag = new Flag(this.game.getScene(), 'red', new THREE.Vector3(20, 0, 20));
        this.blueFlag = new Flag(this.game.getScene(), 'blue', new THREE.Vector3(-20, 0, -20));

        // Show Scoreboard (reuse TDM one for now)
        this.game.hudManager.showTeamScoreboard(true);
        this.updateScores();

        this.game.networkManager.sendPlayerRespawn();
        this.updateFlagStatus();
    }

    public update(dt: number): void {
        super.update(dt);

        if (this.redFlag) this.redFlag.update(dt);
        if (this.blueFlag) this.blueFlag.update(dt);

        this.checkFlagInteractions();
    }

    private checkFlagInteractions() {
        const player = this.game.player;
        const myTeam = this.game.networkManager.myTeam;

        if (!myTeam) return;

        const enemyFlag = myTeam === 'red' ? this.blueFlag : this.redFlag;
        const myFlag = myTeam === 'red' ? this.redFlag : this.blueFlag;

        if (!enemyFlag || !myFlag) return;

        // 1. Pickup Enemy Flag
        if (enemyFlag.state === 'home' || enemyFlag.state === 'dropped') {
            const dist = player.position.distanceTo(enemyFlag.mesh.position);
            if (dist < 3.0) {
                this.game.networkManager.sendFlagAction('pickup', enemyFlag.team);
            }
        }

        // 2. Capture Flag (Have enemy flag + Touch my home flag)
        // Force string comparison for carrierId
        if (String(enemyFlag.carrierId) === String(this.game.networkManager.myUserId)) {
            if (myFlag.state === 'home') {
                const distMesh = player.position.distanceTo(myFlag.mesh.position);
                // Use mesh position as it's what the player sees
                if (distMesh < 5.0) {
                    this.game.networkManager.sendFlagAction('capture', enemyFlag.team);
                }
            }
        }

        // 3. Return Own Flag (Touch dropped own flag)
        if (myFlag.state === 'dropped') {
            if (player.position.distanceTo(myFlag.mesh.position) < 3.0) {
                this.game.networkManager.sendFlagAction('return', myFlag.team);
            }
        }
    }

    public onFlagAction(action: string, team: string, playerId: string) {
        const flag = team === 'red' ? this.redFlag : this.blueFlag;
        if (!flag) return;

        if (action === 'pickup') {
            flag.pickup(playerId);
            this.game.hudManager.showMessage(`${team.toUpperCase()} FLAG TAKEN!`, 2000);
        } else if (action === 'drop') {
            const playerPos = this.getPlayerPosition(playerId);
            if (playerPos) flag.drop(playerPos);
        } else if (action === 'return') {
            flag.returnHome();
            this.game.hudManager.showMessage(`${team.toUpperCase()} FLAG RETURNED`, 2000);
        } else if (action === 'capture') {
            flag.returnHome();
            // Score goes to the CAPTURING team (opposite of flag team)
            if (team === 'red') this.blueScore++;
            else this.redScore++;

            this.updateScores();
            this.game.hudManager.showMessage(`${team === 'red' ? 'BLUE' : 'RED'} TEAM SCORED!`, 3000);
            this.checkWinCondition();
        }

        this.updateFlagStatus();
    }

    private updateFlagStatus() {
        const redStatus = this.redFlag ? (this.redFlag.state === 'home' ? 'SAFE' : (this.redFlag.state === 'carried' ? 'TAKEN' : 'DROPPED')) : '-';
        const blueStatus = this.blueFlag ? (this.blueFlag.state === 'home' ? 'SAFE' : (this.blueFlag.state === 'carried' ? 'TAKEN' : 'DROPPED')) : '-';
        this.game.hudManager.showFlagStatus(redStatus, blueStatus);
    }

    private getPlayerPosition(playerId: string): THREE.Vector3 | null {
        if (playerId === this.game.networkManager.myUserId) {
            return this.game.player.position.clone();
        }
        const remotePlayer = this.game.networkManager.otherPlayers.get(playerId);
        return remotePlayer ? remotePlayer.mesh.position.clone() : null;
    }

    public onPlayerKilled(victimId: string, killerId: string, victimTeam: string, killerTeam: string): void {
        // Drop flag if victim was carrying
        const redFlag = this.redFlag;
        const blueFlag = this.blueFlag;

        if (redFlag && redFlag.carrierId === victimId) {
            const pos = this.getPlayerPosition(victimId);
            if (pos) {
                if (victimId === this.game.networkManager.myUserId) {
                    this.game.networkManager.sendFlagAction('drop', 'red', pos);
                }
            }
        }

        if (blueFlag && blueFlag.carrierId === victimId) {
            const pos = this.getPlayerPosition(victimId);
            if (pos && victimId === this.game.networkManager.myUserId) {
                this.game.networkManager.sendFlagAction('drop', 'blue', pos);
            }
        }

        // Killfeed
        const killerName = killerId === this.game.networkManager.myUserId ? 'YOU' : `Player ${killerId}`;
        const victimName = victimId === this.game.networkManager.myUserId ? 'YOU' : `Player ${victimId}`;
        this.game.killfeedManager.addKill(killerName, victimName, 'Weapon', false, false, killerTeam, victimTeam);
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
            this.redScore = 0;
            this.blueScore = 0;
            this.updateScores();
            this.redFlag?.returnHome();
            this.blueFlag?.returnHome();
            this.game.networkManager.sendPlayerRespawn();
        }, 5000);
    }

    public cleanup(): void {
        super.cleanup();
        if (this.redFlag) this.game.getScene().remove(this.redFlag.mesh);
        if (this.blueFlag) this.game.getScene().remove(this.blueFlag.mesh);
        this.game.hudManager.showTeamScoreboard(false);
    }
}

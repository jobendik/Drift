import { Game } from '../Game';
import { IGameMode } from './gamemodes/IGameMode';
import { SinglePlayerWaveMode } from './gamemodes/SinglePlayerWaveMode';
import { MultiplayerDeathmatchMode } from './gamemodes/MultiplayerDeathmatchMode';
import { TeamDeathmatchMode } from './gamemodes/TeamDeathmatchMode';
import { CaptureTheFlagMode } from './gamemodes/CaptureTheFlagMode';
import { BattleRoyaleMode } from './gamemodes/BattleRoyaleMode';

export enum GameModeType {
    SINGLE_PLAYER_WAVE = 'SINGLE_PLAYER_WAVE',
    MULTIPLAYER_DEATHMATCH = 'MULTIPLAYER_DEATHMATCH',
    TEAM_DEATHMATCH = 'TEAM_DEATHMATCH',
    CAPTURE_THE_FLAG = 'CAPTURE_THE_FLAG',
    BATTLE_ROYALE = 'BATTLE_ROYALE'
}

export class GameModeManager {
    private currentMode: IGameMode | null = null;
    private modes: Map<GameModeType, IGameMode> = new Map();

    constructor(game: Game) {
        this.modes.set(GameModeType.SINGLE_PLAYER_WAVE, new SinglePlayerWaveMode(game));
        this.modes.set(GameModeType.MULTIPLAYER_DEATHMATCH, new MultiplayerDeathmatchMode(game));
        this.modes.set(GameModeType.TEAM_DEATHMATCH, new TeamDeathmatchMode(game));
        this.modes.set(GameModeType.CAPTURE_THE_FLAG, new CaptureTheFlagMode(game));
        this.modes.set(GameModeType.BATTLE_ROYALE, new BattleRoyaleMode(game));
    }

    public setMode(type: GameModeType): void {
        if (this.currentMode) {
            this.currentMode.cleanup();
        }

        const newMode = this.modes.get(type);
        if (!newMode) {
            console.error(`Game mode ${type} not found!`);
            return;
        }

        this.currentMode = newMode;
        this.currentMode.init();
        this.currentMode.start();
    }

    public update(dt: number): void {
        if (this.currentMode) {
            this.currentMode.update(dt);
        }
    }

    public getCurrentMode(): IGameMode | undefined {
        return this.currentMode || undefined;
    }
}

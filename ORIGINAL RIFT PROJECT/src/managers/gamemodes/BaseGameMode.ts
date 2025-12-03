import { Game } from '../../Game';
import { IGameMode } from './IGameMode';

export abstract class BaseGameMode implements IGameMode {
    protected game: Game;
    protected isActive: boolean = false;

    constructor(game: Game) {
        this.game = game;
    }

    public init(): void {
        console.log(`Initializing ${this.getName()} mode...`);
    }

    public start(): void {
        console.log(`Starting ${this.getName()} mode...`);
        this.isActive = true;
    }

    public update(_dt: number): void {
        if (!this.isActive) return;
    }

    public cleanup(): void {
        console.log(`Cleaning up ${this.getName()} mode...`);
        this.isActive = false;
    }

    public abstract getName(): string;
}

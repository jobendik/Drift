

export interface IGameMode {
    init(): void;
    start(): void;
    update(dt: number): void;
    cleanup(): void;
    getName(): string;
}

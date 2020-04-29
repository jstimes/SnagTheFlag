
export interface GameStateManager {
    render(): void;
    update(elapsedMs: number): void;
    destroy(): void;
}
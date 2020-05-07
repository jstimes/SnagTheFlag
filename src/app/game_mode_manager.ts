
export interface GameModeManager {
    render(): void;
    update(elapsedMs: number): void;
    destroy(): void;
}
export interface GameSettings {
    squadSize: number;
    /** 
     * Manhattan distance from flag that characters 
     * can be spawned upon game start. 
     */
    maxSpawnDistanceFromFlag: number;
}

export const DEFAULT_GAME_SETTINGS: GameSettings = {
    squadSize: 2,
    maxSpawnDistanceFromFlag: 14,
}
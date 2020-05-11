export enum MatchType {
    PLAYER_VS_PLAYER_LOCAL,
    PLAYER_VS_AI,
    AI_VS_AI,
}

export interface GameSettings {
    matchType: MatchType;
    teamIndexToSquadSize: Map<number, number>;
    /** 
     * Manhattan distance from flag that characters 
     * can be spawned upon game start. 
     */
    maxSpawnDistanceFromFlag: number;
    numTeams: number;
    hasFogOfWar?: boolean;
}

const EQUAL_DEFAULT_SQUAD_SIZE = 4;

export const DEFAULT_GAME_SETTINGS: GameSettings = {
    matchType: MatchType.PLAYER_VS_PLAYER_LOCAL,
    teamIndexToSquadSize: new Map([[0, EQUAL_DEFAULT_SQUAD_SIZE], [1, EQUAL_DEFAULT_SQUAD_SIZE]]),
    maxSpawnDistanceFromFlag: 8,
    numTeams: 2,
}
import { Point } from 'src/app/math/point';
import { Flag } from 'src/app/flag';
import { Obstacle } from 'src/app/obstacle';
import { Character } from 'src/app/character';

export enum GamePhase {
    // Setup.
    CHARACTER_PLACEMENT,
    // Main game.
    COMBAT,
}

export enum SelectedCharacterState {
    AWAITING,
    MOVING,
    AIMING,
    THROWING_GRENADE,
}

export interface GameState {
    readonly gamePhase: GamePhase;
    readonly obstacles: Obstacle[];
    readonly characters: Character[];
    readonly flags: Flag[];
    readonly currentTeamIndex: number;
    readonly selectableTiles: Point[];
    readonly selectedCharacter?: Character;
    readonly selectedCharacterState?: SelectedCharacterState;
}
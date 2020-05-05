import { Point } from 'src/app/math/point';

export enum ActionType {
    PLACE_CHARACTER,
    MOVE_CHARACTER,
    SHOOT,
    END_CHARACTER_TURN,
}

export interface PlaceCharacterAction {
    readonly type: ActionType.PLACE_CHARACTER;
    readonly tileCoords: Point;
}

export interface MoveCharacterAction {
    readonly type: ActionType.MOVE_CHARACTER;
    // readonly character: Character;
    readonly tileCoords: Point;
}

export interface EndCharacterTurnAction {
    readonly type: ActionType.END_CHARACTER_TURN;
    // readonly character: Character;
}

export interface ShootAction {
    readonly type: ActionType.SHOOT;
    // readonly firingCharacter: Character;
}

export type Action = PlaceCharacterAction | MoveCharacterAction |
    EndCharacterTurnAction | ShootAction;

/** Used for exhaustive Action checking. */
export function throwBadAction(action: never): never {
    throw new Error('Action not handled');
}
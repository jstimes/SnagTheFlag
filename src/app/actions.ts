import { Point } from 'src/app/math/point';
import { Grenade } from 'src/app/shot_info';

export enum ActionType {
    PLACE_CHARACTER,
    MOVE_CHARACTER,
    SHOOT,
    HEAL,
    THROW_GRENADE,
    END_CHARACTER_TURN,
}

export interface PlaceCharacterAction {
    readonly type: ActionType.PLACE_CHARACTER;
    readonly tileCoords: Point;
}

export interface MoveCharacterAction {
    readonly type: ActionType.MOVE_CHARACTER;
    readonly tileCoords: Point;
}

export interface EndCharacterTurnAction {
    readonly type: ActionType.END_CHARACTER_TURN;
}

export interface ShootAction {
    readonly type: ActionType.SHOOT;
}

export interface HealAction {
    readonly type: ActionType.HEAL;
    readonly healAmount: number;
}

export interface ThrowGrenadeAction {
    readonly type: ActionType.THROW_GRENADE;
    readonly grenade: Grenade;
    readonly targetTile: Point;
}

export type Action = PlaceCharacterAction | MoveCharacterAction |
    EndCharacterTurnAction | ShootAction | HealAction | ThrowGrenadeAction;

/** Used for exhaustive Action checking. */
export function throwBadAction(action: never): never {
    throw new Error('Action not handled');
}
import { Point } from 'src/app/math/point';

export enum ActionType {
    PLACE_CHARACTER,
    MOVE_CHARACTER,
    SHOOT,
    HEAL,
    THROW_GRENADE,
    END_CHARACTER_TURN,
}

/** Abilities characters can perform in addition to moving and shooting. */
export interface CharacterAbility {
    /**  Max times this ability can be used. 0 indicates unlimited. */
    readonly maxUses: number;
    /** Number of turns after use before ability can be reused. */
    readonly cooldownTurns: number;
    /** 
     * Whether the ability can be used in addition to shooting (true)
     * or is used in place of shooting (false). 
     */
    readonly isFree: boolean;
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

export interface HealAction extends CharacterAbility {
    readonly type: ActionType.HEAL;
    readonly healAmount: number;
}

export interface ThrowGrenadeAction extends CharacterAbility {
    readonly type: ActionType.THROW_GRENADE;
}

export type Action = PlaceCharacterAction | MoveCharacterAction |
    EndCharacterTurnAction | ShootAction | HealAction | ThrowGrenadeAction;

export type CharacterAction = HealAction | ThrowGrenadeAction;

/** Used for exhaustive Action checking. */
export function throwBadAction(action: never): never {
    throw new Error('Action not handled');
}
import { Point } from 'src/app/math/point';
import { SplashDamage } from 'src/app/shot_info';
import { SelectedCharacterState } from 'src/app/game_state';

export enum ActionType {
    SELECT_TILE,
    SELECT_CHARACTER,
    SELECT_CHARACTER_STATE,
    AIM,
    SHOOT,
    HEAL,
    END_CHARACTER_TURN,
}

export interface SelectTileAction {
    readonly type: ActionType.SELECT_TILE;
    readonly tile: Point;
}

export interface SelectCharacterAction {
    readonly type: ActionType.SELECT_CHARACTER;
    readonly characterIndex: number;
}

export interface SelectCharacterStateAction {
    readonly type: ActionType.SELECT_CHARACTER_STATE;
    readonly state: SelectedCharacterState;
}

export interface EndCharacterTurnAction {
    readonly type: ActionType.END_CHARACTER_TURN;
}

export interface AimAction {
    readonly type: ActionType.AIM;
    readonly aimAngleClockwiseRadians: number;
}

export interface ShootAction {
    readonly type: ActionType.SHOOT;
}

export interface HealAction {
    readonly type: ActionType.HEAL;
    readonly healAmount: number;
}

export type Action =
    EndCharacterTurnAction | ShootAction | HealAction |
    SelectTileAction | SelectCharacterAction |
    SelectCharacterStateAction | AimAction;

/** Used for exhaustive Action checking. */
export function throwBadAction(action: never): never {
    throw new Error('Action not handled');
}
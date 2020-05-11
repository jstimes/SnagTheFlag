import { Point } from 'src/app/math/point';
import { SplashDamage } from 'src/app/shot_info';
import { SelectedCharacterState } from 'src/app/game_state';
import { CharacterSettings } from 'src/app/character_settings';

export enum ActionType {
    SELECT_CHARACTER_CLASS = 'SELECT_CHARACTER_CLASS',
    SELECT_TILE = 'SELECT_TILE',
    SELECT_CHARACTER = 'SELECT_CHARACTER',
    SELECT_CHARACTER_STATE = 'SELECT_CHARACTER_STATE',
    AIM = 'AIM',
    SHOOT = 'SHOOT',
    HEAL = 'HEAL',
    END_CHARACTER_TURN = 'END_CHARACTER_TURN',
}


export interface SelectCharacterClassAction {
    readonly type: ActionType.SELECT_CHARACTER_CLASS;
    readonly class: CharacterSettings;
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

export type Action = SelectCharacterClassAction |
    EndCharacterTurnAction | ShootAction | HealAction |
    SelectTileAction | SelectCharacterAction |
    SelectCharacterStateAction | AimAction;

/** Used for exhaustive Action checking. */
export function throwBadAction(action: never): never {
    throw new Error('Action not handled');
}
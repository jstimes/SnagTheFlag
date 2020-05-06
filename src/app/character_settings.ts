import { ActionType } from 'src/app/actions';
import { SplashDamage, DamageType } from 'src/app/shot_info';
import { Grid } from 'src/app/grid';

/** Abilities characters can perform in addition to moving and shooting. */
export interface BaseCharacterAbility {
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

export interface HealAbility extends BaseCharacterAbility {
    readonly actionType: ActionType.HEAL;
    readonly healAmount: number;
}

export interface ThrowGrenadeAbility extends BaseCharacterAbility {
    readonly actionType: ActionType.THROW_GRENADE;
    readonly splashDamage: SplashDamage;
}

export type CharacterAbility = HealAbility | ThrowGrenadeAbility;

/** Metadata about CharacterActions. */
export interface CharacterAbilityState {
    /** Remaining number of uses for action, or null if unlimited. */
    usesLeft?: number;
    /** Remaining number of turns until this action can be used again. */
    cooldownTurnsLeft: number;
}

export enum ClassType {
    SCOUT = 'Scout',
    ASSAULT = 'Assault',
    SNIPER = 'Sniper',
}

/** Parameters describing basic character attributes. */
export interface CharacterSettings {
    readonly type: ClassType;
    /** Starting health. */
    readonly maxHealth: number;
    /** Manhattan distance from curent position a character can move */
    readonly maxMovesPerTurn: number;
    /** 
     * Whether the character is allowed to shoot after moving. 
     * If true, shooting ends character turn without option to move.
     * TODO - add canMoveAfterShooting ?
     */
    readonly canFireAfterMoving: boolean;
    /** Special abilities a character can use. */
    readonly extraActions: Set<CharacterAbility>;
    /** Damage dealt when shooting. */
    readonly shotDamage: number;
    /** 
     * Number of times a character's shot projectile can
     * bounce off of walls.
     */
    readonly numRicochets: number;

    readonly aimIndicatorLength: number;
}

const LIGHT_HEAL: HealAbility = {
    actionType: ActionType.HEAL,
    healAmount: 3,
    maxUses: 2,
    cooldownTurns: 2,
    isFree: true,
};
const MEDIUM_HEAL: HealAbility = {
    actionType: ActionType.HEAL,
    healAmount: 5,
    maxUses: 2,
    cooldownTurns: 3,
    isFree: false,
};
const FULL_HEAL: HealAbility = {
    actionType: ActionType.HEAL,
    healAmount: 15,
    maxUses: 1,
    cooldownTurns: 0,
    isFree: false,
};

const LIGHT_GRENADE: ThrowGrenadeAbility = {
    actionType: ActionType.THROW_GRENADE,
    splashDamage: {
        type: DamageType.SPLASH,
        damage: 5,
        damageManhattanDistanceRadius: 1,
        tilesAwayDamageReduction: .6,
        maxManhattanDistance: 4,
    },
    maxUses: 1,
    cooldownTurns: 0,
    isFree: false,
};
const MEDIUM_GRENADE: ThrowGrenadeAbility = {
    actionType: ActionType.THROW_GRENADE,
    splashDamage: {
        type: DamageType.SPLASH,
        damage: 8,
        damageManhattanDistanceRadius: 3,
        tilesAwayDamageReduction: .5,
        maxManhattanDistance: 4,
    },
    maxUses: 1,
    cooldownTurns: 0,
    isFree: false,
};

export const SCOUT_CHARACTER_SETTINGS: CharacterSettings = {
    type: ClassType.SCOUT,
    maxHealth: 8,
    maxMovesPerTurn: 6,
    canFireAfterMoving: true,
    extraActions: new Set<CharacterAbility>([
        LIGHT_HEAL,
    ]),
    shotDamage: 5,
    numRicochets: 1,
    aimIndicatorLength: .75 * Grid.TILE_SIZE,
};
export const ASSAULT_CHARACTER_SETTINGS: CharacterSettings = {
    type: ClassType.ASSAULT,
    maxHealth: 10,
    maxMovesPerTurn: 4,
    canFireAfterMoving: true,
    extraActions: new Set<CharacterAbility>([
        MEDIUM_HEAL,
        MEDIUM_GRENADE,
    ]),
    shotDamage: 6,
    numRicochets: 2,
    aimIndicatorLength: 1.5 * Grid.TILE_SIZE,
};
export const SNIPER_CHARACTER_SETTINGS: CharacterSettings = {
    type: ClassType.SNIPER,
    maxHealth: 8,
    maxMovesPerTurn: 3,
    canFireAfterMoving: false,
    extraActions: new Set<CharacterAbility>([
        FULL_HEAL,
    ]),
    shotDamage: 8,
    numRicochets: 3,
    aimIndicatorLength: 3 * Grid.TILE_SIZE,
};

export const CHARACTER_CLASSES: CharacterSettings[] = [
    SCOUT_CHARACTER_SETTINGS,
    ASSAULT_CHARACTER_SETTINGS,
    SNIPER_CHARACTER_SETTINGS,
]
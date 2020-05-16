import { SplashDamage, ProjectileDetailsType, ProjectileShapeType, Gun } from 'src/app/shot_info';
import { Grid } from 'src/app/grid';
import { THEME } from './theme';
import { Point } from './math/point';

const GOD_MODE = false;

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

export enum CharacterAbilityType {
    HEAL,
    THROW_GRENADE,
}

export interface HealAbility extends BaseCharacterAbility {
    readonly abilityType: CharacterAbilityType.HEAL;
    readonly healAmount: number;
}

export interface ThrowGrenadeAbility extends BaseCharacterAbility {
    readonly abilityType: CharacterAbilityType.THROW_GRENADE;
    readonly splashDamage: SplashDamage;
    readonly maxManhattanDistance: number;
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
    DEMOLITION = 'Demolition',
}

/** Parameters describing basic character attributes. */
export interface CharacterSettings {
    readonly type: ClassType;
    /** Starting health. */
    readonly maxHealth: number;
    /** Manhattan distance from curent position a character can move */
    readonly maxMovesPerTurn: number;
    /** Manhattan distance away a character can see when fog of war is on. */
    readonly maxSight: number;
    /** Special abilities a character can use. */
    readonly extraActions: Set<CharacterAbility>;

    readonly gun: Gun;
}


const DEFAULT_BULLET_COLOR = '#fff86e';
const DEFAULT_GRENADE_COLOR = '#176107';

const LIGHT_HEAL: HealAbility = {
    abilityType: CharacterAbilityType.HEAL,
    healAmount: 3,
    maxUses: 2,
    cooldownTurns: 2,
    isFree: true,
};
const MEDIUM_HEAL: HealAbility = {
    abilityType: CharacterAbilityType.HEAL,
    healAmount: 5,
    maxUses: 2,
    cooldownTurns: 3,
    isFree: false,
};
const FULL_HEAL: HealAbility = {
    abilityType: CharacterAbilityType.HEAL,
    healAmount: 15,
    maxUses: 1,
    cooldownTurns: 0,
    isFree: false,
};

const LIGHT_GRENADE: ThrowGrenadeAbility = {
    abilityType: CharacterAbilityType.THROW_GRENADE,
    splashDamage: {
        type: ProjectileDetailsType.SPLASH,
        numRicochets: 0,
        damage: 5,
        damageManhattanDistanceRadius: 1,
        tilesAwayDamageReduction: .6,
        projectileSpeed: Grid.TILE_SIZE / 160,
        color: DEFAULT_GRENADE_COLOR,
        shape: {
            type: ProjectileShapeType.CIRCLE,
            radius: Grid.TILE_SIZE / 6,
        },
    },
    maxManhattanDistance: 4,
    maxUses: 1,
    cooldownTurns: 0,
    isFree: false,
};
const MEDIUM_GRENADE: ThrowGrenadeAbility = {
    abilityType: CharacterAbilityType.THROW_GRENADE,
    splashDamage: {
        type: ProjectileDetailsType.SPLASH,
        numRicochets: 0,
        damage: 8,
        damageManhattanDistanceRadius: 3,
        tilesAwayDamageReduction: .5,
        projectileSpeed: Grid.TILE_SIZE / 160,
        color: DEFAULT_GRENADE_COLOR,
        shape: {
            type: ProjectileShapeType.CIRCLE,
            radius: Grid.TILE_SIZE / 6,
        },
    },
    maxManhattanDistance: 4,
    maxUses: 1,
    cooldownTurns: 0,
    isFree: false,
};

const SHOTGUN: Gun = {
    canFireAfterMoving: true,
    projectileDetails: {
        type: ProjectileDetailsType.BULLET,
        numRicochets: 1,
        damage: 2,
        projectileSpeed: Grid.TILE_SIZE / 80,
        color: DEFAULT_BULLET_COLOR,
        shape: {
            type: ProjectileShapeType.CIRCLE,
            radius: Grid.TILE_SIZE / 16,
        },
    },
    aimIndicatorLength: .75 * Grid.TILE_SIZE,
    spray: {
        projectiles: 3,
        offsetAngleRadians: Math.PI / 16,
    }
};
const ASSAULT_RIFLE: Gun = {
    canFireAfterMoving: true,
    projectileDetails: {
        type: ProjectileDetailsType.BULLET,
        numRicochets: 2,
        damage: GOD_MODE ? 20 : 6,
        projectileSpeed: Grid.TILE_SIZE / 80,
        color: DEFAULT_BULLET_COLOR,
        shape: {
            type: ProjectileShapeType.CIRCLE,
            radius: Grid.TILE_SIZE / 12,
        },
    },
    aimIndicatorLength: 1.5 * Grid.TILE_SIZE,
};
const SNIPER_RIFLE: Gun = {
    canFireAfterMoving: false,
    projectileDetails: {
        type: ProjectileDetailsType.BULLET,
        numRicochets: 5,
        damage: 8,
        projectileSpeed: Grid.TILE_SIZE / 60,
        color: DEFAULT_BULLET_COLOR,
        shape: {
            type: ProjectileShapeType.RECTANGLE,
            size: new Point(Grid.TILE_SIZE / 4, Grid.TILE_SIZE / 8),
        },
    },
    aimIndicatorLength: 120 * Grid.TILE_SIZE,
};
const MISSILE_LAUNCHER: Gun = {
    canFireAfterMoving: true,
    projectileDetails: {
        type: ProjectileDetailsType.SPLASH,
        numRicochets: 0,
        damage: 10,
        damageManhattanDistanceRadius: 2,
        tilesAwayDamageReduction: .6,
        projectileSpeed: Grid.TILE_SIZE / 160,
        color: '#f2ebeb',
        shape: {
            type: ProjectileShapeType.RECTANGLE,
            size: new Point(Grid.TILE_SIZE / 4, Grid.TILE_SIZE / 8),
        },
    },
    aimIndicatorLength: .75 * Grid.TILE_SIZE,
};

export const SCOUT_CHARACTER_SETTINGS: CharacterSettings = {
    type: ClassType.SCOUT,
    maxHealth: 8,
    maxMovesPerTurn: 6,
    maxSight: 8,
    gun: SHOTGUN,
    extraActions: new Set<CharacterAbility>([
        LIGHT_HEAL,
        LIGHT_GRENADE,
    ]),
};
export const ASSAULT_CHARACTER_SETTINGS: CharacterSettings = {
    type: ClassType.ASSAULT,
    maxHealth: 10,
    maxMovesPerTurn: GOD_MODE ? 16 : 4,
    maxSight: 6,
    gun: ASSAULT_RIFLE,
    extraActions: new Set<CharacterAbility>([
        MEDIUM_HEAL,
        LIGHT_GRENADE,
    ]),
};
export const SNIPER_CHARACTER_SETTINGS: CharacterSettings = {
    type: ClassType.SNIPER,
    maxHealth: 8,
    maxSight: 8,
    maxMovesPerTurn: 3,
    gun: SNIPER_RIFLE,
    extraActions: new Set<CharacterAbility>([
        FULL_HEAL,
    ]),
};
export const DEMOLITION_CHARACTER_SETTINGS: CharacterSettings = {
    type: ClassType.DEMOLITION,
    maxHealth: 12,
    maxSight: 4,
    maxMovesPerTurn: 3,
    gun: MISSILE_LAUNCHER,
    extraActions: new Set<CharacterAbility>([
        FULL_HEAL,
        MEDIUM_GRENADE,
    ]),
};

export const CHARACTER_CLASSES: CharacterSettings[] = [
    SCOUT_CHARACTER_SETTINGS,
    ASSAULT_CHARACTER_SETTINGS,
    SNIPER_CHARACTER_SETTINGS,
    DEMOLITION_CHARACTER_SETTINGS,
]
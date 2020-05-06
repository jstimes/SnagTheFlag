import { Point } from 'src/app/math/point';

export interface Grenade {
    readonly maxManhattanDistance: number;
    readonly damage: number;
    /** Tiles away from target that will be hit by grenade. */
    readonly damageManhattanDistanceRadius: number;
    /** 
     * If a target is within damageManhattanDistanceRadius from the grenade's target tile,
     * the damange dealt to the target is (damage - pow(tilesAwayDamageReduction, <tiles_away>)).
     * Should be in range (0, 1).
     */
    readonly tilesAwayDamageReduction: number;
}

export enum DamageType {
    BULLET,
    GRENADE,
}

export interface BulletDamage {
    type: DamageType.BULLET;
    damage: number;
}

export interface GrenadeDamage {
    type: DamageType.GRENADE;
    grenade: Grenade;
}

export type ProjectileDamage = BulletDamage | GrenadeDamage;

export interface ShotInfo {
    // TODO friendly fire?
    readonly isShotFromBlueTeam: boolean;
    readonly fromCanvasCoords: Point;
    readonly fromTileCoords: Point;
    readonly aimAngleRadiansClockwise: number;
    readonly damage: ProjectileDamage;
    readonly numRicochets: number;
}
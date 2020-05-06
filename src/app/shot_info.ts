import { Point } from 'src/app/math/point';

// TODO - use
export interface Gun {
    readonly damage: number;
    readonly numRicochets: number;
}

export enum ProjectileDetailsType {
    BULLET,
    SPLASH,
}

export interface Bullet {
    readonly type: ProjectileDetailsType.BULLET;
    readonly damage: number;
    readonly numRicochets: number;
}

export interface SplashDamage {
    readonly type: ProjectileDetailsType.SPLASH;
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

export type ProjectileDetails = Bullet | SplashDamage;

export interface ShotInfo {
    // TODO friendly fire?
    readonly isShotFromBlueTeam: boolean;
    readonly fromCanvasCoords: Point;
    readonly fromTileCoords: Point;
    readonly aimAngleRadiansClockwise: number;
    readonly damage: ProjectileDetails;
}
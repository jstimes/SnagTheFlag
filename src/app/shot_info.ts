import { Point } from 'src/app/math/point';


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

export interface Spray {
    readonly projectiles: number;
    readonly offsetAngleRadians: number;
}

export interface Gun {
    readonly projectileDetails: ProjectileDetails;
    readonly aimIndicatorLength: number;
    /** 
     * Whether the character is allowed to shoot after moving. 
     * If true, shooting ends character turn without option to move.
     * TODO - add canMoveAfterShooting ?
     */
    readonly canFireAfterMoving: boolean;

    readonly spray?: Spray;
}

export interface ShotInfo {
    // TODO friendly fire?
    readonly fromTeamIndex: number;
    readonly fromCanvasCoords: Point;
    readonly fromTileCoords: Point;
    readonly aimAngleRadiansClockwise: number;
    readonly projectileDetails: ProjectileDetails;
}
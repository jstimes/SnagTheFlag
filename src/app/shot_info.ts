import { Point } from 'src/app/math/point';


export enum ProjectileDetailsType {
    BULLET,
    SPLASH,
}

export enum ProjectileShapeType {
    CIRCLE = 'Circle',
    RECTANGLE = 'Rectangle',
}

interface Circle {
    readonly type: ProjectileShapeType.CIRCLE;
    readonly radius: number;
}

interface Rectangle {
    readonly type: ProjectileShapeType.RECTANGLE;
    readonly size: Point;
}

export type ProjectileShape = Circle | Rectangle;

interface BaseProjectileDetails {
    readonly numRicochets: number;
    readonly shape: ProjectileShape;
    readonly projectileSpeed: number;
    readonly color: string;
}

export interface Bullet extends BaseProjectileDetails {
    readonly type: ProjectileDetailsType.BULLET;
    readonly damage: number;
}

export interface SplashDamage extends BaseProjectileDetails {
    readonly type: ProjectileDetailsType.SPLASH;
    readonly numRicochets: 0;
    readonly damage: number;
    /** Tiles away from target that will be hit by grenade. */
    readonly damageManhattanDistanceRadius: number;
    /** 
     * If a target is within damageManhattanDistanceRadius from the grenade's 
     * target tile, the damange dealt to the target is 
     * (damage - pow(tilesAwayDamageReduction, <tiles_away>)).
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
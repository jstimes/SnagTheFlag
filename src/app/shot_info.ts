import { Point } from 'src/app/math/point';

export interface ShotInfo {
    // TODO friendly fire?
    readonly isShotFromBlueTeam: boolean;
    readonly fromCanvasCoords: Point;
    readonly aimAngleRadiansClockwise: number;
    readonly damage: number;
    readonly numRicochets: number;
}
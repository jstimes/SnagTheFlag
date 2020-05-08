import { Point } from 'src/app/math/point';
import { Ray } from 'src/app/math/collision_detection';

export interface Target {
    /** Only needed to be set when object hitting target is expected to be reflected. */
    readonly normal?: Point;
    readonly ray: Ray;
    readonly tile: Point;
    readonly canvasCoords: Point;
    readonly maxDistance: number;
}
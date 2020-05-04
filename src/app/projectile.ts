import { Point } from 'src/app/math/point';
import { Ray } from 'src/app/math/collision_detection';
import { Grid } from 'src/app/grid';
import { THEME } from 'src/app/theme';
import { ShotInfo } from 'src/app/shot_info';

const PROJECTILE_CANVAS_RADIUS = Grid.TILE_SIZE / 12;
const PROJECTILE_SPEED_PER_MS = Grid.TILE_SIZE / 90;

// TODO - extract into shared constant
const TWO_PI = Math.PI * 2;

export interface Target {
    readonly normal: Point;
    readonly tile?: Point;
    readonly canvasCoords: Point;
}

export class Projectile {

    private readonly context: CanvasRenderingContext2D;
    readonly ray: Ray;
    readonly maxDistance: number;
    readonly shotInfo: ShotInfo;
    readonly target: Target;
    distance: number;

    constructor(params: {
        context: CanvasRenderingContext2D;
        ray: Ray;
        shotInfo: ShotInfo;
        maxDistance: number;
        target: Target;
    }) {
        this.context = params.context;
        this.ray = params.ray;
        this.maxDistance = params.maxDistance;
        this.shotInfo = params.shotInfo;
        this.distance = 0;
        this.target = params.target;
    }

    update(elapsedMs: number): void {
        this.distance = this.distance + PROJECTILE_SPEED_PER_MS * elapsedMs;
    }

    // TODO - draw trail?
    //      - particles on hit?
    render(): void {
        if (this.distance > this.maxDistance) {
            return;
        }
        const context = this.context;
        const currentPointCanvas = this.ray.pointAtDistance(this.distance);

        context.fillStyle = THEME.projectileColor;
        context.beginPath();
        context.arc(currentPointCanvas.x, currentPointCanvas.y, PROJECTILE_CANVAS_RADIUS, 0, TWO_PI);
        context.closePath();
        context.fill();
    }
}
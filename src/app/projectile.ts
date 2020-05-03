import { Point } from 'src/app/math/point';
import { Ray } from 'src/app/math/collision_detection';
import { Grid } from 'src/app/grid';
import { THEME } from 'src/app/theme';

const PROJECTILE_CANVAS_RADIUS = Grid.TILE_SIZE / 12;
const PROJECTILE_SPEED_PER_MS = Grid.TILE_SIZE / 60;

// TODO - extract into shared constant
const TWO_PI = Math.PI * 2;

export class Projectile {

    private readonly context: CanvasRenderingContext2D;
    private readonly ray: Ray;
    readonly maxDistance: number;
    distance: number;

    constructor(params: {
        context: CanvasRenderingContext2D;
        ray: Ray;
        maxDistance: number;
    }) {
        this.context = params.context;
        this.ray = params.ray;
        this.maxDistance = params.maxDistance;
        this.distance = 0;
    }

    update(elapsedMs: number): void {
        const newDistance = this.distance + PROJECTILE_SPEED_PER_MS * elapsedMs;
        if (newDistance > this.maxDistance) {
            return;
        }
        this.distance = newDistance;
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
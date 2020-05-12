import { Point } from 'src/app/math/point';
import { THEME } from '../theme';
import { Grid } from '../grid';

export class Spawner {

    readonly tileCoords: Point;
    readonly teamIndex: number;
    readonly turnsBetweenSpawns: number;
    private turnsSinceLastSpawn: number;

    constructor(params: {
        readonly tileCoords: Point;
        readonly teamIndex: number;
        readonly turnsBetweenSpawns: number;
    }) {
        this.tileCoords = params.tileCoords;
        this.teamIndex = params.teamIndex;
        this.turnsBetweenSpawns = params.turnsBetweenSpawns;
        this.turnsSinceLastSpawn = 0;
    }

    update(elapsedMs: number): void {

    }

    advanceTurn(): void {
        this.turnsSinceLastSpawn += 1;
    }

    checkAndHandleRespawn(): boolean {
        if (this.turnsSinceLastSpawn === this.turnsBetweenSpawns) {
            this.turnsSinceLastSpawn = 0;
            return true;
        }
        return false;
    }

    render(context: CanvasRenderingContext2D): void {
        context.strokeStyle = this.teamIndex === 0 ? THEME.blueCharacterReadyColor : THEME.redCharacterReadyColor;

        const tileCanvasCenter = Grid.getCanvasFromTileCoords(this.tileCoords).add(Grid.HALF_TILE);
        const radiansThick = Math.PI / 16;
        const radiansOffset = Math.PI / 32;
        let theta = 0;
        const end = Math.PI * 2 - radiansThick;
        const radius = Grid.TILE_SIZE * .4;
        while (theta < end) {
            context.beginPath();
            context.arc(
                tileCanvasCenter.x,
                tileCanvasCenter.y,
                radius,
                theta,
                theta + radiansThick,
            );
            context.stroke();
            theta += radiansThick + radiansOffset;
        }
    }
}
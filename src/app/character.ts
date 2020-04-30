import { Point } from 'src/app/math/point';
import { Grid } from 'src/app/grid';
import { THEME } from 'src/app/theme';

const TWO_PI = Math.PI * 2;

/** Represents one squad member on a team. */
export class Character {
    tileCoords: Point;
    readonly isBlueTeam: boolean;

    constructor(params: { startCoords: Point; isBlueTeam: boolean }) {
        this.tileCoords = params.startCoords;
        this.isBlueTeam = params.isBlueTeam;
    }

    render(context: CanvasRenderingContext2D): void {
        const tileCenterCanvas = Grid.getCanvasFromTileCoords(this.tileCoords)
            .add(new Point(Grid.TILE_SIZE / 2, Grid.TILE_SIZE / 2));
        const radius = Grid.TILE_SIZE / 4;
        context.fillStyle = this.isBlueTeam ? THEME.blueFlagColor : THEME.redFlagColor;
        context.beginPath();
        context.arc(tileCenterCanvas.x, tileCenterCanvas.y, radius, 0, TWO_PI);
        context.closePath();
        context.fill();
    }
}
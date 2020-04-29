
import { Point } from 'src/app/math/point';
import { Grid } from 'src/app/grid';
import { THEME } from 'src/app/theme';

export class Flag {
    readonly isBlue: boolean;
    tileCoords: Point;

    constructor({ tileCoords, isBlue }: { tileCoords: Point; isBlue: boolean }) {
        this.tileCoords = tileCoords;
        this.isBlue = isBlue;
    }

    update(elapsedMs: number) {

    }

    render(context: CanvasRenderingContext2D): void {
        const tileCanvasTopLeft = Grid.getCanvasFromTileCoords(this.tileCoords);
        // Flag pole.
        const topMargin = Grid.TILE_SIZE * .2;
        const leftMargin = Grid.TILE_SIZE * .1;
        const flagPoleWidth = leftMargin;
        context.fillStyle = THEME.flagPoleColor;
        context.fillRect(
            tileCanvasTopLeft.x + leftMargin,
            tileCanvasTopLeft.y + topMargin,
            flagPoleWidth,
            Grid.TILE_SIZE - topMargin);

        // Flag.
        const rightMargin = leftMargin;
        const height = Grid.TILE_SIZE * .36;
        context.fillStyle = this.isBlue ? THEME.blueFlagColor : THEME.redFlagColor;
        context.fillRect(
            tileCanvasTopLeft.x + leftMargin + flagPoleWidth,
            tileCanvasTopLeft.y + topMargin,
            Grid.TILE_SIZE - leftMargin - flagPoleWidth - rightMargin,
            height);
    }
}
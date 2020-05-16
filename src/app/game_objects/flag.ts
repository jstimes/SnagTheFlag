
import { Point } from 'src/app/math/point';
import { Grid } from 'src/app/grid';
import { THEME } from 'src/app/theme';

export class Flag {
    readonly teamIndex: number;
    tileCoords: Point;
    readonly startTileCoords: Point;

    private isTaken: boolean;
    private getTileTopLeft?: () => Point;

    constructor({ tileCoords, teamIndex }:
        { tileCoords: Point; teamIndex: number }) {
        this.startTileCoords = tileCoords;
        this.tileCoords = tileCoords;
        this.teamIndex = teamIndex;
    }

    setIsTaken(getTileTopLeft: () => Point): void {
        this.isTaken = true;
        this.getTileTopLeft = getTileTopLeft;
    }

    isAtStart(): boolean {
        return this.startTileCoords.equals(this.tileCoords);
    }

    returnToStart(): void {
        this.setDropped();
        this.tileCoords = this.startTileCoords;
    }

    setDropped(): void {
        this.isTaken = false;
        this.getTileTopLeft = undefined;
    }

    getCurrentTile(): Point {
        if (!this.isTaken) {
            return this.tileCoords;
        }
        const tile = Grid.getTileFromCanvasCoords(this.getTileTopLeft!());
        return tile;
    }

    update(elapsedMs: number) {

    }

    render(context: CanvasRenderingContext2D): void {
        let tileCanvasTopLeft = Grid.getCanvasFromTileCoords(this.tileCoords);
        if (this.isTaken) {
            tileCanvasTopLeft = this.getTileTopLeft!();
        }

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
        context.fillStyle = this.teamIndex === 0
            ? THEME.blueFlagColor
            : THEME.redFlagColor;
        context.fillRect(
            tileCanvasTopLeft.x + leftMargin + flagPoleWidth,
            tileCanvasTopLeft.y + topMargin,
            Grid.TILE_SIZE - leftMargin - flagPoleWidth - rightMargin,
            height);
    }
}
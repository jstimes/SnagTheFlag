import { Point } from 'src/app/math/point';
import { UP, DOWN, LEFT, RIGHT } from 'src/app/math/direction';
import { RENDER_SETTINGS } from 'src/app/render_settings';

/** 
 * Constants and utilities for a grid of tiles. 
 * Does not/should not store 'map' data (state).
 */
export class Grid {

    static readonly TILE_SIZE = 40;
    static readonly TILES_WIDE = RENDER_SETTINGS.canvasWidth / Grid.TILE_SIZE;
    static readonly TILES_TALL = RENDER_SETTINGS.canvasHeight / Grid.TILE_SIZE;

    static getCanvasFromTileCoords(tileCoords: Point): Point {
        return new Point(
            tileCoords.x * Grid.TILE_SIZE,
            tileCoords.y * Grid.TILE_SIZE);
    }

    static getTileFromCanvasCoords(canvasCoords: Point): Point {
        return new Point(
            Math.floor(canvasCoords.x / Grid.TILE_SIZE),
            Math.floor(canvasCoords.y / Grid.TILE_SIZE));
    }

    static inbounds(tileCoords: Point): boolean {
        return tileCoords.x >= 0 && tileCoords.x < Grid.TILES_WIDE &&
            tileCoords.y >= 0 && tileCoords.y < Grid.TILES_TALL;
    }

    static getAdjacentTiles(tileCoords: Point): Point[] {
        const result = [];

        const upAdjacent = tileCoords.add(UP);
        const downAdjacent = tileCoords.add(DOWN);
        const leftAdjacent = tileCoords.add(LEFT);
        const rightAdjacent = tileCoords.add(RIGHT);

        if (Grid.inbounds(upAdjacent)) result.push(upAdjacent);
        if (Grid.inbounds(downAdjacent)) result.push(downAdjacent);
        if (Grid.inbounds(leftAdjacent)) result.push(leftAdjacent);
        if (Grid.inbounds(rightAdjacent)) result.push(rightAdjacent);

        return result;
    }
}
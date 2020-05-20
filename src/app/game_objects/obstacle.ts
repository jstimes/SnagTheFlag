import { Point } from 'src/app/math/point';
import { Grid } from 'src/app/grid';
import { THEME } from 'src/app/theme';
import { LineSegment } from 'src/app/math/collision_detection';

import WhiteDrywallTexture from 'src/assets/white_drywall_texture.jpg';
import { Texture } from '../texture';

export class Obstacle {
    tileCoords: Point;
    texture: Texture = new Texture(WhiteDrywallTexture);

    constructor(tileCoords: Point) {
        this.tileCoords = tileCoords;
    }

    update(elapsedMs: number) {

    }

    render(context: CanvasRenderingContext2D): void {
        const tileCanvasTopLeft = Grid.getCanvasFromTileCoords(this.tileCoords);
        context.fillStyle = THEME.obstacleColor;
        context.fillRect(
            tileCanvasTopLeft.x, tileCanvasTopLeft.y,
            Grid.TILE_SIZE, Grid.TILE_SIZE);
        if (THEME.isUsingTextures) {
            this.texture.tryDrawing({
                context,
                sourceX: tileCanvasTopLeft.x, sourceY: tileCanvasTopLeft.y,
                sourceWidth: Grid.TILE_SIZE, sourceHeight: Grid.TILE_SIZE,
                canvasX: tileCanvasTopLeft.x, canvasY: tileCanvasTopLeft.y,
                canvasWidth: Grid.TILE_SIZE,
                canvasHeight: Grid.TILE_SIZE,
            });
        }
    }

    // TODO - cache after first construction.
    getEdges(): LineSegment[] {
        const topLeftCorner = Grid.getCanvasFromTileCoords(this.tileCoords);
        const topRightCorner = topLeftCorner.add(new Point(Grid.TILE_SIZE, 0));
        const bottomLeftCorner =
            topLeftCorner.add(new Point(0, Grid.TILE_SIZE));
        const bottomRightCorner =
            topLeftCorner.add(new Point(Grid.TILE_SIZE, Grid.TILE_SIZE));
        const topEdge =
            new LineSegment(topLeftCorner, topRightCorner, new Point(0, -1));
        const rightEdge =
            new LineSegment(topRightCorner, bottomRightCorner, new Point(1, 0));
        const bottomEdge =
            new LineSegment(
                bottomLeftCorner, bottomRightCorner, new Point(0, 1));
        const leftEdge =
            new LineSegment(topLeftCorner, bottomLeftCorner, new Point(-1, 0));
        return [
            topEdge,
            rightEdge,
            bottomEdge,
            leftEdge,
        ];
    }
}
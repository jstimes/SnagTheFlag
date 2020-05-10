import { Point } from 'src/app/math/point';
import { Element } from 'src/app/ui/element';
import { RENDER_SETTINGS } from 'src/app/render_settings';

/*
 * All coordinates should be in the space [[0, 1] x [0, 1]]
 * Where (0, 0) is top left corner of canvas, and [1, 1] is bottom right.
 */

export interface TextBoxDimensions {
    readonly topLeft: Point;
    readonly size: Point;
    readonly text: string;
}

export interface TextBoxStyle {
    readonly fontSize: number;
    /** Hex strings. */
    readonly color: string;
    readonly textColor: string;
}

export class TextBox implements Element {

    /* Params */
    private readonly topLeft: Point;
    private readonly size: Point;
    private readonly text: string;
    private readonly fontSize: number;
    /** Hex strings */
    private readonly color: string;
    private readonly textColor: string;

    constructor({ dimensions, style }: {
        dimensions: TextBoxDimensions;
        style: TextBoxStyle;
    }) {
        this.topLeft = dimensions.topLeft;
        this.size = dimensions.size;
        this.text = dimensions.text;
        this.fontSize = style.fontSize;
        this.color = style.color;
        this.textColor = style.textColor;
    }

    readonly render = (context: CanvasRenderingContext2D) => {
        const topLeftCanvas = this.getCanvasCoords(this.topLeft);
        const sizeCanvas = this.getCanvasCoords(this.size);
        context.fillStyle = this.color
        context.fillRect(topLeftCanvas.x, topLeftCanvas.y, sizeCanvas.x, sizeCanvas.y);

        context.fillStyle = this.textColor;
        const fontSize = this.fontSize;
        context.font = `${fontSize}px fantasy`;
        const textWidth = context.measureText(this.text).width;
        const boxCenterCanvas = this.getCanvasCoords(this.getBoxCenter());
        context.fillText(
            this.text,
            boxCenterCanvas.x - textWidth / 2,
            boxCenterCanvas.y + fontSize / 4);
    };

    readonly onClick = (uiCoords: Point) => {
        // No-op
        return;
    };

    readonly onMouseMove = (uiCoords: Point) => {
        // No-op
        return;
    };

    /** UI Coords. */
    private getBoxCenter(): Point {
        return new Point(this.topLeft.x + this.size.x / 2, this.topLeft.y + this.size.y / 2);
    }

    private getCanvasCoords(uiCoords: Point): Point {
        return new Point(uiCoords.x * RENDER_SETTINGS.canvasWidth, uiCoords.y * RENDER_SETTINGS.canvasHeight);
    }
}
import { Point } from 'src/app/math/point';
import { Element } from 'src/app/ui/element';
import { RENDER_SETTINGS } from 'src/app/render_settings';

/*
 * All coordinates should be in the space [[0, 1] x [0, 1]]
 * Where (0, 0) is top left corner of canvas, and [1, 1] is bottom right.
 */

interface ButtonParams {
    readonly topLeft: Point;
    readonly size: Point;

    readonly text: string;
    readonly fontSize: number;

    /** Hex strings */
    readonly color: string;
    readonly hoverColor: string;
    readonly textColor: string;

    readonly onClickCallback: () => void;
}

export class Button implements Element {

    /* Params */
    private readonly topLeft: Point;
    private readonly size: Point;

    private readonly text: string;
    private readonly fontSize: number;

    /** Hex strings */
    private readonly color: string;
    private readonly hoverColor: string;
    private readonly textColor: string;

    private readonly onClickCallback: () => void;

    /* State */
    private isHovered: boolean;

    constructor(params: ButtonParams) {
        this.topLeft = params.topLeft;
        this.size = params.size;
        this.text = params.text;
        this.fontSize = params.fontSize;
        this.color = params.color;
        this.textColor = params.textColor;
        this.hoverColor = params.hoverColor;
        this.onClickCallback = params.onClickCallback;

        this.isHovered = false;
    }

    readonly render = (context: CanvasRenderingContext2D) => {
        const topLeftCanvas = this.getCanvasCoords(this.topLeft);
        const sizeCanvas = this.getCanvasCoords(this.size);
        context.fillStyle = this.isHovered ? this.hoverColor : this.color;
        context.fillRect(topLeftCanvas.x, topLeftCanvas.y, sizeCanvas.x, sizeCanvas.y);

        context.fillStyle = this.textColor;
        const fontSize = this.fontSize;
        context.font = `${fontSize}px fantasy`;
        const textWidth = context.measureText(this.text).width;
        const buttonCenterCanvas = this.getCanvasCoords(this.getButtonCenter());
        context.fillText(
            this.text,
            buttonCenterCanvas.x - textWidth / 2,
            buttonCenterCanvas.y + fontSize / 4);
    };

    readonly onClick = (uiCoords: Point) => {
        if (this.isInButton(uiCoords)) {
            this.onClickCallback();
        }
    };

    readonly onMouseMove = (uiCoords: Point) => {
        this.isHovered = this.isInButton(uiCoords);
    };

    private isInButton(uiCoords: Point): boolean {
        const isX = uiCoords.x >= this.topLeft.x && uiCoords.x <= (this.topLeft.x + this.size.x);
        const isY = uiCoords.y >= this.topLeft.y && uiCoords.y <= (this.topLeft.y + this.size.y);
        return isX && isY;
    }

    /** UI Coords. */
    private getButtonCenter(): Point {
        return new Point(this.topLeft.x + this.size.x / 2, this.topLeft.y + this.size.y / 2);
    }

    private getCanvasCoords(uiCoords: Point): Point {
        return new Point(uiCoords.x * RENDER_SETTINGS.canvasWidth, uiCoords.y * RENDER_SETTINGS.canvasHeight);
    }
}
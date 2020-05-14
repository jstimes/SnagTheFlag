import { Point } from 'src/app/math/point';
import { Element } from 'src/app/ui/element';
import { RENDER_SETTINGS } from 'src/app/render_settings';

/*
 * All coordinates should be in the space [[0, 1] x [0, 1]]
 * Where (0, 0) is top left corner of canvas, and [1, 1] is bottom right.
 */

/**
 * Manages a set of elements by:
 * - rendering them,
 * - checking if they are clicked/moused over
 */
export class UiManager {

    private readonly context: CanvasRenderingContext2D;
    private readonly elements: Element[];

    constructor(context: CanvasRenderingContext2D) {
        this.context = context;
        this.elements = [];
    }

    addElement(element: Element): void {
        this.elements.push(element);
    }

    removeElement(element: Element): void {
        this.elements.splice(this.elements.indexOf(element), 1);
    }

    onMouseMove(canvasCoords: Point): void {
        const uiCoords = this.getUiCoords(canvasCoords);
        for (const element of this.elements) {
            element.onMouseMove(uiCoords);
        }
    }

    onClick(canvasCoords: Point): boolean {
        const uiCoords = this.getUiCoords(canvasCoords);
        for (const element of this.elements) {
            if (element.onClick(uiCoords)) {
                return true;
            }
        }
        return false;
    }

    render(): void {
        for (const element of this.elements) {
            element.render(this.context);
        }
    }

    private getUiCoords(canvasCoords: Point): Point {
        return new Point(
            canvasCoords.x / RENDER_SETTINGS.canvasWidth,
            canvasCoords.y / RENDER_SETTINGS.canvasHeight);
    }
}
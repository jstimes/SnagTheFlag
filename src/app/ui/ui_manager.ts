import { Point } from 'src/app/math/point';
import { Element } from 'src/app/ui/element';

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

    private readonly canvas: HTMLCanvasElement;
    private readonly context: CanvasRenderingContext2D;
    private readonly elements: Element[];

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.context = this.canvas.getContext('2d');
        this.elements = [];
    }

    addElement(element: Element): void {
        this.elements.push(element);
    }

    onMouseMove(event: MouseEvent): void {
        const uiCoords = this.getUiCoords(event);
        for (const element of this.elements) {
            element.onMouseMove(uiCoords);
        }
    }

    onClick(event: MouseEvent): void {
        const uiCoords = this.getUiCoords(event);
        for (const element of this.elements) {
            element.onClick(uiCoords);
        }
    }

    render(): void {
        for (const element of this.elements) {
            element.render(this.context);
        }
    }

    private getUiCoords(event: MouseEvent): Point {
        const canvasRect = this.canvas.getBoundingClientRect();
        return new Point(
            (event.clientX - canvasRect.left) / canvasRect.width,
            (event.clientY - canvasRect.top) / canvasRect.height);
    }
}
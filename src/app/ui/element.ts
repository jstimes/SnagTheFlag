import { Point } from 'src/app/math/point';


export interface Element {
    /** Returns whether element handled the click. */
    readonly onClick: (uiCoords: Point) => boolean;
    readonly onMouseMove: (uiCoords: Point) => void;
    readonly render: (context: CanvasRenderingContext2D) => void;
}
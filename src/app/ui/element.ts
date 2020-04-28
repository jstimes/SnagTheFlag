import { Point } from 'src/app/math/point';


export interface Element {
    /** TODO maybe return boolean to know if click was handled. */
    readonly onClick: (uiCoords: Point) => void;
    readonly onMouseMove: (uiCoords: Point) => void;
    readonly render: (context: CanvasRenderingContext2D) => void;
}
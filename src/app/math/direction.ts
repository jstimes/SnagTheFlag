import { Point } from './point';

export const UP: Point = new Point(0, -1);
export const DOWN: Point = new Point(0, 1);
export const LEFT: Point = new Point(-1, 0);
export const RIGHT: Point = new Point(1, 0);

export function rotateClockwise(direction: Point): Point {
    switch (direction) {
        case UP:
            return RIGHT;
        case RIGHT:
            return DOWN;
        case DOWN:
            return LEFT;
        case LEFT:
            return UP;
    }
    throw new Error(`This is a 2d game template, not 3d!`);
}

export function rotateCounterClockwise(direction: Point): Point {
    switch (direction) {
        case UP:
            return LEFT;
        case LEFT:
            return DOWN;
        case DOWN:
            return RIGHT;
        case RIGHT:
            return UP;
    }
    throw new Error(`This is a 2d game template, not 3d!`);
}
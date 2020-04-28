import { Point } from './point';

export type Lerp = (a: number, b: number, t: number) => number;

export function lerp(a: number, b: number, t: number): number {
    return (b - a) * t + a;
}

/**
 * It's like lerp but it pushes at the end in a cool way. Maybe.
 */
export function coolLerp(a: number, b: number, t: number): number {
    const start = 0.75;
    return lerp(a, b, Math.max(0, t - start) * 4);
}

export function lerpPoints(a: Point, b: Point, t: number, lerpFn?: Lerp): Point {
    lerpFn = lerpFn || lerp;
    return new Point(lerpFn(a.x, b.x, t), lerpFn(a.y, b.y, t));
}
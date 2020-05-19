import { Point } from 'src/app/math/point';

export class Ray {

    // TODO - expects direction to be normalized.
    constructor(readonly startPt: Point, readonly direction: Point) { }

    pointAtDistance(distance: number): Point {
        return this.startPt.add(this.direction.multiplyScaler(distance));
    }
}

export class LineSegment {
    constructor(
        readonly startPt: Point,
        readonly endPt: Point,
        readonly normal: Point) { }
}

interface RayLineSegmentCollisionResult {
    isCollision: boolean;
    collisionPt?: Point;
}

function old_detectRayLineSegmentCollision(ray: Ray, lineSegment: LineSegment):
    RayLineSegmentCollisionResult {
    // startPt + time * direction = startPt + k * (endPt - startPt)
    // V + t * D = P1 + k * (P2 - P1)
    const d = ray.direction;
    const v = ray.startPt;
    const p1 = lineSegment.startPt;
    const p2 = lineSegment.endPt;
    const dxOverDy = d.x / d.y;

    if (isNaN(dxOverDy)) {
        return detectRayLineSegmentCollision(ray, lineSegment);
    }

    // k = a / b ...
    const a = p1.y * dxOverDy - v.y * dxOverDy - p1.x + v.x;
    const b = (p2.x - p1.x) - dxOverDy * (p2.y - p1.y);
    const k = a / b;

    // TODO <= >= ?
    if (k < 0 || k > 1) {
        return { isCollision: false };
    }

    // Plug k into startPt + k * (endPt - startPt) to get intersection.
    const collisionPt = p1.add(p2.subtract(p1).multiplyScaler(k));

    return {
        isCollision: true,
        collisionPt,
    };
}

class Line {

    readonly m: number;
    readonly b: number;

    constructor(m: number, b: number) {
        this.m = m;
        this.b = b;
    }

    static from(p1: Point, p2: Point): Line {
        const m = (p2.y - p1.y) / (p2.x - p1.x);
        const b = (-m * p1.x) + p1.y;
        return new Line(m, b);
    }

    isVertical(): boolean {
        return !isFinite(this.m);
    }

    getYvalueAtX(x: number): number {
        return this.m * x + this.b;
    }
}

export function detectRayLineSegmentCollision(
    ray: Ray, lineSegment: LineSegment): RayLineSegmentCollisionResult {
    const v = ray.startPt;
    const d = ray.direction;
    const dNormal = d.getNormalVectorClockwise();
    const p1 = lineSegment.startPt;
    const p2 = lineSegment.endPt;

    const vToP1 = p1.subtract(v);
    const vToP2 = p2.subtract(v);
    const normalDotP1 = dNormal.dot(vToP1);
    const normalDotP2 = dNormal.dot(vToP2);
    if (!haveOppositeSigns(normalDotP1, normalDotP2)) {
        return { isCollision: false };
    }

    const rayLine = Line.from(ray.startPt, ray.startPt.add(ray.direction));
    const segmentLine = Line.from(lineSegment.startPt, lineSegment.endPt);

    let intersectionPt;
    if (segmentLine.isVertical()) {
        // Find point on ray where x = lineSegment.startPt.x
        const y = rayLine.getYvalueAtX(p1.x);
        intersectionPt = new Point(p1.x, y);
    } else if (rayLine.isVertical()) {
        // Find point on lineSegment where y = ray.startPt.y
        const y = segmentLine.getYvalueAtX(v.x);
        intersectionPt = new Point(v.x, y);
    } else {
        // Neither lines are vertical, solve normally for intersection 
        // point of two lines.
        // y1 = m1 x1 + b1, y2 = m2 x2 + b2
        // At intersection, y1 = y2, x1 = x2:
        // m1 x + b1 = m2 x + b2
        // (m1 - m2) x = b2 - b1
        // x = (b2 - b1) / (m1 - m2)
        const intersectionX =
            (segmentLine.b - rayLine.b) / (rayLine.m - segmentLine.m);
        const intersectionY = rayLine.getYvalueAtX(intersectionX);
        intersectionPt = new Point(intersectionX, intersectionY);
    }

    // Ensure intersection point is forwards from ray start.
    const vToIntersection = intersectionPt.subtract(v);
    if (d.dot(vToIntersection) < 0) {
        return { isCollision: false };
    }

    return {
        isCollision: true,
        collisionPt: intersectionPt,
    }
}

function haveOppositeSigns(a: number, b: number): boolean {
    const strictly = (a > 0 && b < 0) || (a < 0 && b > 0);
    if (strictly) {
        return true;
    }
    return (isZero(a) && !isZero(b)) || (isZero(b) && !isZero(a));
}

// TODO - constants.
const epsilon = .000001;
function isZero(n: number): boolean {
    return Math.abs(n) < epsilon;
}
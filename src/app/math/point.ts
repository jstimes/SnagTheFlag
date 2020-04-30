export class Point {

    x: number;
    y: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    add(other: Point): Point {
        return new Point(this.x + other.x, this.y + other.y);
    }

    subtract(other: Point): Point {
        return new Point(this.x - other.x, this.y - other.y);
    }

    dot(other: Point): number {
        return this.x * other.x + this.y * other.y;
    }

    getMagnitude(): number {
        return Math.sqrt(this.dot(this));
    }

    normalize(): Point {
        const mag = this.getMagnitude();
        return new Point(this.x / mag, this.y / mag);
    }

    multiplyScaler(scaler: number): Point {
        return new Point(this.x * scaler, this.y * scaler);
    }

    distanceTo(to: Point): number {
        return to.subtract(this).getMagnitude();
    }

    manhattanDistanceTo(other: Point): number {
        return Math.abs(this.x - other.x) + Math.abs(this.y - other.y);
    }

    getPointRotationRadians(): number {
        return Math.atan2(this.y, this.x);
    }

    equals(other: Point): boolean {
        return this.x === other.x && this.y === other.y;
    }

    toString(): string {
        return `(${this.x}, ${this.y})`;
    }
}

export function containsPoint(x: Point, points: Point[]): boolean {
    for (let i = 0; i < points.length; i++) {
        if (x.equals(points[i])) {
            return true;
        }
    }
    return false;
}

export function pointFromSerialized(pt: { x: number; y: number }): Point {
    return new Point(pt.x, pt.y);
}
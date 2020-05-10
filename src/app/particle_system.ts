import { Point } from 'src/app/math/point';
import { lerp } from 'src/app/math/lerp';
import { lerpColors, hexStringToColor, colorToString } from 'src/app/color';
import { Grid } from 'src/app/grid';

export enum ParticleShape {
    CIRCLE = 'Circle',
    ELLIPSE = 'Ellipse',
    LINE = 'Line',
    PLUS = 'Plus',
}

interface Particle {
    lifetimeMs: number;

    canvasPosition: Point;
    readonly direction: Point;
    readonly deltaPositionPerMs: number;

    readonly rotationRadians: number;

    readonly color: string;
    readonly shape: ParticleShape;
    readonly radius: number;
}

const TWO_PI = Math.PI * 2;

// TODO - this should be ParticlesParams when more diversity is supported.
const MIN_RADIUS = .035 * Grid.TILE_SIZE;
const MAX_RADIUS = .065 * Grid.TILE_SIZE;

// TODO - add normal direction and max angle deviation.
export interface ParticleSystemParams {
    readonly startPositionCanvas: Point;
    readonly particleCount: number;

    /** 
     * Particle colors will be radonmly 
     * interpolated between colorA and colorB.
     */
    readonly colorA: string;

    /** 
     * Particle colors will be radonmly 
     * interpolated between colorA and colorB.
     */
    readonly colorB: string;

    readonly shape: ParticleShape;

    readonly minParticleSpeed: number;
    readonly maxParticleSpeed: number;
    readonly minLifetimeMs: number;
    readonly maxLifetimeMs: number;
}

/** 
 * Emits small particles from a point. 
 * Currently just little circles.
 */
export class ParticleSystem {

    private readonly particles: Particle[];

    /** True while there are still particles floating around. */
    isAlive: boolean;

    params: ParticleSystemParams;

    constructor(params: ParticleSystemParams) {
        this.params = params;
        this.particles = [];

        // Make the particles. All start at some position, but have different direction.
        this.isAlive = true;

        const deltaTheta = TWO_PI / params.particleCount;
        for (let i = 0; i < params.particleCount; i++) {
            const theta = i * deltaTheta;
            const direction = new Point(Math.cos(theta), Math.sin(theta)).normalize();
            const speed = lerp(params.minParticleSpeed, params.maxParticleSpeed, Math.random());
            const lifetimeMs = lerp(params.minLifetimeMs, params.maxLifetimeMs, Math.random());
            const color = lerpColors(
                hexStringToColor(params.colorA),
                hexStringToColor(params.colorB),
                Math.random());
            const radius = lerp(MIN_RADIUS, MAX_RADIUS, Math.random());
            // Only give ellipses a rotation.
            const rotationRadians = this.params.shape === ParticleShape.ELLIPSE
                ? direction.getPointRotationRadians()
                : 0;
            this.particles.push({
                canvasPosition: params.startPositionCanvas,
                direction,
                lifetimeMs,
                deltaPositionPerMs: speed,
                color: colorToString(color),
                shape: this.params.shape,
                radius,
                rotationRadians: rotationRadians,
            });
        }
    }

    update(elapsedMs: number): void {
        let isAnyParticleAlive = false;
        this.particles.forEach((particle: Particle) => {
            particle.lifetimeMs -= elapsedMs;
            if (particle.lifetimeMs > 0) {
                isAnyParticleAlive = true;
                particle.canvasPosition =
                    particle.canvasPosition.add(
                        particle.direction.multiplyScaler(
                            particle.deltaPositionPerMs * elapsedMs));
            }
        });
        this.isAlive = isAnyParticleAlive;
    }

    render(context: CanvasRenderingContext2D): void {
        this.particles.forEach((particle: Particle) => {
            if (particle.lifetimeMs <= 0) {
                return;
            }
            const particleCenter = particle.canvasPosition;
            switch (particle.shape) {
                case ParticleShape.CIRCLE:
                    context.save();
                    context.fillStyle = particle.color;
                    context.beginPath();
                    context.arc(
                        particleCenter.x,
                        particleCenter.y,
                        particle.radius,
                        0,
                        TWO_PI);
                    context.fill();
                    context.restore();
                    break;
                case ParticleShape.LINE:
                    context.save();
                    context.strokeStyle = particle.color;
                    context.lineWidth = 1;
                    context.beginPath();
                    const halfLineOffset =
                        particle.direction.multiplyScaler(
                            particle.radius);
                    const start =
                        particleCenter.add(halfLineOffset);
                    const end = particleCenter.subtract(halfLineOffset);
                    context.moveTo(start.x, start.y);
                    context.lineTo(end.x, end.y);
                    context.stroke();
                    context.restore();
                    break;
                case ParticleShape.ELLIPSE:
                    context.save();
                    context.fillStyle = particle.color;
                    context.beginPath();
                    const xRadius = particle.radius;
                    const yRadius = particle.radius / 2;
                    context.ellipse(
                        particleCenter.x,
                        particleCenter.y,
                        xRadius,
                        yRadius,
                        particle.rotationRadians,
                        0,
                        TWO_PI);
                    context.fill();
                    context.restore();
                    break;
                case ParticleShape.PLUS:
                    context.fillStyle = particle.color;
                    const radius = particle.radius;
                    const halfThickness = radius / 4;
                    const horizontalStart = particle.canvasPosition.subtract(new Point(radius, halfThickness));
                    context.fillRect(horizontalStart.x, horizontalStart.y, radius * 2, halfThickness * 2);
                    const verticalStart = particle.canvasPosition.subtract(new Point(halfThickness, radius));
                    context.fillRect(verticalStart.x, verticalStart.y, halfThickness * 2, radius * 2);
                    break;
            }

        });

    }
}
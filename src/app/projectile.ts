import { Point } from 'src/app/math/point';
import { Ray } from 'src/app/math/collision_detection';
import { Grid } from 'src/app/grid';
import { THEME } from 'src/app/theme';
import { ShotInfo, ProjectileDetailsType, ProjectileDetails } from 'src/app/shot_info';
import { hexStringToColor } from 'src/app/color';
import { Target } from 'src/app/math/target';
import { AnimationState } from 'src/app/animation_state';

const MAX_TRAIL_DISTANCE = Grid.TILE_SIZE * 3;

// TODO - extract into shared constant
const TWO_PI = Math.PI * 2;

const speeds: Map<ProjectileDetailsType, number> = new Map([
    [ProjectileDetailsType.BULLET, Grid.TILE_SIZE / 80],
    [ProjectileDetailsType.SPLASH, Grid.TILE_SIZE / 160],
]);

const radii: Map<ProjectileDetailsType, number> = new Map([
    [ProjectileDetailsType.BULLET, Grid.TILE_SIZE / 12],
    [ProjectileDetailsType.SPLASH, Grid.TILE_SIZE / 6],
]);

const colors: Map<ProjectileDetailsType, string> = new Map([
    [ProjectileDetailsType.BULLET, THEME.bulletColor],
    [ProjectileDetailsType.SPLASH, THEME.grenadeColor],
]);

// TODO - this is hack-E.
interface Trail {
    ray: Ray;
    distance: number;
    maxDistance: number;
}

export class Projectile {

    private readonly context: CanvasRenderingContext2D;
    readonly projectileDetails: ProjectileDetails;
    readonly fromTeamIndex: number;

    private timesRicocheted: number;
    private trails: Trail[];

    animationState: AnimationState;
    isDead: boolean;

    constructor(params: {
        context: CanvasRenderingContext2D;
        projectileDetails: ProjectileDetails;
        targets: Target[];
        fromTeamIndex: number;
    }) {
        this.context = params.context;
        this.projectileDetails = params.projectileDetails;
        if (params.targets.length === 0) {
            throw new Error(`Created a projectile with no targets`);
        }
        this.setNewTargets(params.targets);
        this.trails = [{
            ray: this.animationState.currentTarget!.ray,
            distance: 0,
            maxDistance: this.animationState.currentTarget!.maxDistance,
        }];
        this.fromTeamIndex = params.fromTeamIndex;
        this.timesRicocheted = 0;
        this.isDead = false;
    }

    update(elapsedMs: number): void {
        const currentTarget = this.animationState.currentTarget!;
        const direction = currentTarget.ray.direction;
        const positionUpdate = direction.multiplyScaler(this.animationState.movementSpeedMs * elapsedMs);
        const distanceUpdate = positionUpdate.getMagnitude();
        for (const trail of this.trails) {
            trail.distance += distanceUpdate;
        }

        if (!this.animationState.isAnimating) {
            return;
        }
        this.animationState.currentCenterCanvas = this.animationState.currentCenterCanvas
            .add(positionUpdate);
        const totalDistanceTravelled = currentTarget.ray.startPt
            .distanceTo(this.animationState.currentCenterCanvas);
        if (totalDistanceTravelled < currentTarget.maxDistance) {
            return;
        }
        // Ensure end state is centered in destination tile.
        this.animationState.currentCenterCanvas =
            this.animationState.currentTarget!.canvasCoords;
        if (this.animationState.remainingTargets.length === 0) {
            this.animationState.isAnimating = false;
            return;
        }

        this.animationState.currentTarget = this.animationState.remainingTargets.shift()!;
        this.trails.push({
            ray: this.animationState.currentTarget.ray,
            distance: 0,
            maxDistance: this.animationState.currentTarget.maxDistance,
        });
        this.timesRicocheted += 1;
    }

    isAtFinalTarget(): boolean {
        return !this.isDead && !this.animationState.isAnimating;
    }

    setNewTargets(targets: Target[]): void {
        const firstTarget = targets.shift()!;
        const remainingTargets = targets;
        const currentCenterCanvas = this.animationState != null ? this.animationState.currentCenterCanvas : firstTarget.ray.startPt;
        this.animationState = {
            movementSpeedMs: speeds.get(this.projectileDetails.type)!,
            currentCenterCanvas,
            isAnimating: true,
            currentTarget: firstTarget,
            remainingTargets,
        };
    }

    getCurrentTarget(): Target {
        return this.animationState.currentTarget!;
    }

    getNumRicochetsLeft(): number {
        return this.projectileDetails.type === ProjectileDetailsType.BULLET ? this.projectileDetails.numRicochets - this.timesRicocheted : 0;
    }

    setIsDead(): void {
        this.isDead = true;
    }

    isTrailGone(): boolean {
        return this.trails.every((trail) => trail.distance > trail.maxDistance + MAX_TRAIL_DISTANCE);
    }

    render(): void {
        const context = this.context;
        const radius = radii.get(this.projectileDetails.type)!;

        for (const trail of this.trails) {
            if (trail.distance < radius || trail.distance > trail.maxDistance + MAX_TRAIL_DISTANCE) {
                continue;
            }
            const bacwardsDirection = trail.ray.direction.multiplyScaler(-1);
            let overshotDistance = 0;
            const trailGradientStartPointCanvas = trail.ray.pointAtDistance(trail.distance);
            let trailRenderStartPointCanvas = trailGradientStartPointCanvas;
            if (trail.distance > trail.maxDistance) {
                overshotDistance = MAX_TRAIL_DISTANCE - (trail.distance - trail.maxDistance);
                trailRenderStartPointCanvas = trail.ray.pointAtDistance(trail.maxDistance);
            }
            let trailDistance = Math.min(
                MAX_TRAIL_DISTANCE,
                trail.distance,
                trail.distance + overshotDistance);
            const trailFadePointCanvas = trailGradientStartPointCanvas.add(
                bacwardsDirection.multiplyScaler(trailDistance));
            const gradient = context.createLinearGradient(
                trailGradientStartPointCanvas.x, trailGradientStartPointCanvas.y,
                trailFadePointCanvas.x, trailFadePointCanvas.y);
            const fullColor = THEME.projectileTrailColor;
            const fadedColor = `${THEME.projectileTrailColor}00`;
            gradient.addColorStop(0, fullColor);
            gradient.addColorStop(1, fadedColor);

            // Draw trail.
            context.strokeStyle = gradient;
            context.beginPath();
            context.moveTo(trailRenderStartPointCanvas.x, trailRenderStartPointCanvas.y);
            context.lineTo(trailFadePointCanvas.x, trailFadePointCanvas.y);
            context.closePath();
            context.stroke();
        }

        if (this.isDead) {
            return;
        }

        const currentPointCanvas = this.animationState.currentCenterCanvas;
        context.fillStyle = colors.get(this.projectileDetails.type)!;
        context.beginPath();
        context.arc(currentPointCanvas.x, currentPointCanvas.y, radius, 0, TWO_PI);
        context.closePath();
        context.fill();
    }
}
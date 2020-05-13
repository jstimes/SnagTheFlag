import { Point } from 'src/app/math/point';
import { Grid } from 'src/app/grid';
import { THEME } from 'src/app/theme';
import { LineSegment, Ray } from 'src/app/math/collision_detection';
import { ShotInfo, ProjectileDetailsType } from 'src/app/shot_info';
import { ActionType } from 'src/app/actions';
import { CharacterAbility, CharacterSettings, CharacterAbilityState, ThrowGrenadeAbility, ClassType, CharacterAbilityType } from 'src/app/character_settings';
import { AnimationState } from 'src/app/animation_state';
import { getProjectileTargetsPath, getRayForShot } from 'src/app/target_finder';
import { Target } from 'src/app/math/target';

const TWO_PI = Math.PI * 2;

const CHARACTER_CIRCLE_RADIUS = Grid.TILE_SIZE / 4;

interface GameDelegate {
    getCurrentAimPath(params: {
        ray: Ray;
        startingTileCoords: Point;
        fromTeamIndex: number;
        numRicochets: number;
    }): Target[];
}

/** Represents one squad member on a team. */
export class Character {
    readonly teamIndex: number;
    readonly settings: CharacterSettings;
    readonly index: number;

    // Turn-state.
    hasMoved: boolean;
    hasShot: boolean;
    extraAbilities: CharacterAbility[];
    isFinishedWithTurn: boolean;

    private isAiming: boolean;
    private aimAngleRadiansClockwise: number;
    private aimPath: Target[];

    // Game-state.
    health: number;
    tileCoords: Point;
    characterAbilityTypeToAbilityState:
        Map<CharacterAbilityType, CharacterAbilityState>;
    animationState: AnimationState;
    gameDelegate: GameDelegate;

    constructor(params: {
        startCoords: Point;
        teamIndex: number;
        index: number;
        settings: CharacterSettings;
        gameDelegate: GameDelegate;
    }) {
        this.gameDelegate = params.gameDelegate;
        this.tileCoords = params.startCoords;
        this.animationState = {
            movementSpeedMs: Grid.TILE_SIZE * .005,
            isAnimating: false,
            remainingTargets: [],
            currentCenterCanvas:
                Grid.getCanvasFromTileCoords(this.tileCoords)
                    .add(Grid.HALF_TILE),
        }
        this.teamIndex = params.teamIndex;
        this.index = params.index;

        this.settings = params.settings;

        this.health = this.settings.maxHealth;
        this.hasMoved = false;
        this.characterAbilityTypeToAbilityState = new Map();
        for (const extraAction of this.settings.extraActions) {
            const actionState: CharacterAbilityState = {
                cooldownTurnsLeft: 0,
            };
            if (extraAction.maxUses !== 0) {
                actionState.usesLeft = extraAction.maxUses;
            }
            this.characterAbilityTypeToAbilityState
                .set(extraAction.abilityType, actionState);
        }
        this.isAiming = false;
        this.aimAngleRadiansClockwise = 0;
        this.calculateTargetPath();

        this.resetTurnState();
    }

    render(context: CanvasRenderingContext2D): void {
        const tileTopLeftCanvas =
            this.animationState.currentCenterCanvas.subtract(Grid.HALF_TILE);
        const tileCenterCanvas = this.animationState.currentCenterCanvas;

        context.fillStyle = this.getCharacterColor();
        context.beginPath();
        context.arc(
            tileCenterCanvas.x,
            tileCenterCanvas.y,
            CHARACTER_CIRCLE_RADIUS,
            0,
            TWO_PI);
        context.closePath();
        context.fill();

        // Character number.
        const tileBottomLeftCanvas =
            tileTopLeftCanvas.add(new Point(0, Grid.TILE_SIZE));
        const text = `${this.index + 1}`;
        context.fillStyle = THEME.characterTextColor;
        const fontSize = 12;
        const margins = new Point(Grid.TILE_SIZE / 12, Grid.TILE_SIZE / 12);
        context.font = `${fontSize}px fantasy`;
        context.fillText(
            text,
            tileBottomLeftCanvas.x + margins.x,
            tileBottomLeftCanvas.y - margins.y);

        // Health bar.
        const healthBarHeight = Grid.TILE_SIZE / 10;
        const healthBarWidth = 2 * CHARACTER_CIRCLE_RADIUS + healthBarHeight;
        const fractionHealthLeft = this.health / this.settings.maxHealth;
        const healthBarTopLeft = tileCenterCanvas
            .add(new Point(
                -healthBarWidth / 2,
                -CHARACTER_CIRCLE_RADIUS - healthBarHeight * 2));
        const remainingHealthWidth = healthBarWidth * fractionHealthLeft;
        context.fillStyle = THEME.remainingHealthBarColor;
        context.fillRect(
            healthBarTopLeft.x, healthBarTopLeft.y,
            remainingHealthWidth, healthBarHeight);
        if (this.health !== this.settings.maxHealth) {
            context.fillStyle = THEME.lostHealthBarColor;
            context.fillRect(
                healthBarTopLeft.x + remainingHealthWidth,
                healthBarTopLeft.y,
                healthBarWidth - remainingHealthWidth,
                healthBarHeight);
        }

        // Class Symbol.
        switch (this.settings.type) {
            case ClassType.SCOUT:
                // Boots.
                const ankleWidth = CHARACTER_CIRCLE_RADIUS * .75;
                const ankleHeight = CHARACTER_CIRCLE_RADIUS * .75;
                const toeWidth = CHARACTER_CIRCLE_RADIUS * .75;
                const toeHeight = ankleHeight / 2;
                const topLeftBoot =
                    tileCenterCanvas
                        .add(new Point(-ankleWidth, -ankleHeight / 2));
                context.fillStyle = '#804526';
                context.fillRect(
                    topLeftBoot.x, topLeftBoot.y,
                    ankleWidth, ankleHeight);
                context.fillRect(
                    tileCenterCanvas.x,
                    tileCenterCanvas.y,
                    toeWidth, toeHeight);
                break;

            case ClassType.ASSAULT:
                // Up-arrows.
                context.fillStyle = '#e8d100';
                const arrowWidth = CHARACTER_CIRCLE_RADIUS * .6;
                const arrowHeight = CHARACTER_CIRCLE_RADIUS * .4;
                const drawPathFrom = (start: Point) => {
                    context.beginPath();
                    context.moveTo(start.x, start.y);
                    const offsets: Point[] = [
                        new Point(0, -arrowHeight / 2),
                        new Point(arrowWidth / 2, -arrowHeight),
                        new Point(arrowWidth, -arrowHeight / 2),
                        new Point(arrowWidth, 0),
                        new Point(arrowWidth / 2, -arrowHeight / 2),
                    ];
                    for (const offset of offsets) {
                        const pt = start.add(offset);
                        context.lineTo(pt.x, pt.y);
                    }
                    context.closePath();
                    context.fill();
                };
                const topArrowStart = tileCenterCanvas
                    .add(new Point(-arrowWidth / 2, 0));
                const bottomArrowStart = topArrowStart
                    .add(new Point(0, arrowHeight * 1.5));
                drawPathFrom(topArrowStart);
                drawPathFrom(bottomArrowStart);
                break;

            case ClassType.SNIPER:
                // Crosshair.
                context.strokeStyle = '#1d1570';
                context.fillStyle = '#1d1570';

                // Plus.
                const radius = CHARACTER_CIRCLE_RADIUS * .7;
                const width = radius * 2;
                const height = CHARACTER_CIRCLE_RADIUS * .2;
                const horizontalTopLeft = tileCenterCanvas
                    .add(new Point(-width / 2, -height / 2));
                context.fillRect(
                    horizontalTopLeft.x, horizontalTopLeft.y,
                    width, height);
                const verticalTopLeft = tileCenterCanvas
                    .add(new Point(-height / 2, -width / 2));
                context.fillRect(
                    verticalTopLeft.x, verticalTopLeft.y,
                    height, width);

                // Circle.
                context.beginPath();
                context.arc(
                    tileCenterCanvas.x, tileCenterCanvas.y, radius, 0, TWO_PI);
                context.closePath();
                context.stroke();
                break;

            case ClassType.DEMOLITION:

                // Draw flame.
                const flameWidth = CHARACTER_CIRCLE_RADIUS * .75;
                const flameHeight = CHARACTER_CIRCLE_RADIUS * .85;
                const drawFlameFrom = (start: Point) => {
                    context.beginPath();
                    context.moveTo(start.x, start.y);
                    const offsets: Point[] = [
                        new Point(flameWidth / 4, -flameHeight / 4),
                        new Point(flameWidth / 2, -flameHeight / 2),
                        new Point(flameWidth, -flameHeight / 4),
                        new Point(flameWidth, 0),
                        new Point(3 * flameWidth / 4, flameHeight / 2),
                        new Point(flameWidth / 4, flameHeight / 2),
                    ];
                    for (const offset of offsets) {
                        const pt = start.add(offset);
                        context.lineTo(pt.x, pt.y);
                    }
                    context.closePath();
                    context.fill();
                };
                const flameStart = tileCenterCanvas
                    .add(new Point(-flameWidth / 2, 0));
                const gradient = context.createLinearGradient(
                    flameStart.x, flameStart.y - flameHeight,
                    flameStart.x + flameWidth, flameStart.y);
                const fullColor = '#f74d40';
                const fadedColor = `#e8ba3c`;
                gradient.addColorStop(0, fullColor);
                gradient.addColorStop(1, fadedColor);
                context.fillStyle = gradient;
                drawFlameFrom(flameStart);
                break;
        }

        // Aim indicator.
        if (!this.isAiming) {
            return;
        }

        context.strokeStyle = '#80585fbb';
        const aimLength = this.settings.gun.aimIndicatorLength;
        let startPt = tileCenterCanvas;
        let distance = 0;
        context.beginPath();
        context.moveTo(startPt.x, startPt.y);
        for (const target of this.aimPath) {
            let endPt = target.canvasCoords;
            const newDistance = startPt.distanceTo(endPt);
            const isMaxLength = newDistance + distance > aimLength;
            if (isMaxLength) {
                const offset = endPt.subtract(startPt)
                    .normalize()
                    .multiplyScaler(aimLength - distance);
                endPt = startPt.add(offset);
            }
            context.lineTo(endPt.x, endPt.y);
            startPt = endPt;
            distance += newDistance;
            if (isMaxLength) {
                break;
            }
        }
        context.stroke();
    }

    getCurrentTile(): Point {
        if (!this.animationState.isAnimating) {
            return this.tileCoords;
        }
        return Grid.getTileFromCanvasCoords(
            this.animationState.currentCenterCanvas);
    }

    moveTo(tileCoords: Point, targetsPath: Target[]): void {
        if (this.isFinishedWithTurn || this.hasMoved) {
            throw new Error(`Already moved.`);
        }
        this.animationState.currentCenterCanvas =
            Grid.getCanvasFromTileCoords(this.tileCoords).add(Grid.HALF_TILE);
        this.animationState.currentTarget = targetsPath.shift()!;
        this.tileCoords = tileCoords;
        this.animationState.remainingTargets = targetsPath;
        this.animationState.isAnimating = true;
        this.hasMoved = true;
        this.checkAndSetTurnOver();
    }

    // TODO - look into sharing the animation update logic.
    update(elapsedMs: number): void {
        if (this.isAiming) {
            this.calculateTargetPath();
        }
        if (!this.animationState.isAnimating) {
            return;
        }
        const currentTarget = this.animationState.currentTarget!;
        const direction = currentTarget.ray.direction;
        const positionUpdate = direction
            .multiplyScaler(this.animationState.movementSpeedMs * elapsedMs);
        const distanceUpdate = positionUpdate.getMagnitude();

        this.animationState.currentCenterCanvas =
            this.animationState.currentCenterCanvas
                .add(positionUpdate);
        const totalDistanceTravelled = currentTarget.ray.startPt
            .distanceTo(this.animationState.currentCenterCanvas);
        if (totalDistanceTravelled < currentTarget.maxDistance) {
            return;
        }
        // Ensure end state is centered in destination tile.
        this.animationState.currentCenterCanvas = currentTarget.canvasCoords;
        if (this.animationState.remainingTargets.length === 0) {
            this.animationState.isAnimating = false;
            return;
        }

        this.animationState.currentTarget =
            this.animationState.remainingTargets.shift()!;
    }

    skipAnimation(): void {
        const remainingTargets = this.animationState.remainingTargets;
        const finalTargetIndex = remainingTargets.length - 1;
        const finalTarget = remainingTargets.length > 0
            ? this.animationState.remainingTargets[finalTargetIndex]
            : this.animationState.currentTarget!;
        this.animationState.currentCenterCanvas = finalTarget.canvasCoords;
        this.animationState.remainingTargets = [];
        this.animationState.isAnimating = false;
    }

    isAlive(): boolean {
        return this.health > 0;
    }

    startAiming(): void {
        if (!this.canShoot()) {
            throw new Error(`Already shot or used non-free action.`);
        }
        this.isAiming = true;
    }

    cancelAiming(): void {
        this.isAiming = false;
    }

    setAim(angle: number): void {
        this.aimAngleRadiansClockwise = angle;
    }

    getAim(): number {
        return this.aimAngleRadiansClockwise;
    }

    private calculateTargetPath(): void {
        this.aimPath = this.gameDelegate.getCurrentAimPath({
            ray: getRayForShot(this.getCurrentShotInfo()[0]),
            startingTileCoords: this.tileCoords,
            fromTeamIndex: this.teamIndex,
            numRicochets: this.settings.gun.projectileDetails.numRicochets,
        });
    }

    shoot(): ShotInfo[] {
        if (!this.canShoot()) {
            throw new Error(`Already shot or used non - free action.`);
        }
        this.isAiming = false;
        this.hasShot = true;
        this.extraAbilities = this.extraAbilities
            .filter((ability: CharacterAbility) => {
                return ability.isFree;
            });
        this.checkAndSetTurnOver();

        return this.getCurrentShotInfo();
    }

    // TODO - shouldn't be public
    getCurrentShotInfo(): ShotInfo[] {
        // Shoot from center of tile.
        const tileCenter =
            Grid.getCanvasFromTileCoords(this.tileCoords).add(Grid.HALF_TILE);
        const straightShotInfo: ShotInfo = {
            fromTeamIndex: this.teamIndex,
            fromTileCoords: this.tileCoords,
            fromCanvasCoords: tileCenter,
            aimAngleRadiansClockwise: this.aimAngleRadiansClockwise,
            projectileDetails: this.settings.gun.projectileDetails,
        };
        const shotInfos: ShotInfo[] = [straightShotInfo];
        if (this.settings.gun.spray) {
            const spray = this.settings.gun.spray;
            while (shotInfos.length < spray.projectiles) {
                const offsetDirection = shotInfos.length % 2 === 0 ? 1 : -1;
                const aimAngle =
                    this.aimAngleRadiansClockwise
                    + spray.offsetAngleRadians * offsetDirection;
                shotInfos.push({
                    fromTeamIndex: this.teamIndex,
                    fromTileCoords: this.tileCoords,
                    fromCanvasCoords: tileCenter,
                    aimAngleRadiansClockwise: aimAngle,
                    projectileDetails: this.settings.gun.projectileDetails,
                });
            }
        }
        return shotInfos;
    }

    getGrenadeAbility(): ThrowGrenadeAbility {
        const grenadeAbility =
            this.extraAbilities
                .find((ability) => {
                    return ability.abilityType ===
                        CharacterAbilityType.THROW_GRENADE;
                });
        if (grenadeAbility == null) {
            throw new Error(
                `Trying to getGrenadeAction but character does not have ` +
                `that action`);
        }
        return grenadeAbility as ThrowGrenadeAbility;
    }

    useAbility(abilityType: CharacterAbilityType): void {
        const action = this.extraAbilities
            .find((extraAbility) => extraAbility.abilityType === abilityType);
        if (action == null) {
            throw new Error(
                `Character doesn't have ability for ActionType: ` +
                `${abilityType}`);
        }
        this.extraAbilities = this.extraAbilities
            .filter((extraAbility) => extraAbility.abilityType !== abilityType);
        const actionState =
            this.characterAbilityTypeToAbilityState.get(abilityType)!;
        if (actionState.usesLeft) {
            actionState.usesLeft -= 1;
        }
        actionState.cooldownTurnsLeft =
            [...this.settings.extraActions]
                .find((extraAction) => {
                    return extraAction.abilityType === action.abilityType;
                })!.cooldownTurns;
        if (!action.isFree) {
            // Character can't shoot and use non-free actions in same turn.
            this.hasShot = true;
            this.extraAbilities = this.extraAbilities
                .filter((ability: CharacterAbility) => {
                    return ability.isFree;
                });
        }
        this.checkAndSetTurnOver();
    }

    regenHealth(amount: number): void {
        this.health = Math.min(this.health + amount, this.settings.maxHealth);
    }

    // TODO - cache after first construction.
    getEdges(): LineSegment[] {
        const tileTopLeftCanvas = Grid.getCanvasFromTileCoords(this.tileCoords);
        const tileCenterCanvas = tileTopLeftCanvas.add(Grid.HALF_TILE);
        const topLeftCorner =
            tileCenterCanvas.subtract(
                new Point(CHARACTER_CIRCLE_RADIUS, CHARACTER_CIRCLE_RADIUS));
        const topRightCorner =
            topLeftCorner.add(new Point(CHARACTER_CIRCLE_RADIUS * 2, 0));
        const bottomLeftCorner =
            topLeftCorner.add(new Point(0, CHARACTER_CIRCLE_RADIUS * 2));
        const bottomRightCorner =
            topLeftCorner
                .add(new Point(
                    CHARACTER_CIRCLE_RADIUS * 2,
                    CHARACTER_CIRCLE_RADIUS * 2));
        const topEdge =
            new LineSegment(topLeftCorner, topRightCorner, new Point(0, -1));
        const rightEdge =
            new LineSegment(topRightCorner, bottomRightCorner, new Point(1, 0));
        const bottomEdge =
            new LineSegment(
                bottomLeftCorner, bottomRightCorner, new Point(0, 1));
        const leftEdge =
            new LineSegment(topLeftCorner, bottomLeftCorner, new Point(-1, 0));
        return [
            topEdge,
            rightEdge,
            bottomEdge,
            leftEdge,
        ];
    }

    isTurnOver(): boolean {
        return this.isFinishedWithTurn;
    }

    setTurnOver(): void {
        this.isFinishedWithTurn = true;
        this.isAiming = false;
    }

    resetTurnState(): void {
        this.hasMoved = false;
        this.hasShot = false;
        this.extraAbilities = [];
        for (const extraAbility of this.settings.extraActions) {
            const state =
                this.characterAbilityTypeToAbilityState
                    .get(extraAbility.abilityType);
            if (!state) {
                throw new Error(
                    `Didn't initialize characterActionsToState for ` +
                    `${extraAbility.abilityType}`);
            }
            if (state.usesLeft !== 0 && state.cooldownTurnsLeft <= 0) {
                this.extraAbilities.push(extraAbility);
            }
            state.cooldownTurnsLeft -= 1;
        }
        this.isFinishedWithTurn = false;
    }

    private checkAndSetTurnOver(): void {
        if (this.isFinishedWithTurn) {
            return;
        }
        if (this.extraAbilities.some((extraAbility) => extraAbility.isFree)) {
            // If free actions available, need to explicitly call setTurnOver.
            return;
        }
        if (this.hasMoved
            && (this.hasShot || !this.settings.gun.canFireAfterMoving)) {
            this.setTurnOver();
            return;
        }
        if (this.hasShot && !this.settings.gun.canFireAfterMoving) {
            this.setTurnOver();
            return;
        }
    }

    private getCharacterColor(): string {
        if (this.isFinishedWithTurn) {
            return this.teamIndex === 0 ?
                THEME.blueCharacterDoneColor : THEME.redCharacterDoneColor;
        }
        return this.teamIndex === 0 ?
            THEME.blueCharacterReadyColor : THEME.redCharacterReadyColor;
    }

    canShoot(): boolean {
        if (this.isFinishedWithTurn) {
            return false;
        }
        if (!this.settings.gun.canFireAfterMoving && this.hasMoved) {
            return false;
        }
        return !this.hasShot;
    }
}
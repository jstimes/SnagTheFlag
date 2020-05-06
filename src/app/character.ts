import { Point } from 'src/app/math/point';
import { Grid } from 'src/app/grid';
import { THEME } from 'src/app/theme';
import { LineSegment } from 'src/app/math/collision_detection';
import { ShotInfo, Grenade, DamageType } from 'src/app/shot_info';
import { ActionType } from 'src/app/actions';

const TWO_PI = Math.PI * 2;

/** Abilities characters can perform in addition to moving and shooting. */
export interface BaseCharacterAbility {
    /**  Max times this ability can be used. 0 indicates unlimited. */
    readonly maxUses: number;
    /** Number of turns after use before ability can be reused. */
    readonly cooldownTurns: number;
    /** 
     * Whether the ability can be used in addition to shooting (true)
     * or is used in place of shooting (false). 
     */
    readonly isFree: boolean;
}

export interface HealAbility extends BaseCharacterAbility {
    readonly actionType: ActionType.HEAL;
    readonly healAmount: number;
}

export interface ThrowGrenadeAbility extends BaseCharacterAbility {
    readonly actionType: ActionType.THROW_GRENADE;
    readonly grenade: Grenade;
}

type CharacterAbility = HealAbility | ThrowGrenadeAbility;

/** Metadata about CharacterActions. */
interface CharacterActionState {
    /** Remaining number of uses for action, or null if unlimited. */
    usesLeft?: number;
    /** Remaining number of turns until this action can be used again. */
    cooldownTurnsLeft: number;
}

/** Parameters describing basic character attributes. */
interface CharacterSettings {
    /** Starting health. */
    readonly maxHealth: number;
    /** Manhattan distance from curent position a character can move */
    readonly maxMovesPerTurn: number;
    /** 
     * Whether the character is allowed to shoot after moving. 
     * If true, shooting ends character turn without option to move.
     * TODO - add canMoveAfterShooting ?
     */
    readonly canFireAfterMoving: boolean;
    /** Special abilities a character can use. */
    readonly extraActions: Set<CharacterAbility>;
    /** Damage dealt when shooting. */
    readonly shotDamage: number;
    /** 
     * Number of times a character's shot projectile can
     * bounce off of walls.
     */
    readonly numRicochets: number;
}

const DEFAULT_HEAL: HealAbility = {
    actionType: ActionType.HEAL,
    healAmount: 3,
    maxUses: 2,
    cooldownTurns: 2,
    isFree: false,
};
const DEFAULT_GRENADE: ThrowGrenadeAbility = {
    actionType: ActionType.THROW_GRENADE,
    grenade: {
        damage: 5,
        damageManhattanDistanceRadius: 1,
        tilesAwayDamageReduction: .6,
        maxManhattanDistance: 4,
    },
    maxUses: 1,
    cooldownTurns: 0,
    isFree: false,
};
const DEFAULT_CHARACTER_SETTINGS: CharacterSettings = {
    maxHealth: 10,
    maxMovesPerTurn: 8,
    canFireAfterMoving: true,
    extraActions: new Set<CharacterAbility>([
        DEFAULT_HEAL,
        DEFAULT_GRENADE,
    ]),
    shotDamage: 5,
    numRicochets: 2,
};

const AIM_ANGLE_RADIANS_DELTA = Math.PI / 32;
const CHARACTER_CIRCLE_RADIUS = Grid.TILE_SIZE / 4;

/** Represents one squad member on a team. */
export class Character {
    readonly isBlueTeam: boolean;
    readonly settings: CharacterSettings;
    readonly index: number;

    // Turn-state.
    hasMoved: boolean;
    hasShot: boolean;
    extraActionsAvailable: CharacterAbility[];
    isFinishedWithTurn: boolean;

    private isAiming: boolean;
    private aimAngleRadiansClockwise: number;

    // Game-state.
    hasFlag: boolean;
    health: number;
    tileCoords: Point;
    characterActionsToState: Map<ActionType, CharacterActionState>;

    constructor(params: { startCoords: Point; isBlueTeam: boolean; index: number }) {
        this.tileCoords = params.startCoords;
        this.isBlueTeam = params.isBlueTeam;
        this.index = params.index;

        this.settings = DEFAULT_CHARACTER_SETTINGS;

        this.health = this.settings.maxHealth;
        this.hasFlag = false;
        this.hasMoved = false;
        this.characterActionsToState = new Map();
        for (const extraAction of this.settings.extraActions) {
            const actionState: CharacterActionState = {
                cooldownTurnsLeft: 0,
            };
            if (extraAction.maxUses !== 0) {
                actionState.usesLeft = extraAction.maxUses;
            }
            this.characterActionsToState.set(extraAction.actionType, actionState);
        }
        this.isAiming = false;
        this.aimAngleRadiansClockwise = 0;

        this.resetTurnState();
    }

    render(context: CanvasRenderingContext2D): void {

        // Red or blue circle.
        const tileTopLeftCanvas = Grid.getCanvasFromTileCoords(this.tileCoords);
        const tileCenterCanvas = tileTopLeftCanvas.add(Grid.HALF_TILE);

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
        const tileBottomLeftCanvas = tileTopLeftCanvas.add(new Point(0, Grid.TILE_SIZE));
        const text = `${this.index + 1}`;
        context.fillStyle = THEME.textColor;
        const fontSize = 12;
        const margins = new Point(Grid.TILE_SIZE / 12, Grid.TILE_SIZE / 12);
        context.font = `${fontSize}px fantasy`;
        context.fillText(
            text,
            tileBottomLeftCanvas.x + margins.x,
            tileBottomLeftCanvas.y - margins.y);

        // Draws bounding box.
        // for (const edge of this.getEdges()) {
        //     context.beginPath();
        //     context.moveTo(edge.startPt.x, edge.startPt.y);
        //     context.lineTo(edge.endPt.x, edge.endPt.y);
        //     context.closePath();
        //     context.stroke();
        // }

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
        context.fillRect(healthBarTopLeft.x, healthBarTopLeft.y, remainingHealthWidth, healthBarHeight);
        if (this.health !== this.settings.maxHealth) {
            context.fillStyle = THEME.lostHealthBarColor;
            context.fillRect(
                healthBarTopLeft.x + remainingHealthWidth,
                healthBarTopLeft.y,
                healthBarWidth - remainingHealthWidth,
                healthBarHeight);
        }

        // Aim indicator.
        if (!this.isAiming) {
            return;
        }
        const aimLength = .75 * Grid.TILE_SIZE;
        const aimIndicatorEnd =
            tileCenterCanvas
                .add(new Point(
                    Math.cos(this.aimAngleRadiansClockwise),
                    Math.sin(this.aimAngleRadiansClockwise))
                    .multiplyScaler(aimLength));
        context.beginPath();
        context.moveTo(tileCenterCanvas.x, tileCenterCanvas.y);
        context.lineTo(aimIndicatorEnd.x, aimIndicatorEnd.y);
        context.closePath();
        context.stroke();
    }

    moveTo(tileCoords: Point): void {
        if (this.isFinishedWithTurn || this.hasMoved) {
            throw new Error(`Already moved.`);
        }
        // TODO - animate with movement speed and update.
        this.tileCoords = tileCoords;
        this.hasMoved = true;
        this.checkAndSetTurnOver();
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

    aimCounterClockwise(): void {
        this.aimAngleRadiansClockwise -= AIM_ANGLE_RADIANS_DELTA;
    }

    aimClockwise(): void {
        this.aimAngleRadiansClockwise += AIM_ANGLE_RADIANS_DELTA;
    }

    shoot(): ShotInfo {
        if (!this.canShoot()) {
            throw new Error(`Already shot or used non-free action.`);
        }
        this.isAiming = false;
        this.hasShot = true;
        this.checkAndSetTurnOver();
        const shotInfo: ShotInfo = {
            isShotFromBlueTeam: this.isBlueTeam,
            fromTileCoords: this.tileCoords,
            // Shoot from center of tile.
            fromCanvasCoords: Grid.getCanvasFromTileCoords(this.tileCoords).add(Grid.HALF_TILE),
            aimAngleRadiansClockwise: this.aimAngleRadiansClockwise,
            damage: { type: DamageType.BULLET, damage: this.settings.shotDamage, },
            numRicochets: this.settings.numRicochets,
        };
        return shotInfo;
    }

    getGrenadeAbility(): ThrowGrenadeAbility {
        const grenadeAction = this.extraActionsAvailable
            .find((action) => action.actionType === ActionType.THROW_GRENADE);
        if (grenadeAction == null) {
            throw new Error(`Trying to getGrenadeAction but character does not have that action`);
        }
        return grenadeAction as ThrowGrenadeAbility;
    }

    useAbility(actionType: ActionType): void {
        const action = this.extraActionsAvailable
            .find((extraAction) => extraAction.actionType === actionType);
        if (action == null) {
            throw new Error(`Character doesn't have ability for ActionType: ${actionType}`);
        }
        this.extraActionsAvailable = this.extraActionsAvailable
            .filter((extraAction) => extraAction.actionType !== actionType);
        const actionState = this.characterActionsToState.get(actionType)!;
        if (actionState.usesLeft) {
            actionState.usesLeft -= 1;
        }
        actionState.cooldownTurnsLeft =
            [...this.settings.extraActions]
                .find((extraAction) => extraAction.actionType === action.actionType)!.cooldownTurns;
        if (!action.isFree) {
            // Character can't shoot and use non-free actions in same turn.
            this.hasShot = true;
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
        const topRightCorner = topLeftCorner.add(new Point(CHARACTER_CIRCLE_RADIUS * 2, 0));
        const bottomLeftCorner = topLeftCorner.add(new Point(0, CHARACTER_CIRCLE_RADIUS * 2));
        const bottomRightCorner = topLeftCorner.add(new Point(CHARACTER_CIRCLE_RADIUS * 2, CHARACTER_CIRCLE_RADIUS * 2));
        const topEdge = new LineSegment(topLeftCorner, topRightCorner, new Point(0, -1));
        const rightEdge = new LineSegment(topRightCorner, bottomRightCorner, new Point(1, 0));
        const bottomEdge = new LineSegment(bottomLeftCorner, bottomRightCorner, new Point(0, 1));
        const leftEdge = new LineSegment(topLeftCorner, bottomLeftCorner, new Point(-1, 0));
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
        this.extraActionsAvailable = [];
        for (const action of this.settings.extraActions) {
            const state = this.characterActionsToState.get(action.actionType);
            if (!state) {
                throw new Error(`Didn't initialize characterActionsToState for ${action.actionType}`);
            }
            if (state.usesLeft !== 0 && state.cooldownTurnsLeft <= 0) {
                this.extraActionsAvailable.push(action);
            }
            state.cooldownTurnsLeft -= 1;
        }
        this.isFinishedWithTurn = false;
    }

    private checkAndSetTurnOver(): void {
        if (this.isFinishedWithTurn) {
            return;
        }
        if (this.extraActionsAvailable.some((charAction) => charAction.isFree)) {
            // If free actions available, need to explicitly call setTurnOver.
            return;
        }
        if (this.hasMoved && (this.hasShot || !this.settings.canFireAfterMoving)) {
            this.setTurnOver();
            return;
        }
        if (this.hasShot && !this.settings.canFireAfterMoving) {
            this.setTurnOver();
            return;
        }
    }

    private getCharacterColor(): string {
        if (this.isFinishedWithTurn) {
            return this.isBlueTeam ? THEME.blueCharacterDoneColor : THEME.redCharacterDoneColor;
        }
        return this.isBlueTeam ? THEME.blueCharacterReadyColor : THEME.redCharacterReadyColor;
    }

    canShoot(): boolean {
        if (this.isFinishedWithTurn) {
            return false;
        }
        if (!this.settings.canFireAfterMoving && this.hasMoved) {
            return false;
        }
        return !this.hasShot;
    }
}
import { Point } from 'src/app/math/point';
import { Grid } from 'src/app/grid';
import { THEME } from 'src/app/theme';

const TWO_PI = Math.PI * 2;

/** Abilities characters can perform in addition to moving and shooting. */
interface CharacterAction {
    /**  Max times this ability can be used. */
    readonly maxUses: number;
    /** Number of turns after use before ability can be reused. */
    readonly cooldownTurns: number;
    /** 
     * Whether the ability can be used in addition to shooting (true)
     * or is used in place of shooting (false). 
     */
    readonly isFree: boolean;
}

/** Parameters describing basic character attributes. */
interface CharacterSettings {
    /** Starting health. */
    readonly maxHealth: number;
    /** Manhattan distance from curent position a character can move */
    readonly maxMovesPerTurn: number;
    /** Whether the character is allowed to shoot after moving. */
    readonly canShootAfterMoving: boolean;
    /** Special abilities a character can use. */
    readonly extraActions: Set<CharacterAction>;
}

const DEFAULT_CHARACTER_SETTINGS: CharacterSettings = {
    maxHealth: 10,
    maxMovesPerTurn: 4,
    canShootAfterMoving: true,
    extraActions: new Set<CharacterAction>(),
};

/** Represents one squad member on a team. */
export class Character {
    readonly isBlueTeam: boolean;
    readonly settings: CharacterSettings;
    readonly index: number;

    hasFlag: boolean;
    hasMoved: boolean;
    health: number;
    tileCoords: Point;

    constructor(params: { startCoords: Point; isBlueTeam: boolean; index: number }) {
        this.tileCoords = params.startCoords;
        this.isBlueTeam = params.isBlueTeam;
        this.index = params.index;

        // TODO - use character classes.
        this.settings = DEFAULT_CHARACTER_SETTINGS;
        this.health = this.settings.maxHealth;

        this.hasFlag = false;
        this.hasMoved = false;
    }

    render(context: CanvasRenderingContext2D): void {

        // Red or blue circle.
        const tileTopLeftCanvas = Grid.getCanvasFromTileCoords(this.tileCoords);
        const tileCenterCanvas = tileTopLeftCanvas.add(new Point(Grid.TILE_SIZE / 2, Grid.TILE_SIZE / 2));
        const radius = Grid.TILE_SIZE / 4;
        context.fillStyle = this.isBlueTeam ? THEME.blueFlagColor : THEME.redFlagColor;
        context.beginPath();
        context.arc(tileCenterCanvas.x, tileCenterCanvas.y, radius, 0, TWO_PI);
        context.closePath();
        context.fill();

        // Character number.
        const text = `${this.index + 1}`;
        context.fillStyle = THEME.textColor;
        const fontSize = 12;
        const margins = new Point(Grid.TILE_SIZE / 12, fontSize);
        context.font = `${fontSize}px fantasy`;
        context.fillText(
            text,
            tileTopLeftCanvas.x + margins.x,
            tileTopLeftCanvas.y + margins.y);
    }

    moveTo(tileCoords: Point): void {
        // TODO - animate with movement speed and update.
        this.tileCoords = tileCoords;
        this.hasMoved = true;
    }

    isAlive(): boolean {
        return this.health > 0;
    }
}
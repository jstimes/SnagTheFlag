import { RENDER_SETTINGS } from 'src/app/render_settings';
import { Grid } from 'src/app/grid';
import { Point, pointFromSerialized } from 'src/app/math/point';
import { Obstacle } from 'src/app/obstacle';
import { MatchType } from 'src/app/match_type';
import { CONTROLS, ControlMap, EventType, Key } from 'src/app/controls';
import { THEME } from 'src/app/theme';
import { Flag } from 'src/app/flag';
import { LEVELS } from 'src/app/level';
import { GameSettings, DEFAULT_GAME_SETTINGS } from 'src/app/game_settings';
import { Character } from 'src/app/character';

enum GamePhase {
    // Setup:
    CHARACTER_PLACEMENT,
    // Main game:
    COMBAT,
}

enum InputState {
    AWAITING_LOCAL_PLAYER_INPUT,
    // TODO - implement AI
    AWAITING_AI_PLAYER_INPUT,
    // TODO - add online multiplayer
    AWAITING_NETWORK_INPUT,
}

enum ActionType {
    PLACE_CHARACTER,
    MOVE_CHARACTER,
}

interface PlaceCharacterAction {
    type: ActionType.PLACE_CHARACTER;
    tileCoords: Point;
}

interface MoveCharacterAction {
    type: ActionType.MOVE_CHARACTER;
    character: Character;
    tileCoords: Point;
}

type Action = PlaceCharacterAction | MoveCharacterAction;

/** Used for exhaustive Action checking. */
function throwBadAction(action: never): never {
    throw new Error('Action not handled');
}

export class GameManager {

    private readonly canvas: HTMLCanvasElement;
    private readonly context: CanvasRenderingContext2D;
    private readonly levelIndex: number;
    private readonly matchType: MatchType;
    private readonly onExitGameCallback: () => void;

    private gameSettings: GameSettings;
    private obstacles: Obstacle[];
    private redFlag: Flag;
    private blueFlag: Flag;

    private blueSquad: Character[];
    private redSquad: Character[];
    private gamePhase: GamePhase;
    private isBlueTurn: boolean;
    private inputState: InputState;
    private controlMap: ControlMap;

    constructor(
        canvas: HTMLCanvasElement,
        context: CanvasRenderingContext2D,
        params: {
            matchType: MatchType;
            levelIndex: number;
            onExitGameCallback: () => void;
        }) {

        this.canvas = canvas;
        this.context = context;
        this.matchType = params.matchType;
        this.levelIndex = params.levelIndex;
        this.onExitGameCallback = params.onExitGameCallback;
        this.resetGame();
    }

    update(elapsedMs: number): void {
        this.controlMap.check();
        if (this.gamePhase === GamePhase.CHARACTER_PLACEMENT && CONTROLS.hasClick()) {
            const mouseTileCoords = Grid.getTileFromCanvasCoords(CONTROLS.handleClick());
            this.tryPlacingCharacter(mouseTileCoords);
        }
    }

    render(): void {
        const context = this.context;
        context.fillStyle = THEME.gridBackgroundColor;
        context.clearRect(0, 0, RENDER_SETTINGS.canvasWidth, RENDER_SETTINGS.canvasHeight);
        context.fillRect(0, 0, RENDER_SETTINGS.canvasWidth, RENDER_SETTINGS.canvasHeight);

        // Draw grid lines.
        for (let i = 0; i < Grid.TILES_WIDE; i++) {
            const startX = i * Grid.TILE_SIZE;
            const endX = startX;
            const startY = 0;
            const endY = RENDER_SETTINGS.canvasHeight;

            context.beginPath();
            context.strokeStyle = THEME.gridLineColor;
            context.moveTo(startX, startY);
            context.lineTo(endX, endY);
            context.closePath();
            context.stroke();
        }
        for (let i = 0; i < Grid.TILES_TALL; i++) {
            const startX = 0;
            const endX = RENDER_SETTINGS.canvasWidth;
            const startY = i * Grid.TILE_SIZE;
            const endY = startY;

            context.beginPath();
            context.strokeStyle = THEME.gridLineColor;
            context.moveTo(startX, startY);
            context.lineTo(endX, endY);
            context.closePath();
            context.stroke();
        }

        if (this.gamePhase === GamePhase.CHARACTER_PLACEMENT
            && this.inputState === InputState.AWAITING_LOCAL_PLAYER_INPUT) {

            for (const availableTile of this.availableCharacterPlacementTiles) {
                const tileCanvasTopLeft = Grid.getCanvasFromTileCoords(availableTile);
                context.fillStyle = THEME.availableForMovementColor;
                context.fillRect(tileCanvasTopLeft.x, tileCanvasTopLeft.y, Grid.TILE_SIZE, Grid.TILE_SIZE);
            }
            // Indicate hovered tile.
            const mouseTileCoords = Grid.getTileFromCanvasCoords(CONTROLS.getMouseCanvasCoords());
            if (this.availableCharacterPlacementTiles.find((tile) => tile.equals(mouseTileCoords))) {
                const tileCanvasTopLeft = Grid.getCanvasFromTileCoords(mouseTileCoords);
                context.fillStyle = THEME.emptyCellHoverColor;
                context.fillRect(tileCanvasTopLeft.x, tileCanvasTopLeft.y, Grid.TILE_SIZE, Grid.TILE_SIZE);
            }
        }
        for (const obstacle of this.obstacles) {
            obstacle.render(context);
        }
        this.redFlag.render(this.context);
        this.blueFlag.render(this.context);
        for (const character of this.blueSquad.concat(this.redSquad)) {
            character.render(this.context);
        }
    }

    destroy(): void {
        if (this.controlMap) {
            this.controlMap.clear();
        }
    }

    onAction(action: Action): void {
        switch (action.type) {
            case ActionType.PLACE_CHARACTER:
                if (this.gamePhase !== GamePhase.CHARACTER_PLACEMENT) {
                    throw new Error(
                        `PLACE_CHARACTER action only allowed in character placement phase`);
                }
                if (!this.availableCharacterPlacementTiles
                    .find((tile) => tile.equals(action.tileCoords))) {

                    throw new Error(
                        `Invalid character placement location: ${action.tileCoords.toString()}`);
                }
                const squad = this.isBlueTurn ? this.blueSquad : this.redSquad;
                squad.push(new Character({
                    startCoords: action.tileCoords,
                    isBlueTeam: this.isBlueTurn,
                }));
                if (squad.length === this.gameSettings.squadSize) {
                    // Placed all characters, end turn.
                    this.nextTurn();
                } else {
                    this.availableCharacterPlacementTiles = this.availableCharacterPlacementTiles
                        .filter((availableTile) => !availableTile.equals(action.tileCoords));
                }
                break;
            case ActionType.MOVE_CHARACTER:
                // TODO 
                break;
            default:
                throwBadAction(action);
        }
    }

    private nextTurn(): void {
        if (this.gamePhase === GamePhase.CHARACTER_PLACEMENT) {
            if (this.isBlueTurn) {
                this.isBlueTurn = false;
                // TODO check match type when others are supported 
                this.setInputState(InputState.AWAITING_LOCAL_PLAYER_INPUT);
                this.availableCharacterPlacementTiles = this.getAvailableCharacterPlacementTiles();
            } else {
                this.gamePhase = GamePhase.COMBAT;
                this.isBlueTurn = true;
                this.setInputState(InputState.AWAITING_LOCAL_PLAYER_INPUT);
            }
        }
    }

    private tryPlacingCharacter(tileCoords: Point): void {
        if (!this.availableCharacterPlacementTiles.find((tile) => tile.equals(tileCoords))) {
            // TODO - toast can't place here...
            return;
        }

        const placeCharacterAction: PlaceCharacterAction = {
            type: ActionType.PLACE_CHARACTER,
            tileCoords,
        };
        this.onAction(placeCharacterAction);
    }

    private availableCharacterPlacementTiles: Point[];
    private getAvailableCharacterPlacementTiles(): Point[] {
        // TODO - this is very unoptimized...
        const flagCoords = this.isBlueTurn ? this.blueFlag.tileCoords : this.redFlag.tileCoords;
        const maxDistFromFlag = this.gameSettings.maxSpawnDistanceFromFlag;
        const availableTiles = [];
        for (let x = -maxDistFromFlag; x <= maxDistFromFlag; x++) {
            for (let y = -maxDistFromFlag; y <= maxDistFromFlag; y++) {
                const tile = flagCoords.add(new Point(x, y));
                if (tile.manhattanDistanceTo(flagCoords) < maxDistFromFlag
                    && !this.isTileOccupied(tile)
                    && !tile.equals(flagCoords)) {

                    availableTiles.push(tile);
                }
            }
        }
        return availableTiles;
    }

    private setInputState(inputState: InputState): void {
        this.inputState = inputState;
        if (this.gamePhase === GamePhase.CHARACTER_PLACEMENT) {
            // No controls to bind for Character placement... yet.
            return;
        }
        // TODO - configure controls for combat.
        console.log("Time for combat");
    }

    /** 
     * Whether a tile contains an obstacle or character. 
     * Tiles with flags are NOT considered occupied. 
     */
    private isTileOccupied(tileCoords: Point): boolean {
        const potentialObstacle = this.obstacles.find(
            (obstacle: Obstacle) => obstacle.tileCoords.equals(tileCoords));
        const potentialCharacter = this.blueSquad.concat(this.redSquad).find(
            (character) => character.tileCoords.equals(tileCoords));
        return potentialObstacle != null || potentialCharacter != null;
    }

    private resetGame = (): void => {
        this.destroy();
        this.loadLevel();
        this.gameSettings = DEFAULT_GAME_SETTINGS;
        this.gamePhase = GamePhase.CHARACTER_PLACEMENT;
        this.blueSquad = [];
        this.redSquad = [];
        // Blue is always assumed to go first...
        this.isBlueTurn = true;
        this.availableCharacterPlacementTiles = this.getAvailableCharacterPlacementTiles();
        this.setInputState(InputState.AWAITING_LOCAL_PLAYER_INPUT);
        this.controlMap = new ControlMap();
        this.controlMap.add({
            key: Key.Q,
            name: 'Quit',
            func: this.onExitGameCallback,
            eventType: EventType.KeyPress,
        });
        this.controlMap.add({
            key: Key.R,
            name: 'Reset',
            func: this.resetGame,
            eventType: EventType.KeyPress,
        });
    }

    private loadLevel(): void {
        const level = LEVELS[this.levelIndex];
        this.redFlag = new Flag({
            tileCoords: pointFromSerialized(level.data.redFlag),
            isBlue: false,
        });
        this.blueFlag = new Flag({
            tileCoords: pointFromSerialized(level.data.blueFlag),
            isBlue: true,
        });
        this.obstacles = level.data.obstacles.map((serializedPt) => {
            return new Obstacle(pointFromSerialized(serializedPt));
        });
    }
}

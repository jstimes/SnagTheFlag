import { RENDER_SETTINGS } from 'src/app/render_settings';
import { Grid, bfs } from 'src/app/grid';
import { Point, pointFromSerialized } from 'src/app/math/point';
import { Obstacle } from 'src/app/obstacle';
import { MatchType } from 'src/app/match_type';
import { CONTROLS, ControlMap, EventType, Key, numberToKey, numberToOrdinal } from 'src/app/controls';
import { THEME } from 'src/app/theme';
import { Flag } from 'src/app/flag';
import { LEVELS } from 'src/app/level';
import { GameSettings, DEFAULT_GAME_SETTINGS } from 'src/app/game_settings';
import { Character } from 'src/app/character';
import { Hud, TextType, Duration } from 'src/app/hud';


enum GamePhase {
    // Setup.
    CHARACTER_PLACEMENT,
    // Main game.
    COMBAT,
}

enum ActionType {
    PLACE_CHARACTER,
    MOVE_CHARACTER,
    SHOOT,
    END_CHARACTER_TURN,
}

interface PlaceCharacterAction {
    readonly type: ActionType.PLACE_CHARACTER;
    readonly tileCoords: Point;
}

interface MoveCharacterAction {
    readonly type: ActionType.MOVE_CHARACTER;
    readonly character: Character;
    readonly tileCoords: Point;
}

interface EndCharacterTurnAction {
    readonly type: ActionType.END_CHARACTER_TURN;
    readonly character: Character;
}

type Action = PlaceCharacterAction | MoveCharacterAction | EndCharacterTurnAction;

/** Used for exhaustive Action checking. */
function throwBadAction(action: never): never {
    throw new Error('Action not handled');
}

enum SelectedCharacterState {
    AWAITING,
    MOVING,
    SHOOTING,
    // TODO - add other character actions.
}

const MOVE_KEY = Key.M;
const SHOOT_KEY = Key.S;
const END_TURN_KEY = Key.E;

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
    private hud: Hud;

    private blueSquad: Character[];
    private redSquad: Character[];
    private gamePhase: GamePhase;
    private isBlueTurn: boolean;

    private controlMap: ControlMap;
    private selectableTiles: Point[];
    private selectedCharacter?: Character;
    private selectedCharacterState?: SelectedCharacterState;

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
        } else if (this.gamePhase === GamePhase.COMBAT && CONTROLS.hasClick()) {
            const mouseTileCoords = Grid.getTileFromCanvasCoords(CONTROLS.handleClick());
            switch (this.selectedCharacterState) {
                case SelectedCharacterState.AWAITING:
                    this.trySelectingCharacter(mouseTileCoords);
                    break;
                case (SelectedCharacterState.MOVING):
                    this.tryMovingSelectedCharacter(mouseTileCoords);
                    break;
            }
        }
        this.hud.update(elapsedMs);
    }

    render(): void {
        const context = this.context;
        context.fillStyle = THEME.gridBackgroundColor;
        context.clearRect(0, 0, RENDER_SETTINGS.canvasWidth, RENDER_SETTINGS.canvasHeight);
        context.fillRect(0, 0, RENDER_SETTINGS.canvasWidth, RENDER_SETTINGS.canvasHeight);

        if (this.selectableTiles != null && this.selectableTiles.length) {
            for (const availableTile of this.selectableTiles) {
                const tileCanvasTopLeft = Grid.getCanvasFromTileCoords(availableTile);
                context.fillStyle = THEME.availableForMovementColor;
                context.fillRect(tileCanvasTopLeft.x, tileCanvasTopLeft.y, Grid.TILE_SIZE, Grid.TILE_SIZE);
            }
            // Indicate hovered tile.
            const mouseTileCoords = Grid.getTileFromCanvasCoords(CONTROLS.getMouseCanvasCoords());
            if (this.selectableTiles.find((tile) => tile.equals(mouseTileCoords))) {
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
        if (this.selectedCharacter != null) {
            const tileCanvasTopLeft = Grid.getCanvasFromTileCoords(this.selectedCharacter.tileCoords);
            context.strokeStyle = THEME.selectedCharacterOutlineColor;
            context.lineWidth = 2;
            context.strokeRect(tileCanvasTopLeft.x, tileCanvasTopLeft.y, Grid.TILE_SIZE, Grid.TILE_SIZE);
        }

        this.hud.render();
    }

    destroy(): void {
        if (this.controlMap) {
            this.controlMap.clear();
        }
    }

    onAction(action: Action): void {
        const squad = this.isBlueTurn ? this.blueSquad : this.redSquad;
        switch (action.type) {
            case ActionType.PLACE_CHARACTER:
                if (this.gamePhase !== GamePhase.CHARACTER_PLACEMENT) {
                    throw new Error(
                        `PLACE_CHARACTER action only allowed in character placement phase`);
                }
                if (!this.selectableTiles
                    .find((tile) => tile.equals(action.tileCoords))) {

                    throw new Error(
                        `Invalid character placement location: ${action.tileCoords.toString()}`);
                }
                const squadIndex = squad.length;
                squad.push(new Character({
                    startCoords: action.tileCoords,
                    isBlueTeam: this.isBlueTurn,
                    index: squadIndex,
                }));
                if (squad.length === this.gameSettings.squadSize) {
                    // Placed all characters, end turn.
                    this.nextTurn();
                } else {
                    this.selectableTiles = this.selectableTiles
                        .filter((availableTile) => !availableTile.equals(action.tileCoords));
                }
                break;
            case ActionType.MOVE_CHARACTER:
                if (this.gamePhase !== GamePhase.COMBAT) {
                    throw new Error(
                        `MOVE_CHARACTER action only allowed in combat phase`);
                }
                if (!this.selectableTiles
                    .find((tile) => tile.equals(action.tileCoords))) {

                    throw new Error(
                        `Invalid character movement location: ${action.tileCoords.toString()}`);
                }
                const manhattandDistanceAway = action.character.tileCoords.manhattanDistanceTo(action.tileCoords);
                if (manhattandDistanceAway > action.character.settings.maxMovesPerTurn) {
                    throw new Error(`Invalid character movement location (too far): ` +
                        `start: ${action.character.tileCoords.toString()}, end: ${action.tileCoords.toString()}`)
                }
                action.character.moveTo(action.tileCoords);
                if (action.character.isTurnOver()) {
                    const activeSquadMember = squad.find((character: Character) => !character.isTurnOver());
                    if (activeSquadMember) {
                        this.setSelectedCharacter(activeSquadMember.index);
                    } else {
                        this.nextTurn();
                    }
                } else {
                    this.setSelectedCharacterState(SelectedCharacterState.AWAITING);
                }
                break;
            case ActionType.END_CHARACTER_TURN:
                action.character.setTurnOver();
                const activeSquadMember = squad.find((character: Character) => !character.isTurnOver());
                if (activeSquadMember) {
                    this.setSelectedCharacter(activeSquadMember.index);
                } else {
                    this.nextTurn();
                }
                break;
            default:
                throwBadAction(action);
        }
    }

    private nextTurn(): void {
        if (this.gamePhase === GamePhase.CHARACTER_PLACEMENT) {
            if (this.isBlueTurn) {
                this.isBlueTurn = false;
                this.selectableTiles = this.getAvailableTilesForCharacterPlacement();
                this.hud.setText('Red team turn', TextType.TITLE, Duration.LONG);
                this.hud.setText(
                    `Place squad members (${this.gameSettings.squadSize} remaining)`,
                    TextType.SUBTITLE,
                    Duration.LONG);
            } else {
                this.gamePhase = GamePhase.COMBAT;
                this.advanceToNextCombatTurn();
            }
            return;
        }
        this.advanceToNextCombatTurn();
    }

    private advanceToNextCombatTurn(): void {
        this.isBlueTurn = !this.isBlueTurn;
        const squad = this.isBlueTurn ? this.blueSquad : this.redSquad;
        for (const character of squad) {
            character.resetTurnState();
        }
        const teamName = this.isBlueTurn ? `Blue` : `Red`;
        this.setSelectedCharacter(this.getFirstCharacterIndex());
        this.hud.setText(`${teamName} team turn`, TextType.TITLE, Duration.LONG);
        this.hud.setText(
            `Move squad members`,
            TextType.SUBTITLE,
            Duration.LONG);
    }

    private tryPlacingCharacter(tileCoords: Point): void {
        if (!this.selectableTiles.find((tile) => tile.equals(tileCoords))) {
            this.hud.setText(`Can't place character here`, TextType.TOAST, Duration.SHORT);
            return;
        }

        const placeCharacterAction: PlaceCharacterAction = {
            type: ActionType.PLACE_CHARACTER,
            tileCoords,
        };
        this.onAction(placeCharacterAction);
    }

    private tryMovingSelectedCharacter(tileCoords: Point): void {
        if (!this.selectableTiles.find((tile) => tile.equals(tileCoords))) {
            this.hud.setText(`Can't move character here`, TextType.TOAST, Duration.SHORT);
            return;
        }

        const moveCharacterAction: MoveCharacterAction = {
            type: ActionType.MOVE_CHARACTER,
            character: this.selectedCharacter!,
            tileCoords,
        };
        this.onAction(moveCharacterAction);
    }

    private trySelectingCharacter(tileCoords: Point): void {
        const squad = this.isBlueTurn ? this.blueSquad : this.redSquad;
        const squadMemeberAtTile =
            squad.find((character) => character.tileCoords.equals(tileCoords));
        if (squadMemeberAtTile) {
            this.setSelectedCharacter(squadMemeberAtTile.index);
        }
    }

    private getAvailableTilesForCharacterPlacement(): Point[] {
        const flagCoords = this.isBlueTurn ? this.blueFlag.tileCoords : this.redFlag.tileCoords;
        const maxDistFromFlag = this.gameSettings.maxSpawnDistanceFromFlag;
        const availableTiles = bfs({
            startTile: flagCoords,
            maxDepth: maxDistFromFlag,
            isAvailable: (tile: Point): boolean => {
                return !this.isTileOccupied(tile) && !tile.equals(flagCoords);
            },
            canGoThrough: (tile: Point): boolean => {
                // Can go through other players, just not obstacles.
                return this.obstacles.find(
                    (obstacle: Obstacle) => obstacle.tileCoords.equals(tile)) == null;
            },
        });
        return availableTiles;
    }

    private getAvailableTilesForCharacterMovement(): Point[] {
        if (this.selectedCharacter == null) {
            throw new Error(`No character selected in getAvailableTilesForCharacterMovement`);
        }
        const ownFlagCoords = this.isBlueTurn ? this.blueFlag.tileCoords : this.redFlag.tileCoords;
        const currentCoords = this.selectedCharacter.tileCoords;
        const maxMoves = this.selectedCharacter.settings.maxMovesPerTurn;
        const isAvailable = (tile: Point): boolean => {
            return !this.isTileOccupied(tile)
                && (!tile.equals(ownFlagCoords) || this.selectedCharacter!.hasFlag);
        };
        const canGoThrough = (tile: Point): boolean => {
            // Characters can go through tiles occupied by squad members.
            // but they can't stop there.
            const squad = this.isBlueTurn ? this.blueSquad : this.redSquad;
            const isSquadMemberAtTile = squad.find((squadMember: Character) => {
                return squadMember.tileCoords.equals(tile) && squadMember !== this.selectedCharacter;
            }) != null;
            return isAvailable(tile) || isSquadMemberAtTile;
        };
        const availableTiles = bfs({
            startTile: currentCoords,
            maxDepth: maxMoves,
            isAvailable,
            canGoThrough,
        });
        return availableTiles;
    }

    private setSelectedCharacter(index: number): void {
        const squad = this.isBlueTurn ? this.blueSquad : this.redSquad;
        const character = squad[index];
        if (character.isTurnOver()) {
            this.hud.setText(
                `Unit ${index + 1}'s turn is over.`, TextType.TOAST, Duration.SHORT);
            return;
        }
        this.selectedCharacter = character;
        this.setSelectedCharacterState(SelectedCharacterState.AWAITING);
    }

    private setSelectedCharacterState(state: SelectedCharacterState) {
        if (this.selectedCharacter == null) {
            throw new Error(
                `There needs to be a selected character before calling setSelectedCharacterState`);
        }
        this.selectedCharacterState = state;
        this.controlMap.clear();
        this.addDefaultControls();
        this.addSwitchSquadMemberControls();

        this.controlMap.add({
            key: END_TURN_KEY,
            name: 'End character turn',
            func: () => {
                if (this.selectedCharacter == null) {
                    throw new Error(
                        `There's no selected character when ending turn.`);
                }
                const action: EndCharacterTurnAction = {
                    type: ActionType.END_CHARACTER_TURN,
                    character: this.selectedCharacter,
                };
                this.onAction(action);
            },
            eventType: EventType.KeyPress,
        });

        switch (state) {
            case SelectedCharacterState.AWAITING:
                this.selectableTiles = [];
                if (!this.selectedCharacter.hasMoved) {
                    this.controlMap.add({
                        key: MOVE_KEY,
                        name: 'Move',
                        func: () => {
                            this.setSelectedCharacterState(SelectedCharacterState.MOVING);
                        },
                        eventType: EventType.KeyPress,
                    });
                }
                if (!this.selectedCharacter.hasShot) {
                    this.controlMap.add({
                        key: SHOOT_KEY,
                        name: 'Shoot',
                        func: () => {
                            this.setSelectedCharacterState(SelectedCharacterState.SHOOTING);
                        },
                        eventType: EventType.KeyPress,
                    });
                }
                break;
            case SelectedCharacterState.MOVING:
                this.selectableTiles = this.getAvailableTilesForCharacterMovement();
                this.controlMap.add({
                    key: MOVE_KEY,
                    name: 'Cancel Move',
                    func: () => {
                        this.setSelectedCharacterState(SelectedCharacterState.AWAITING);
                    },
                    eventType: EventType.KeyPress,
                });
                break;
            case SelectedCharacterState.SHOOTING:
                this.controlMap.add({
                    key: SHOOT_KEY,
                    name: 'Cancel Shoot',
                    func: () => {
                        this.setSelectedCharacterState(SelectedCharacterState.AWAITING);
                    },
                    eventType: EventType.KeyPress,
                });
                break;
            default:
                throw new Error(`Unknown selected character state`);
        }
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
        this.selectableTiles = this.getAvailableTilesForCharacterPlacement();
        this.controlMap = new ControlMap();
        this.addDefaultControls();
        this.hud = new Hud(this.context);
        this.hud.setControlMap(this.controlMap);
        this.hud.setText('Blue team turn', TextType.TITLE, Duration.LONG);
        this.hud.setText(
            `Place squad members (${this.gameSettings.squadSize} remaining)`,
            TextType.SUBTITLE,
            Duration.LONG);
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

    private addDefaultControls(): void {
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
        this.controlMap.add({
            key: Key.QUESTION_MARK,
            name: 'Show/Hide controls',
            func: () => { this.hud.toggleShowControlMap(); },
            eventType: EventType.KeyPress,
        });
    }

    private addSwitchSquadMemberControls(): void {
        const squad = this.isBlueTurn ? this.blueSquad : this.redSquad;
        for (const character of squad) {
            // Use 1-based numbers for UI.
            const characterNumber = character.index + 1;
            const key = numberToKey.get(characterNumber);
            if (key == null) {
                throw new Error(`Not enough keys for all character numbers!`);
            }
            this.controlMap.add({
                key,
                name: `Select ${numberToOrdinal.get(characterNumber)} character`,
                func: () => { this.setSelectedCharacter(character.index); },
                eventType: EventType.KeyPress,
            });
        }
    }

    private getFirstCharacterIndex(): number {
        const squad = this.isBlueTurn ? this.blueSquad : this.redSquad;
        for (let index = 0; index < squad.length; index++) {
            if (squad[index].isAlive()) {
                return index;
            }
        }
        throw new Error(`No more characters alive - should be game over?`);
    }
}

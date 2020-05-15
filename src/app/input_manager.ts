import { ControlMap, EventType, Key, ControlParams, numberToKey, numberToOrdinal, CONTROLS } from './controls';
import { ButtonPanel } from './button_panel';
import { Point } from './math/point';
import { GameState, SelectedCharacterState } from './game_state';
import { SelectCharacterStateAction, ActionType, Action, HealAction, AimAction, EndCharacterTurnAction, ShootAction, SelectTileAction, SelectCharacterClassAction, SelectCharacterAction } from './actions';
import { CharacterAbilityType, ClassType, CHARACTER_CLASSES } from './character_settings';
import { Grid } from './grid';

interface ClickHandler {
    onClick: (tile: Point) => void;
}

const PAUSE_KEY = Key.P;
const QUIT_KEY = Key.Q;
const RESTART_KEY = Key.R;
const MOVE_KEY = Key.M;
/** Used to start and cancel shooting, but doesn't fire the shot.  */
const TOGGLE_AIM_KEY = Key.A;
const AIM_COUNTERCLOCKWISE_KEY = Key.S;
const AIM_CLOCKWISE_KEY = Key.D;
const SHOOT_KEY = Key.F;
const HEAL_KEY = Key.H;
const TOGGLE_THROW_GRENADE_KEY = Key.T;
const END_TURN_KEY = Key.E;

const KEYS_TO_CHARACTER_CLASS_TYPE: Map<Key, ClassType> = new Map([
    [Key.J, ClassType.SCOUT],
    [Key.K, ClassType.ASSAULT],
    [Key.L, ClassType.SNIPER],
    [Key.I, ClassType.DEMOLITION],
]);

interface GameManagerDelegate {
    isPaused(): boolean;
    getGameState(): GameState;
    onAction(action: Action): void;
    onQuit(): void;
    onRestart(): void;
    onTogglePause(): void;
    setToastText(text: string): void;
}

export class InputManager {

    private controlMap: ControlMap;
    private buttonPanel: ButtonPanel;
    /** For arbitrary clicks on the game grid (ie not the button panel). */
    private gameClickHandler: ClickHandler | null = null;

    constructor(
        readonly context: CanvasRenderingContext2D,
        readonly delegate: GameManagerDelegate) {
        this.controlMap = new ControlMap();
        this.buttonPanel = new ButtonPanel(this.context);
    }

    clear(): void {
        this.controlMap.clear();
        this.buttonPanel.clear();
        this.gameClickHandler = null;
    }

    render(): void {
        this.buttonPanel.render(this.context);
    }

    update(elapsedMs: number): void {
        this.controlMap.check();
        this.buttonPanel.mouseMove(CONTROLS.getMouseCanvasCoords());
        if (CONTROLS.hasClick()) {
            const clickCanvas = CONTROLS.handleClick();
            const clickedButtonPanel = this.buttonPanel.tryClick(clickCanvas);

            if (!clickedButtonPanel) {
                const mouseTileCoords =
                    Grid.getTileFromCanvasCoords(clickCanvas);
                if (this.gameClickHandler != null) {
                    this.gameClickHandler.onClick(mouseTileCoords);
                }
            }
        }
    }

    initDefaultControls(): void {
        this.clear();
        this.addDefaultControls();
    }

    initForCharacterPlacement(): void {
        this.clear();
        this.gameClickHandler = {
            onClick: (tile: Point) => {
                this.tryPlacingCharacter(tile);
            }
        };
        this.addDefaultControls();
        this.addCharacterClassControls();
    }

    initGameOverControls(): void {
        this.clear();
        this.addQuitAndRestartControls(true);
        const quitKeyString = CONTROLS.getStringForKey(QUIT_KEY);
        const restartKey = CONTROLS.getStringForKey(RESTART_KEY);
        this.delegate.setToastText(
            `Press ${quitKeyString} to quit, ${restartKey} to restart`);
    }

    initForSelectedCharacterState(): void {
        this.clear();
        const delegate = this.delegate;
        const gameState = delegate.getGameState();
        if (gameState.selectedCharacter == null
            || gameState.selectedCharacterState == null) {
            throw new Error(
                `There needs to be a selected character ` +
                `before calling setSelectedCharacterState`);
        }
        this.buttonPanel.clear();
        this.controlMap.clear();
        this.gameClickHandler = null;
        this.addDefaultControls();
        this.addSwitchSquadMemberControls();

        const AIM_ANGLE_RADIANS_DELTA = Math.PI / 32;
        const buttonInfos: ControlParams[] = [];
        let headerTextLines: string[] = [];
        switch (gameState.selectedCharacterState) {
            case SelectedCharacterState.AWAITING:
                headerTextLines = ['Available actions'];
                if (!gameState.selectedCharacter.hasMoved) {
                    buttonInfos.push({
                        key: MOVE_KEY,
                        name: 'Move',
                        func: () => {
                            const action: SelectCharacterStateAction = {
                                type: ActionType.SELECT_CHARACTER_STATE,
                                state: SelectedCharacterState.MOVING,
                            };
                            delegate.onAction(action);
                        },
                        eventType: EventType.KeyPress,
                    });
                }
                if (gameState.selectedCharacter.canShoot()) {
                    buttonInfos.push({
                        key: TOGGLE_AIM_KEY,
                        name: 'Aim',
                        func: () => {
                            const action: SelectCharacterStateAction = {
                                type: ActionType.SELECT_CHARACTER_STATE,
                                state: SelectedCharacterState.AIMING,
                            };
                            delegate.onAction(action);
                        },
                        eventType: EventType.KeyPress,
                    });
                }
                for (const extraAbility of
                    gameState.selectedCharacter.extraAbilities) {
                    switch (extraAbility.abilityType) {
                        case CharacterAbilityType.HEAL:
                            buttonInfos.push({
                                key: HEAL_KEY,
                                name: 'Heal',
                                func: () => {
                                    const healAction: HealAction = {
                                        type: ActionType.HEAL,
                                        healAmount: extraAbility.healAmount,
                                    };
                                    delegate.onAction(healAction);
                                },
                                eventType: EventType.KeyPress,
                            });
                            break;
                        case CharacterAbilityType.THROW_GRENADE:
                            buttonInfos.push({
                                key: TOGGLE_THROW_GRENADE_KEY,
                                name: 'Throw grenade',
                                func: () => {
                                    const action: SelectCharacterStateAction = {
                                        type: ActionType.SELECT_CHARACTER_STATE,
                                        state: SelectedCharacterState.THROWING_GRENADE,
                                    };
                                    delegate.onAction(action);
                                },
                                eventType: EventType.KeyPress,
                            });
                            break;
                    }
                }
                break;
            case SelectedCharacterState.MOVING:
                headerTextLines = ['Select a destination'];
                this.gameClickHandler = {
                    onClick: (tile: Point) => {
                        this.tryMovingSelectedCharacter(tile);
                    },
                };
                buttonInfos.push({
                    key: MOVE_KEY,
                    name: 'Cancel Move',
                    func: () => {
                        const action: SelectCharacterStateAction = {
                            type: ActionType.SELECT_CHARACTER_STATE,
                            state: SelectedCharacterState.AWAITING,
                        };
                        delegate.onAction(action);
                    },
                    eventType: EventType.KeyPress,
                });
                break;
            case SelectedCharacterState.AIMING:
                headerTextLines = ['Adjust aim and fire'];
                buttonInfos.push({
                    key: TOGGLE_AIM_KEY,
                    name: 'Stop Aiming',
                    func: () => {
                        if (gameState.selectedCharacter == null) {
                            throw new Error(
                                `There's no selected character when canceling shooting.`);
                        }
                        const action: SelectCharacterStateAction = {
                            type: ActionType.SELECT_CHARACTER_STATE,
                            state: SelectedCharacterState.AWAITING,
                        };
                        delegate.onAction(action);
                    },
                    eventType: EventType.KeyPress,
                });
                buttonInfos.push({
                    key: AIM_COUNTERCLOCKWISE_KEY,
                    name: 'Aim CCW',
                    func: () => {
                        if (gameState.selectedCharacter == null) {
                            throw new Error(
                                `There's no selected character when aiming CCW.`);
                        }
                        const newAim =
                            gameState.selectedCharacter.getAim()
                            - AIM_ANGLE_RADIANS_DELTA;
                        const aimAction: AimAction = {
                            type: ActionType.AIM,
                            aimAngleClockwiseRadians: newAim,
                        }
                        delegate.onAction(aimAction);
                    },
                    eventType: EventType.KeyDown,
                });
                buttonInfos.push({
                    key: AIM_CLOCKWISE_KEY,
                    name: 'Aim CC',
                    func: () => {
                        if (gameState.selectedCharacter == null) {
                            throw new Error(
                                `There's no selected character when aiming CC.`);
                        }
                        const newAim =
                            gameState.selectedCharacter.getAim()
                            + AIM_ANGLE_RADIANS_DELTA;
                        const aimAction: AimAction = {
                            type: ActionType.AIM,
                            aimAngleClockwiseRadians: newAim,
                        }
                        delegate.onAction(aimAction);
                    },
                    eventType: EventType.KeyDown,
                });
                buttonInfos.push({
                    key: SHOOT_KEY,
                    name: 'Fire',
                    func: () => {
                        if (gameState.selectedCharacter == null) {
                            throw new Error(
                                `There's no selected character when canceling shooting.`);
                        }
                        const fireAction: ShootAction = {
                            type: ActionType.SHOOT,
                        };
                        delegate.onAction(fireAction);
                    },
                    eventType: EventType.KeyPress,
                });
                break;
            case SelectedCharacterState.THROWING_GRENADE:
                headerTextLines = ['Select grenade target'];
                this.gameClickHandler = {
                    onClick: (tile: Point) => {
                        this.tryThrowingGrenade(tile);
                    },
                };
                buttonInfos.push({
                    key: TOGGLE_THROW_GRENADE_KEY,
                    name: 'Cancel',
                    func: () => {
                        const action: SelectCharacterStateAction = {
                            type: ActionType.SELECT_CHARACTER_STATE,
                            state: SelectedCharacterState.AWAITING,
                        };
                        delegate.onAction(action);
                    },
                    eventType: EventType.KeyPress,
                });
                break;
            default:
                throw new Error(`Unknown selected character state`);
        }
        buttonInfos.push({
            key: END_TURN_KEY,
            name: 'End character turn',
            func: () => {
                if (gameState.selectedCharacter == null) {
                    throw new Error(
                        `There's no selected character when ending turn.`);
                }
                const action: EndCharacterTurnAction = {
                    type: ActionType.END_CHARACTER_TURN,
                };
                delegate.onAction(action);
            },
            eventType: EventType.KeyPress,
        });
        this.buttonPanel.configurePanel({
            headerTextLines,
            buttonInfos,
            isButtonGroup: false,
        });
        for (const buttonParam of buttonInfos) {
            this.controlMap.add(buttonParam);
        }
    }

    private tryPlacingCharacter(tileCoords: Point): void {
        if (!this.delegate.getGameState().selectableTiles
            .find((tile) => tile.equals(tileCoords))) {
            this.delegate.setToastText(
                `Can't place character here`);
            return;
        }

        const placeCharacterAction: SelectTileAction = {
            type: ActionType.SELECT_TILE,
            tile: tileCoords,
        };
        this.delegate.onAction(placeCharacterAction);
    }

    private trySelectingCharacter(tileCoords: Point): void {
        const squad = this.delegate.getGameState().getActiveSquad();
        const squadMemeberAtTile =
            squad.find((character) => character.tileCoords.equals(tileCoords));
        if (squadMemeberAtTile && !squadMemeberAtTile.isTurnOver()) {
            const selectCharacterAction: SelectCharacterAction = {
                type: ActionType.SELECT_CHARACTER,
                characterIndex: squadMemeberAtTile.index,
            };
            this.delegate.onAction(selectCharacterAction);
        }
    }

    private tryMovingSelectedCharacter(tileCoords: Point): void {
        if (!this.delegate.getGameState().selectableTiles
            .find((tile) => tile.equals(tileCoords))) {
            this.delegate.setToastText(`Can't move character here`);
            return;
        }

        const selectTileAction: SelectTileAction = {
            type: ActionType.SELECT_TILE,
            tile: tileCoords,
        };
        this.delegate.onAction(selectTileAction);
    }

    private tryThrowingGrenade(tileCoords: Point): void {
        if (!this.delegate.getGameState().selectableTiles
            .find((tile) => tile.equals(tileCoords))) {
            this.delegate.setToastText(`Can't throw grenade here`);
            return;
        }
        const action: SelectTileAction = {
            type: ActionType.SELECT_TILE,
            tile: tileCoords,
        };
        this.delegate.onAction(action);
    }

    private addSwitchSquadMemberControls(): void {
        const squad = this.delegate.getGameState().getActiveSquad();
        this.gameClickHandler = {
            onClick: (tile: Point) => {
                this.trySelectingCharacter(tile);
            },
        };
        // TODO - use tab instead of number for squad toggle controls.
        for (const character of squad) {
            if (character.index >= 9) {
                continue;
            }
            // Use 1-based numbers for UI.
            const characterNumber = character.index + 1;
            const key = numberToKey.get(characterNumber);
            if (key == null) {
                throw new Error(`Not enough keys for all character numbers!`);
            }
            this.controlMap.add({
                key,
                name: `Select ${numberToOrdinal.get(characterNumber)} character`,
                func: () => {
                    const selectCharacterAction: SelectCharacterAction = {
                        type: ActionType.SELECT_CHARACTER,
                        characterIndex: character.index,
                    };
                    this.delegate.onAction(selectCharacterAction);
                },
                eventType: EventType.KeyPress,
            });
        }
    }

    private addDefaultControls(): void {
        const params = {
            key: PAUSE_KEY,
            name: 'Pause',
            func: () => { this.togglePause(); },
            eventType: EventType.KeyPress,
        };
        this.controlMap.add(params);
        this.buttonPanel.setBottomButtons([params]);
    }

    private addQuitAndRestartControls(isGameOver: boolean = false): void {
        const params: ControlParams[] = [];
        if (!isGameOver) {
            params.push({
                key: PAUSE_KEY,
                name: 'Resume',
                func: () => {
                    this.togglePause();
                    this.controlMap.remove(PAUSE_KEY);
                    this.addDefaultControls();
                },
                eventType: EventType.KeyPress,
            });
        }
        params.push({
            key: RESTART_KEY,
            name: 'Restart',
            func: this.delegate.onRestart,
            eventType: EventType.KeyPress,
        },
            {
                key: QUIT_KEY,
                name: 'Quit',
                func: this.delegate.onQuit,
                eventType: EventType.KeyPress,
            });
        for (const param of params) {
            this.controlMap.add(param);
        }
        this.buttonPanel.setBottomButtons(params);
    }

    private addCharacterClassControls(): void {
        const buttons: ControlParams[] = [];
        for (const key of KEYS_TO_CHARACTER_CLASS_TYPE.keys()) {
            const characterClassType = KEYS_TO_CHARACTER_CLASS_TYPE.get(key)!;
            const params: ControlParams = {
                key,
                name: characterClassType,
                func: () => {
                    const selectCharacterClassAction:
                        SelectCharacterClassAction = {
                        type: ActionType.SELECT_CHARACTER_CLASS,
                        class: CHARACTER_CLASSES.find((settings) => {
                            return settings.type === characterClassType;
                        })!
                    };
                    this.delegate.onAction(selectCharacterClassAction);
                    const classIndex =
                        [...KEYS_TO_CHARACTER_CLASS_TYPE.values()].findIndex(
                            (clasz) => characterClassType === clasz)!
                    this.buttonPanel.selectIndex(classIndex);
                },
                eventType: EventType.KeyPress,
            };
            buttons.push(params);
            this.controlMap.add(params);
        }
        this.buttonPanel.configurePanel({
            headerTextLines: ['Select Character', 'Class to Place'],
            buttonInfos: buttons,
            isButtonGroup: true,
        });
    }

    private togglePause(): void {
        const isNowPaused = !this.delegate.isPaused();
        this.delegate.onTogglePause();
        if (isNowPaused) {
            // Re-used for 'resume' button.
            this.controlMap.remove(PAUSE_KEY);
            this.addQuitAndRestartControls();
        } else {
            this.controlMap.remove(QUIT_KEY);
            this.controlMap.remove(RESTART_KEY);
        }
    }
}
import { UiManager } from 'src/app/ui/ui_manager';
import { Button, ButtonDimensions, ButtonStyle } from 'src/app/ui/button';
import { Point } from 'src/app/math/point';
import { RENDER_SETTINGS } from 'src/app/render_settings';
import { CONTROLS } from 'src/app/controls';
import { GameModeManager } from 'src/app/game_mode_manager';
import { THEME } from 'src/app/theme';
import { LEVELS } from 'src/app/level';
import { ButtonGroup } from 'src/app/ui/button_group';
import { GameSettings, MatchType, DEFAULT_GAME_SETTINGS, AiDifficulty } from 'src/app/game_settings';
import { TextBox, TextBoxStyle, TextBoxDimensions } from 'src/app/ui/text_box';
import { Element } from '../ui/element';

interface ButtonMetadata {
    text: string;
    callback: () => void;
}

export class FreePlayMenu implements GameModeManager {
    private readonly canvas: HTMLCanvasElement;
    private readonly context: CanvasRenderingContext2D;
    private readonly onSelectLevel:
        (levelIndex: number, gameSettings: GameSettings) => void;
    private readonly onBack: () => void;
    private readonly uiManager: UiManager;
    private selectedLevelIndex: number;
    private selectedMatchType: MatchType;
    private selectedTeamSizeMap: Map<number, number>;
    private selectedAiDifficulty: AiDifficulty;
    private isFogOfWarOn: boolean;
    private hasSpawners: boolean;

    constructor(
        canvas: HTMLCanvasElement,
        context: CanvasRenderingContext2D,
        callbacks: {
            readonly onSelectLevel:
            (levelIndex: number, gameSettings: GameSettings) => void;
            onBack: () => void;
        }) {

        this.canvas = canvas;
        this.context = context;
        this.onSelectLevel = callbacks.onSelectLevel;
        this.onBack = callbacks.onBack;

        this.uiManager = new UiManager(context);
        const settingsLeftMargin = .04;
        const levelMenuLeft = .5 + settingsLeftMargin;
        this.initSettingsElements(settingsLeftMargin);
        this.initLevelElements(levelMenuLeft);
        this.initButtons(.1);
    }

    update(elapsedTime: number): void {
        this.uiManager.onMouseMove(CONTROLS.getMouseCanvasCoords());
        if (CONTROLS.hasClick()) {
            const clickCanvasCoords = CONTROLS.handleClick();
            this.uiManager.onClick(clickCanvasCoords);
        }
    }

    render(): void {
        this.context.fillStyle = THEME.uiBackgroundColor;
        this.context.clearRect(
            0, 0, RENDER_SETTINGS.canvasWidth, RENDER_SETTINGS.canvasHeight);
        this.context.fillRect(
            0, 0, RENDER_SETTINGS.canvasWidth, RENDER_SETTINGS.canvasHeight);
        this.renderTitleText();
        this.uiManager.render();
    }

    destroy(): void {
        // no-op
    }

    private initButtons(backButtonLeft: number): void {
        const topMargin = .9;
        const buttonSize = new Point(.18, .08);

        // Back button.
        const backButton = new Button({
            dimensions: {
                size: buttonSize,
                topLeft: new Point(backButtonLeft, topMargin),
                text: 'Back',
            },
            style: {
                fontSize: 22,
                color: '#d9c8a3',
                hoverColor: '#e6dbc3',
                textColor: THEME.buttonTextColor,
            },
            onClick: this.onBack,
        });
        this.uiManager.addElement(backButton);

        // Start button.
        const startButtonLeft = backButtonLeft + buttonSize.x + .04;
        const startButton = new Button({
            dimensions: {
                size: buttonSize,
                text: 'Start',
                topLeft: new Point(startButtonLeft, topMargin),
            },
            style: {
                color: '#66d15a',
                hoverColor: '#7aed6d',
                fontSize: 28,
                textColor: THEME.buttonTextColor,
            },
            onClick: () => {
                const maxSpawnDistanceFromFlag =
                    this.selectedTeamSizeMap.get(1)! > 16
                        ? 16
                        : DEFAULT_GAME_SETTINGS.maxSpawnDistanceFromFlag;
                const settings: GameSettings = {
                    matchType: this.selectedMatchType,
                    teamIndexToSquadSize: this.selectedTeamSizeMap,
                    maxSpawnDistanceFromFlag,
                    numTeams: DEFAULT_GAME_SETTINGS.numTeams,
                    hasFogOfWar: this.isFogOfWarOn,
                    aiDifficulty: this.selectedAiDifficulty,
                    hasSpawners: this.hasSpawners,
                }
                this.onSelectLevel(this.selectedLevelIndex, settings);
            }
        });
        this.uiManager.addElement(startButton);
    }

    private initSettingsElements(leftMargin: number): void {
        const headerTopMargin = .18;
        const buttonOffsetX = .04;
        const buttonGroupOffsetY = .04;
        const buttonSize = new Point(.09, .06);
        const headerSize = new Point(.18, .08);
        const rowLength = 3;
        const rowOffset = buttonGroupOffsetY / 2;
        const settingsTopMargin =
            headerTopMargin + buttonGroupOffsetY / 2 + headerSize.y;
        const fontSize = 22;
        const headerStyle: TextBoxStyle = {
            color: '#dddddd',
            fontSize,
            textColor: '#000000',
        };
        const labelStyle: TextBoxStyle = {
            color: THEME.uiBackgroundColor,
            fontSize: fontSize - 2,
            textColor: '#000000',
        };
        const buttonStyle: ButtonStyle = {
            fontSize: fontSize - 2,
            color: '#f7c25e',
            hoverColor: '#deaf57',
            selectedColor: '#db9d2a',
            selectedBorderColor: '#000000',
            textColor: THEME.buttonTextColor,
        };

        const settingsHeader = new TextBox({
            dimensions: {
                size: headerSize,
                text: 'Settings',
                topLeft: new Point(.25 - headerSize.x / 2, headerTopMargin),
            },
            style: headerStyle,
        });
        this.uiManager.addElement(settingsHeader);

        const createSettingRowElements = (params: {
            topY: number;
            headerText: string;
            buttonTexts: string[];
            initialButtonIndex: number;
            rows: number;
            onButtonChangeCallback: (selectedIndex: number) => void;
        }): Element[] => {
            const labelSize = new Point(.14, .06);
            const labelLeftMargin = leftMargin;
            const header = new TextBox({
                dimensions: {
                    size: labelSize,
                    text: params.headerText,
                    topLeft: new Point(labelLeftMargin, params.topY),
                },
                style: labelStyle,
            });

            const buttonLeftMargin = labelLeftMargin + labelSize.x + .02;
            const dimensions: ButtonDimensions[] = [];
            for (let index = 0; index < params.buttonTexts.length; index++) {
                const column = index % rowLength;
                const row = Math.floor(index / rowLength);
                let topLeftX = buttonLeftMargin + column * (buttonOffsetX +
                    buttonSize.y);
                let topLeftY = params.topY + row * (rowOffset + buttonSize.y)
                dimensions.push({
                    topLeft: new Point(topLeftX, topLeftY),
                    size: buttonSize,
                    text: params.buttonTexts[index],
                });
            }
            params.onButtonChangeCallback(params.initialButtonIndex);
            const buttonGroup = new ButtonGroup({
                buttons: dimensions,
                buttonStyle,
                initialSelectionIndex: params.initialButtonIndex,
                onChangeCallback: params.onButtonChangeCallback,
            });
            return [header, buttonGroup];
        };

        // Team size type buttons.
        const teamSizeIndexToTeamSizeMap: Array<Map<number, number>> = [
            new Map([[0, 2], [1, 2]]),
            new Map([[0, 4], [1, 4]]),
            new Map([[0, 8], [1, 8]]),
            new Map([[0, 12], [1, 12]]),
            new Map([[0, 8], [1, 24]]),
        ];
        const teamSizeIndexToString: string[] = teamSizeIndexToTeamSizeMap
            .map((map) => {
                return `${map.get(0)!}x${map.get(1)!}`;
            });
        const onTeamSizeChangeCallback = (index: number) => {
            this.selectedTeamSizeMap = teamSizeIndexToTeamSizeMap[index];
        };
        const teamSizeTopY = settingsTopMargin;
        const matchTypeTopY = teamSizeTopY + buttonSize.y * 2
            + rowOffset + buttonGroupOffsetY;
        const aiDifficultyTopY = matchTypeTopY + buttonSize.y
            + buttonGroupOffsetY;
        const fogOfWarTopY = aiDifficultyTopY + buttonSize.y
            + buttonGroupOffsetY;
        const spawnersTopY = fogOfWarTopY + buttonSize.y + buttonGroupOffsetY;
        const teamSizeElements = createSettingRowElements({
            topY: teamSizeTopY,
            rows: 2,
            headerText: 'Team size',
            buttonTexts: teamSizeIndexToString,
            initialButtonIndex: 0,
            onButtonChangeCallback: onTeamSizeChangeCallback,
        });
        this.uiManager.addElement(teamSizeElements[0]);
        this.uiManager.addElement(teamSizeElements[1]);

        // AI difficulty buttons.
        const difficulties: AiDifficulty[] = [
            AiDifficulty.WEAK,
            AiDifficulty.MEDIUM,
            AiDifficulty.STRONG,
        ];
        const difficultyStrings = [
            'Easy',
            'Medium',
            'Hard',
        ];
        const onAiChangeCallback = (index: number) => {
            this.selectedAiDifficulty = difficulties[index];
        };
        const aiDifficultyElements = createSettingRowElements({
            topY: aiDifficultyTopY,
            rows: 1,
            headerText: 'Difficulty',
            buttonTexts: difficultyStrings,
            initialButtonIndex: 0,
            onButtonChangeCallback: onAiChangeCallback,
        });
        this.uiManager.addElement(aiDifficultyElements[0]);
        this.uiManager.addElement(aiDifficultyElements[1]);

        // Match type buttons.
        const matchTypes: MatchType[] = [
            MatchType.PLAYER_VS_PLAYER_LOCAL,
            MatchType.PLAYER_VS_AI,
            MatchType.AI_VS_AI,
        ];
        const matchTypeStrings = [
            'PvP',
            'PvAI',
            'AIvAI',
        ];
        const onChangeCallback = (index: number) => {
            const previousMatchType = this.selectedMatchType;
            this.selectedMatchType = matchTypes[index];
            if (this.selectedMatchType === MatchType.PLAYER_VS_PLAYER_LOCAL &&
                previousMatchType !== MatchType.PLAYER_VS_PLAYER_LOCAL) {
                this.uiManager.removeElement(aiDifficultyElements[0]);
                this.uiManager.removeElement(aiDifficultyElements[1]);
            } else if (
                this.selectedMatchType !== MatchType.PLAYER_VS_PLAYER_LOCAL
                && previousMatchType === MatchType.PLAYER_VS_PLAYER_LOCAL) {
                this.uiManager.addElement(aiDifficultyElements[0]);
                this.uiManager.addElement(aiDifficultyElements[1]);
            }
        };
        const matchTypeElements = createSettingRowElements({
            topY: matchTypeTopY,
            rows: 1,
            headerText: 'Match type',
            buttonTexts: matchTypeStrings,
            initialButtonIndex: 1,
            onButtonChangeCallback: onChangeCallback,
        });
        this.uiManager.addElement(matchTypeElements[0]);
        this.uiManager.addElement(matchTypeElements[1]);

        // Fog of war.
        const fogOfWarOptions: boolean[] = [
            true,
            false,
        ];
        const fogOfWarOptionStrings = [
            'On',
            'Off',
        ];
        const onFogOfWarChangeCallback = (index: number) => {
            this.isFogOfWarOn = fogOfWarOptions[index];
        };
        const fogOfWarElements = createSettingRowElements({
            topY: fogOfWarTopY,
            rows: 1,
            headerText: 'Fog of war',
            buttonTexts: fogOfWarOptionStrings,
            initialButtonIndex: 1,
            onButtonChangeCallback: onFogOfWarChangeCallback,
        });
        this.uiManager.addElement(fogOfWarElements[0]);
        this.uiManager.addElement(fogOfWarElements[1]);

        // Spawners.
        const spawnersOptions: boolean[] = [
            true,
            false,
        ];
        const spawnersOptionStrings = [
            'On',
            'Off',
        ];
        const onSpawnersChangeCallback = (index: number) => {
            this.hasSpawners = spawnersOptions[index];
        };
        const spawnerElements = createSettingRowElements({
            topY: spawnersTopY,
            rows: 1,
            headerText: 'Spawners',
            buttonTexts: spawnersOptionStrings,
            initialButtonIndex: 1,
            onButtonChangeCallback: onSpawnersChangeCallback,
        });
        this.uiManager.addElement(spawnerElements[0]);
        this.uiManager.addElement(spawnerElements[1]);
    }

    private initLevelElements(leftMargin: number): void {
        const fontSize = 22;
        const headerTopMargin = .18;
        const buttonOffsetY = .02;
        const levelElementSize = new Point(.18, .08);
        const buttonTopMargin =
            headerTopMargin + buttonOffsetY + levelElementSize.y;

        const headerStyle: TextBoxStyle = {
            color: '#dddddd',
            fontSize,
            textColor: '#000000',
        };
        const buttonStyle: ButtonStyle = {
            fontSize,
            color: '#f7c25e',
            hoverColor: '#deaf57',
            selectedColor: '#db9d2a',
            selectedBorderColor: '#000000',
            textColor: THEME.buttonTextColor,
        };

        // Level buttons.
        const levelButtonsLeftMargin = leftMargin;
        const levelHeaderLeftMargin =
            levelButtonsLeftMargin + levelElementSize.x / 2 + .04 / 2;
        const levelHeader = new TextBox({
            dimensions: {
                size: levelElementSize,
                text: 'Level',
                topLeft: new Point(levelHeaderLeftMargin, headerTopMargin),
            },
            style: headerStyle,
        });
        this.uiManager.addElement(levelHeader);

        const levelDimensions: ButtonDimensions[] = [];
        const columnSize = 6;
        for (let buttonIndex = 0; buttonIndex < LEVELS.length; buttonIndex++) {
            let row = buttonIndex % columnSize;
            let column = Math.floor(buttonIndex / columnSize);
            let leftMargin = levelButtonsLeftMargin;
            if (column === 1) {
                leftMargin = leftMargin + levelElementSize.x + .04;
            }
            const topLeftY = buttonTopMargin + row * buttonOffsetY
                + row * levelElementSize.y;
            const level = LEVELS[buttonIndex];

            levelDimensions.push({
                topLeft: new Point(leftMargin, topLeftY),
                size: levelElementSize,
                text: level.name,
            });
        }

        const initialLevelSelectionIndex = 0;
        const onLevelChangeCallback = (index: number) => {
            this.selectedLevelIndex = index;
        };
        onLevelChangeCallback(initialLevelSelectionIndex);
        this.uiManager.addElement(new ButtonGroup({
            buttons: levelDimensions,
            buttonStyle,
            initialSelectionIndex: initialLevelSelectionIndex,
            onChangeCallback: onLevelChangeCallback,
        }));
    }

    private renderTitleText(): void {
        this.context.fillStyle = THEME.buttonTextColor;
        const fontSize = 72;
        this.context.font = `${fontSize}px fantasy`;
        const text = 'Free Play'
        const textWidth = this.context.measureText(text).width;
        const textCanvasPosition = new Point(
            RENDER_SETTINGS.canvasWidth / 2,
            RENDER_SETTINGS.canvasHeight / 6);
        this.context.fillText(
            text,
            textCanvasPosition.x - textWidth / 2,
            textCanvasPosition.y - fontSize / 2);
    }
}
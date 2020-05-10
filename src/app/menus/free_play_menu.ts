import { UiManager } from 'src/app/ui/ui_manager';
import { Button, ButtonDimensions, ButtonStyle } from 'src/app/ui/button';
import { Point } from 'src/app/math/point';
import { RENDER_SETTINGS } from 'src/app/render_settings';
import { CONTROLS } from 'src/app/controls';
import { GameModeManager } from 'src/app/game_mode_manager';
import { THEME } from 'src/app/theme';
import { LEVELS } from 'src/app/level';
import { ButtonGroup } from 'src/app/ui/button_group';
import { GameSettings, MatchType, DEFAULT_GAME_SETTINGS } from 'src/app/game_settings';
import { TextBox, TextBoxStyle } from 'src/app/ui/text_box';

interface ButtonMetadata {
    text: string;
    callback: () => void;
}

export class FreePlayMenu implements GameModeManager {
    private readonly canvas: HTMLCanvasElement;
    private readonly context: CanvasRenderingContext2D;
    private readonly onSelectLevel: (levelIndex: number, gameSettings: GameSettings) => void;
    private readonly uiManager: UiManager;
    private selectedLevelIndex: number;
    private selectedMatchType: MatchType;
    private selectedTeamSizeMap: Map<number, number>;

    constructor(
        canvas: HTMLCanvasElement,
        context: CanvasRenderingContext2D,
        callbacks: {
            readonly onSelectLevel: (levelIndex: number, gameSettings: GameSettings) => void;
        }) {

        this.canvas = canvas;
        this.context = context;
        this.onSelectLevel = callbacks.onSelectLevel;

        this.uiManager = new UiManager(context);
        this.initLevelMenu();
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
        this.context.clearRect(0, 0, RENDER_SETTINGS.canvasWidth, RENDER_SETTINGS.canvasHeight);
        this.context.fillRect(0, 0, RENDER_SETTINGS.canvasWidth, RENDER_SETTINGS.canvasHeight);
        this.renderTitleText();
        this.uiManager.render();
    }

    destroy(): void {
        // no-op
    }

    //  OLD buttonHoverColor = '#fcd281';
    private initLevelMenu(): void {

        const headerTopMargin = .28;
        const buttonOffsetY = .04;
        const elementSize = new Point(.18, .08);
        const buttonTopMargin = headerTopMargin + buttonOffsetY + elementSize.y;
        const fontSize = 24;
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
        const leftMargin = .12;
        const levelHeader = new TextBox({
            dimensions: {
                size: elementSize,
                text: 'Level',
                topLeft: new Point(leftMargin, headerTopMargin),
            },
            style: headerStyle,
        });
        this.uiManager.addElement(levelHeader);

        const levelDimensions: ButtonDimensions[] = [];
        for (let buttonIndex = 0; buttonIndex < LEVELS.length; buttonIndex++) {
            const topLeftY = buttonTopMargin + buttonIndex * buttonOffsetY + buttonIndex * elementSize.y;
            const level = LEVELS[buttonIndex];
            levelDimensions.push({
                topLeft: new Point(leftMargin, topLeftY),
                size: elementSize,
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

        // Team size type buttons.
        const teamSizeIndexToString: string[] = [
            '2x2',
            '4x4',
            '8x8',
            '2x4',
            '4x8',
        ];
        const teamSizeIndexToTeamSizeMap: Array<Map<number, number>> = [
            new Map([[0, 2], [1, 2]]),
            new Map([[0, 4], [1, 4]]),
            new Map([[0, 8], [1, 8]]),
            new Map([[0, 2], [1, 4]]),
            new Map([[0, 4], [1, 8]]),
        ];
        const teamSizeLeftMargin = .4;

        const teamSizeHeader = new TextBox({
            dimensions: {
                size: elementSize,
                text: 'Team Size',
                topLeft: new Point(teamSizeLeftMargin, headerTopMargin),
            },
            style: headerStyle,
        });
        this.uiManager.addElement(teamSizeHeader);

        const teamSizeDimensions: ButtonDimensions[] = [];
        for (let teamSizeIndex = 0;
            teamSizeIndex < teamSizeIndexToTeamSizeMap.length;
            teamSizeIndex++) {
            const topLeftY = buttonTopMargin + teamSizeIndex * buttonOffsetY + teamSizeIndex * elementSize.y;
            teamSizeDimensions.push({
                topLeft: new Point(teamSizeLeftMargin, topLeftY),
                size: elementSize,
                text: teamSizeIndexToString[teamSizeIndex],
            });
        }
        const initialTeamSizeSelectionIndex = 0;
        const onTeamSizeChangeCallback = (index: number) => {
            this.selectedTeamSizeMap = teamSizeIndexToTeamSizeMap[index];
        };
        onTeamSizeChangeCallback(initialTeamSizeSelectionIndex);
        this.uiManager.addElement(new ButtonGroup({
            buttons: teamSizeDimensions,
            buttonStyle,
            initialSelectionIndex: initialTeamSizeSelectionIndex,
            onChangeCallback: onTeamSizeChangeCallback,
        }));

        // Match type buttons.
        const matchTypeToString: Map<MatchType, string> = new Map([
            [MatchType.PLAYER_VS_PLAYER_LOCAL, 'PvP'],
            [MatchType.PLAYER_VS_AI, 'PvAI'],
            [MatchType.AI_VS_AI, 'AIvAI'],
        ]);
        const matchIndexToMatchType: MatchType[] = [];
        const matchTypeLeftMargin = teamSizeLeftMargin + elementSize.x + .1;

        const matchTypeHeader = new TextBox({
            dimensions: {
                size: elementSize,
                text: 'Match Type',
                topLeft: new Point(matchTypeLeftMargin, headerTopMargin),
            },
            style: headerStyle,
        });
        this.uiManager.addElement(matchTypeHeader);

        const matchTypes = [...matchTypeToString.keys()];
        const dimensions: ButtonDimensions[] = [];
        for (let matchTypeButtonIndex = 0;
            matchTypeButtonIndex < matchTypes.length;
            matchTypeButtonIndex++) {
            const topLeftY = buttonTopMargin + matchTypeButtonIndex * buttonOffsetY + matchTypeButtonIndex * elementSize.y;
            const matchType = matchTypes[matchTypeButtonIndex];
            matchIndexToMatchType.push(matchType);
            dimensions.push({
                topLeft: new Point(matchTypeLeftMargin, topLeftY),
                size: elementSize,
                text: matchTypeToString.get(matchType)!,
            });
        }
        const initialSelectionIndex = 0;
        const onChangeCallback = (index: number) => {
            this.selectedMatchType = matchIndexToMatchType[index];
        };
        onChangeCallback(initialSelectionIndex);
        this.uiManager.addElement(new ButtonGroup({
            buttons: dimensions,
            buttonStyle,
            initialSelectionIndex,
            onChangeCallback,
        }));

        // Start button.
        const startButton = new Button({
            dimensions: {
                size: new Point(.2, .1),
                text: 'Start',
                topLeft: new Point(.67, .8),
            },
            style: {
                color: '#66d15a',
                hoverColor: '#7aed6d',
                fontSize: 28,
                textColor: THEME.textColor,
            },
            onClick: () => {
                const settings: GameSettings = {
                    matchType: this.selectedMatchType,
                    teamIndexToSquadSize: this.selectedTeamSizeMap,
                    maxSpawnDistanceFromFlag: DEFAULT_GAME_SETTINGS.maxSpawnDistanceFromFlag,
                    numTeams: DEFAULT_GAME_SETTINGS.numTeams,
                }
                this.onSelectLevel(this.selectedLevelIndex, settings);
            }
        });
        this.uiManager.addElement(startButton);
    }

    private renderTitleText(): void {
        this.context.fillStyle = THEME.buttonTextColor;
        const fontSize = 72;
        this.context.font = `${fontSize}px fantasy`;
        const text = 'Snag the Flag'
        const textWidth = this.context.measureText(text).width;
        const textCanvasPosition = new Point(
            RENDER_SETTINGS.canvasWidth / 2,
            RENDER_SETTINGS.canvasHeight / 4);
        this.context.fillText(
            text,
            textCanvasPosition.x - textWidth / 2,
            textCanvasPosition.y - fontSize / 2);
    }
}
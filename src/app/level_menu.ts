import { UiManager } from 'src/app/ui/ui_manager';
import { Button, ButtonDimensions, ButtonStyle } from 'src/app/ui/button';
import { Point } from 'src/app/math/point';
import { RENDER_SETTINGS } from 'src/app/render_settings';
import { CONTROLS } from 'src/app/controls';
import { GameModeManager } from 'src/app/game_mode_manager';
import { THEME } from 'src/app/theme';
import { LEVELS } from 'src/app/level';
import { MatchType } from './match_type';
import { ButtonGroup } from './ui/button_group';

interface ButtonMetadata {
    text: string;
    callback: () => void;
}

export class LevelMenu implements GameModeManager {
    private readonly canvas: HTMLCanvasElement;
    private readonly context: CanvasRenderingContext2D;
    private readonly onSelectLevel: (levelIndex: number, matchType: MatchType) => void;
    private readonly uiManager: UiManager;
    private selectedMatchType: MatchType;

    constructor(
        canvas: HTMLCanvasElement,
        context: CanvasRenderingContext2D,
        callbacks: {
            readonly onSelectLevel: (levelIndex: number, matchType: MatchType) => void;
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

    private initLevelMenu(): void {
        // Level buttons.
        const leftMargin = .4;
        const topMargin = .3;
        const buttonOffsetY = .08;
        const buttonSize = new Point(.2, .1);
        const buttonColor = '#f7c25e';
        const buttonHoverColor = '#fcd281';
        const fontSize = 24;
        for (let buttonIndex = 0; buttonIndex < LEVELS.length; buttonIndex++) {
            const topLeftY = topMargin + buttonIndex * buttonOffsetY + buttonIndex * buttonSize.y;
            const level = LEVELS[buttonIndex];
            const button = new Button({
                dimensions: {
                    topLeft: new Point(leftMargin, topLeftY),
                    size: buttonSize,
                    text: level.name,
                }, style: {
                    fontSize,
                    color: buttonColor,
                    hoverColor: buttonHoverColor,
                    textColor: THEME.buttonTextColor,
                },
                onClick: () => { this.onSelectLevel(buttonIndex, this.selectedMatchType); },
            });
            this.uiManager.addElement(button);
        }

        // Match type buttons.
        const matchTypeToString: Map<MatchType, string> = new Map([
            [MatchType.PLAYER_VS_PLAYER_LOCAL, 'PvP'],
            [MatchType.PLAYER_VS_AI, 'PvAI'],
            [MatchType.AI_VS_AI, 'AIvAI'],
        ]);
        const matchIndexToMatchType: MatchType[] = [];
        const matchTypeButtonSize = new Point(.15, .08);
        const matchTypeOffsetY = .04;
        const matchTypeTopMargin = .35;
        const matchTypeLeftMargin = leftMargin + matchTypeButtonSize.x + .15;
        const matchTypeButtonColor = '#f7c25e';
        const matchTypeButtonHoverColor = '#deaf57';
        const selectedColor = '#db9d2a';
        const selectedBorderColor = '#000000';
        const matchTypeFontSize = 24;
        const matchTypes = [...matchTypeToString.keys()];
        const dimensions: ButtonDimensions[] = [];
        for (let matchTypeButtonIndex = 0;
            matchTypeButtonIndex < matchTypes.length;
            matchTypeButtonIndex++) {
            const topLeftY = matchTypeTopMargin + matchTypeButtonIndex * matchTypeOffsetY + matchTypeButtonIndex * matchTypeButtonSize.y;
            const matchType = matchTypes[matchTypeButtonIndex];
            matchIndexToMatchType.push(matchType);
            dimensions.push({
                topLeft: new Point(matchTypeLeftMargin, topLeftY),
                size: matchTypeButtonSize,
                text: matchTypeToString.get(matchType)!,
            });
        }
        const style: ButtonStyle = {
            fontSize,
            color: matchTypeButtonColor,
            hoverColor: matchTypeButtonHoverColor,
            selectedColor,
            selectedBorderColor,
            textColor: THEME.buttonTextColor,
        };
        const initialSelectionIndex = 0;
        const onChangeCallback = (index: number) => {
            this.selectedMatchType = matchIndexToMatchType[index];
        };
        onChangeCallback(initialSelectionIndex);
        this.uiManager.addElement(new ButtonGroup({
            buttons: dimensions,
            buttonStyle: style,
            initialSelectionIndex,
            onChangeCallback,
        }));
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
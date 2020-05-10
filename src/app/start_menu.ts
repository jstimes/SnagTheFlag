import { UiManager } from 'src/app/ui/ui_manager';
import { Button } from 'src/app/ui/button';
import { Point } from 'src/app/math/point';
import { RENDER_SETTINGS } from 'src/app/render_settings';
import { CONTROLS } from 'src/app/controls';
import { GameModeManager } from 'src/app/game_mode_manager';
import { THEME } from 'src/app/theme';

interface ButtonMetadata {
    text: string;
    callback: () => void;
}

export class StartMenu implements GameModeManager {
    private readonly canvas: HTMLCanvasElement;
    private readonly context: CanvasRenderingContext2D;
    private readonly onFreePlay: () => void;
    private readonly onCampaign: () => void;
    private readonly onCreateLevel: () => void;
    private readonly uiManager: UiManager;

    constructor(
        canvas: HTMLCanvasElement,
        context: CanvasRenderingContext2D,
        callbacks: {
            onFreePlay: () => void;
            onCampaign: () => void;
            onCreateLevel: () => void;
        }) {

        this.canvas = canvas;
        this.context = context;
        this.onFreePlay = callbacks.onFreePlay;
        this.onCampaign = callbacks.onCampaign;
        this.onCreateLevel = callbacks.onCreateLevel;

        this.uiManager = new UiManager(context);
        this.initMenu();
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

    private initMenu(): void {
        const topMargin = .3;
        const buttonOffsetY = .08;
        const buttonSize = new Point(.26, .1);
        const leftMargin = .5 - buttonSize.x / 2;
        const buttonColor = '#f7c25e';
        const buttonHoverColor = '#fcd281';
        const fontSize = 24;
        const buttonMetadatas: ButtonMetadata[] = [
            { text: 'Free play', callback: this.onFreePlay },
            { text: 'Campaign mode', callback: this.onCampaign },
            { text: 'Create Level', callback: this.onCreateLevel },
        ];
        for (let buttonIndex = 0; buttonIndex < buttonMetadatas.length; buttonIndex++) {
            const topLeftY = topMargin + buttonIndex * buttonOffsetY + buttonIndex * buttonSize.y;
            const buttonMetadata = buttonMetadatas[buttonIndex];
            const button = new Button({
                dimensions: {
                    topLeft: new Point(leftMargin, topLeftY),
                    size: buttonSize,
                    text: buttonMetadata.text,
                },
                style: {
                    fontSize,
                    color: buttonColor,
                    hoverColor: buttonHoverColor,
                    textColor: THEME.buttonTextColor,
                },
                onClick: buttonMetadata.callback,
            });
            this.uiManager.addElement(button);
        }
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
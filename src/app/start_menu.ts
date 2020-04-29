import { UiManager } from 'src/app/ui/ui_manager';
import { Button } from 'src/app/ui/button';
import { Point } from 'src/app/math/point';
import { RENDER_SETTINGS } from 'src/app/render_settings';
import { CONTROLS } from 'src/app/controls';

type OnLevelSelected = (levelIndex: number) => void;

export class StartMenu {
    private readonly BACKGROUND_COLOR = '#959aa3';
    private readonly TEXT_COLOR = '#1560e8';
    private readonly canvas: HTMLCanvasElement;
    private readonly context: CanvasRenderingContext2D;
    private readonly onPlayGame: () => void;
    private readonly uiManager: UiManager;

    constructor(
        canvas: HTMLCanvasElement,
        context: CanvasRenderingContext2D,
        onPlayGame: () => void) {

        this.canvas = canvas;
        this.context = context;
        this.onPlayGame = onPlayGame;

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
        this.context.fillStyle = this.BACKGROUND_COLOR;
        this.context.clearRect(0, 0, RENDER_SETTINGS.canvasWidth, RENDER_SETTINGS.canvasHeight);
        this.context.fillRect(0, 0, RENDER_SETTINGS.canvasWidth, RENDER_SETTINGS.canvasHeight);
        this.renderTitleText();
        this.uiManager.render();
    }

    destroy(): void {
        // no-op
    }

    private initLevelMenu(): void {
        const leftMargin = .4;
        const topMargin = .3;
        const buttonSize = new Point(.2, .1);
        const buttonColor = '#f7c25e';
        const buttonHoverColor = '#fcd281';
        const fontSize = 24;
        const buttonTexts = ['Play'];
        for (let buttonIndex = 0; buttonIndex < buttonTexts.length; buttonIndex++) {
            const topLeftY = (buttonIndex + 1) * topMargin + buttonIndex * buttonSize.y;
            const button = new Button({
                topLeft: new Point(leftMargin, topLeftY),
                size: buttonSize,
                text: buttonTexts[buttonIndex],
                fontSize,
                color: buttonColor,
                hoverColor: buttonHoverColor,
                textColor: this.TEXT_COLOR,
                onClickCallback: this.onPlayGame,
            });
            this.uiManager.addElement(button);
        }
    }

    private renderTitleText(): void {
        this.context.fillStyle = this.TEXT_COLOR;
        const fontSize = 72;
        this.context.font = `${fontSize}px fantasy`;
        const text = 'SnagTheFlag'
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
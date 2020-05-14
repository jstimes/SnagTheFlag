import { UiManager } from './ui/ui_manager';
import { Key, CONTROLS } from './controls';
import { Point } from './math/point';
import { TextBoxStyle, TextBox } from './ui/text_box';
import { ButtonStyle, ButtonDimensions } from './ui/button';
import { THEME } from './theme';
import { Grid } from './grid';
import { ButtonGroup } from './ui/button_group';
import { RENDER_SETTINGS } from './render_settings';

const BG_COLOR = '#d4c7c7';

export class ButtonPanel {

    private readonly uiManager: UiManager;
    private buttonGroup?: ButtonGroup;
    private readonly borderWidth: number = 8;
    private readonly leftEdgeCanvas = Grid.GAME_WIDTH;

    constructor(readonly context: CanvasRenderingContext2D) {
        this.uiManager = new UiManager(context);
    }

    update(elapsedMs: number): void {

    }

    mouseMove(mouseCanvas: Point): void {
        this.uiManager.onMouseMove(mouseCanvas);
    }

    tryClick(clickCanvas: Point): boolean {
        return this.uiManager.onClick(clickCanvas);
    }

    render(context: CanvasRenderingContext2D): void {
        // Background.
        context.fillStyle = BG_COLOR;
        context.fillRect(
            this.leftEdgeCanvas, 0,
            Grid.BUTTON_PANE_WIDTH, Grid.BUTTON_PANE_HEIGHT);

        // Border.
        context.fillStyle = '#000000';
        context.fillRect(
            this.leftEdgeCanvas, 0,
            this.borderWidth, Grid.BUTTON_PANE_HEIGHT);

        this.uiManager.render();
    }

    selectIndex(index: number): void {
        if (this.buttonGroup === undefined) {
            throw new Error(`No buttonGroup in selectIndex'`);
        }
        this.buttonGroup.select(index);
    }

    clear(): void {
        this.buttonGroup = undefined;
        this.uiManager.removeAll();
    }

    addSidebarButtonGroup(headerTextLines: string[], buttonInfos:
        { key: Key; func: () => void; name: string; }[]): void {
        const leftUiCoord = (RENDER_SETTINGS.canvasWidth - Grid.BUTTON_PANE_WIDTH + this.borderWidth)
            / RENDER_SETTINGS.canvasWidth;
        const widthUi = 1 - leftUiCoord;
        const fontSize = 18;
        const buttonOffsetY = .01;

        const headerStyle: TextBoxStyle = {
            color: BG_COLOR,
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

        const horizontalMargins = .01;
        const maxWidth = widthUi - (horizontalMargins * 2);
        const buttonSize = new Point(maxWidth, .06);
        const headerSize = new Point(maxWidth, .025);
        const leftMargin = leftUiCoord + horizontalMargins;
        const maxWidthUi = 1 - leftMargin - horizontalMargins;
        const maxWidthCanvas = maxWidthUi * RENDER_SETTINGS.canvasWidth;
        const rows = headerTextLines.length;
        let topMargin = .08;
        for (let row = 0; row < rows; row++) {
            const header = new TextBox({
                dimensions: {
                    size: headerSize,
                    text: headerTextLines[row],
                    topLeft: new Point(leftMargin, topMargin),
                },
                style: headerStyle,
            });
            this.uiManager.addElement(header);
            topMargin += buttonOffsetY + headerSize.y;
        }

        const dimensions: ButtonDimensions[] = [];
        const columnSize = 6;
        for (let buttonIndex = 0; buttonIndex < buttonInfos.length; buttonIndex++) {
            let row = buttonIndex % columnSize;
            const topLeftY = topMargin + row * buttonOffsetY
                + row * buttonSize.y;
            const button = buttonInfos[buttonIndex];
            dimensions.push({
                topLeft: new Point(leftMargin, topLeftY),
                size: buttonSize,
                text: `${button.name} (${CONTROLS.getStringForKey(button.key)})`,
            });
        }

        const initialSelectionIndex = 0;
        const onChangeCallback = (index: number) => {
            buttonInfos[index].func();
        };
        this.buttonGroup = new ButtonGroup({
            buttons: dimensions,
            buttonStyle,
            initialSelectionIndex: initialSelectionIndex,
            onChangeCallback: onChangeCallback,
        });
        this.uiManager.addElement(this.buttonGroup);
    }
}
import { UiManager } from './ui/ui_manager';
import { Key, CONTROLS, ControlParams } from './controls';
import { Point } from './math/point';
import { TextBoxStyle, TextBox } from './ui/text_box';
import { ButtonStyle, ButtonDimensions, Button } from './ui/button';
import { THEME } from './theme';
import { Grid } from './grid';
import { ButtonGroup } from './ui/button_group';
import { RENDER_SETTINGS } from './render_settings';

const BG_COLOR = '#a68b8b';

export class ButtonPanel {

    private readonly uiManager: UiManager;
    private buttonGroup?: ButtonGroup;
    private readonly borderWidth: number = 8;
    private readonly leftEdgeCanvas = Grid.GAME_WIDTH;

    private readonly leftUiCoord =
        (Grid.GAME_WIDTH + this.borderWidth) / RENDER_SETTINGS.canvasWidth;
    private readonly widthUi = 1 - this.leftUiCoord;
    private readonly horizontalMargins = .01;
    private readonly maxWidth = this.widthUi - (this.horizontalMargins * 2);
    private readonly leftMargin = this.leftUiCoord + this.horizontalMargins;
    private readonly maxWidthUi = 1 - this.leftMargin - this.horizontalMargins;
    private readonly fontSize = 18;
    private readonly buttonOffsetY = .01;
    private readonly buttonSize = new Point(this.maxWidth, .06);
    private readonly headerSize = new Point(this.maxWidth, .025);

    private readonly headerStyle: TextBoxStyle = {
        color: BG_COLOR,
        fontSize: this.fontSize,
        textColor: '#000000',
    };
    private readonly buttonStyle: ButtonStyle = {
        fontSize: this.fontSize,
        color: '#f7c25e',
        hoverColor: '#deaf57',
        selectedColor: '#db9d2a',
        selectedBorderColor: '#000000',
        textColor: THEME.buttonTextColor,
    };

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

    configurePanel(params: {
        headerTextLines: string[];
        buttonInfos: ControlParams[];
        isButtonGroup: boolean;
    }): void {
        const { headerTextLines, buttonInfos, isButtonGroup } = params;
        const rows = headerTextLines.length;
        let topMargin = .08;
        for (let row = 0; row < rows; row++) {
            const header = new TextBox({
                dimensions: {
                    size: this.headerSize,
                    text: headerTextLines[row],
                    topLeft: new Point(this.leftMargin, topMargin),
                },
                style: this.headerStyle,
            });
            this.uiManager.addElement(header);
            topMargin += this.buttonOffsetY + this.headerSize.y;
        }

        const dimensions: ButtonDimensions[] = [];
        const columnSize = 6;
        for (let buttonIndex = 0; buttonIndex < buttonInfos.length; buttonIndex++) {
            let row = buttonIndex % columnSize;
            const topLeftY = topMargin + row * this.buttonOffsetY
                + row * this.buttonSize.y;
            const button = buttonInfos[buttonIndex];
            dimensions.push({
                topLeft: new Point(this.leftMargin, topLeftY),
                size: this.buttonSize,
                text: `${button.name} (${CONTROLS.getStringForKey(button.key)})`,
            });
        }

        const initialSelectionIndex = 0;
        const onChangeCallback = (index: number) => {
            buttonInfos[index].func();
        };
        if (isButtonGroup) {
            this.buttonGroup = new ButtonGroup({
                buttons: dimensions,
                buttonStyle: this.buttonStyle,
                initialSelectionIndex: initialSelectionIndex,
                onChangeCallback: onChangeCallback,
            });
            this.uiManager.addElement(this.buttonGroup);
        } else {
            for (let index = 0; index < buttonInfos.length; index++) {
                const dimension = dimensions[index];
                this.uiManager.addElement(new Button({
                    dimensions: dimension,
                    style: this.buttonStyle,
                    onClick: buttonInfos[index].func,
                }));
            }
        }
    }
}
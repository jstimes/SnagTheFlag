import { UiManager } from './ui/ui_manager';
import { Key, CONTROLS, ControlParams } from './controls';
import { Point } from './math/point';
import { TextBoxStyle, TextBox } from './ui/text_box';
import { ButtonStyle, ButtonDimensions, Button } from './ui/button';
import { THEME } from './theme';
import { Grid } from './grid';
import { ButtonGroup } from './ui/button_group';
import { RENDER_SETTINGS } from './render_settings';

export class ButtonPanel {

    private readonly uiManager: UiManager;
    private buttonGroup?: ButtonGroup;
    private descriptionTextBoxes?: TextBox[];
    private bottomButtons?: Button[];

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
    private readonly descriptionFontSize = 16;
    private readonly buttonOffsetY = .01;
    private readonly buttonSize = new Point(this.maxWidth, .05);
    private readonly headerSize = new Point(this.maxWidth, .025);

    private buttonGroupBottomMargin: number;

    private readonly headerStyle: TextBoxStyle = {
        color: THEME.buttonPanelBgColor,
        fontSize: this.fontSize,
        textColor: THEME.buttonPanelTextBoxTextColor,
    };
    private readonly buttonStyle: ButtonStyle = {
        fontSize: this.fontSize,
        color: THEME.buttonPanelButtonColor,
        hoverColor: THEME.buttonPanelButtonHoverColor,
        selectedColor: THEME.buttonPanelButtonSelectedColor,
        selectedBorderColor: THEME.buttonPanelButtonSelectedBorderColor,
        textColor: THEME.buttonPanelButtonTextColor,
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
        context.fillStyle = THEME.buttonPanelBgColor;
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
        this.clearBottomButtons();
        this.clearDescription();
        this.uiManager.removeAll();
    }

    configurePanel(params: {
        headerTextLines: string[];
        buttonInfos: ControlParams[];
        isButtonGroup: boolean;
    }): void {
        const { headerTextLines, buttonInfos, isButtonGroup } = params;
        const rows = headerTextLines.length;
        let topMargin = .02;
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
        const lastButton = dimensions[dimensions.length - 1];
        this.buttonGroupBottomMargin = lastButton.topLeft.y + lastButton.size.y;
    }

    setDescription(textLines: string[]): void {
        const buttonsBottom = this.buttonGroupBottomMargin
            + this.buttonOffsetY * 2;
        let topMargin = buttonsBottom;
        this.clearDescription();
        const descriptionStyle: TextBoxStyle = {
            fontSize: this.descriptionFontSize,
            color: this.headerStyle.color,
            textColor: this.headerStyle.textColor,
        };
        for (let row = 0; row < textLines.length; row++) {
            const text = textLines[row];
            this.context.font = `${this.descriptionFontSize}px fantasy`;
            const width = this.context.measureText(text).width
                / RENDER_SETTINGS.canvasWidth;
            const size = new Point(width, this.headerSize.y);
            const header = new TextBox({
                dimensions: {
                    size,
                    text,
                    topLeft: new Point(this.leftMargin, topMargin),
                },
                style: descriptionStyle,
            });
            this.descriptionTextBoxes!.push(header);
            this.uiManager.addElement(header);
            topMargin += this.headerSize.y - .002;
        }
    }

    private clearDescription(): void {
        if (this.descriptionTextBoxes == null) {
            this.descriptionTextBoxes = [];
            return;
        }
        for (const textBox of this.descriptionTextBoxes) {
            this.uiManager.removeElement(textBox);
        }
        this.descriptionTextBoxes = [];
    }

    setBottomButtons(params: ControlParams[]): void {
        this.clearBottomButtons();
        let topY = 1 + (-this.buttonOffsetY - this.buttonSize.y) * params.length;
        for (const param of params) {
            const dimensions = {
                topLeft: new Point(this.leftMargin, topY),
                size: this.buttonSize,
                text: `${param.name} (${CONTROLS.getStringForKey(param.key)})`,
            };
            const button = new Button({
                dimensions,
                style: this.buttonStyle,
                onClick: param.func,
            });
            this.uiManager.addElement(button);
            this.bottomButtons!.push(button);
            topY += (this.buttonOffsetY + this.buttonSize.y);
        }
    }

    private clearBottomButtons(): void {
        if (this.bottomButtons != null && this.bottomButtons.length > 0) {
            for (const button of this.bottomButtons) {
                this.uiManager.removeElement(button);
            }
        }
        this.bottomButtons = [];
    }
}
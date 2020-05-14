import { Point } from 'src/app/math/point';
import { Element } from 'src/app/ui/element';
import { RENDER_SETTINGS } from 'src/app/render_settings';
import { Button, ButtonStyle, ButtonDimensions } from './button';


interface ButtonGroupParams {
    readonly buttons: ButtonDimensions[];
    readonly buttonStyle: ButtonStyle;

    readonly initialSelectionIndex: number;
    readonly onChangeCallback: (selectedIndex: number) => void;
}

export class ButtonGroup implements Element {

    private readonly buttons: Button[];
    readonly onChangeCallback: (selectedIndex: number) => void;

    /* State */
    private currentlySelectedIndex: number;

    constructor(params: ButtonGroupParams) {
        this.buttons = [];
        for (let index = 0; index < params.buttons.length; index++) {
            const buttonParam = params.buttons[index];
            this.buttons.push(new Button({
                dimensions: {
                    topLeft: buttonParam.topLeft,
                    size: buttonParam.size,
                    text: buttonParam.text,
                },
                style: {
                    fontSize: params.buttonStyle.fontSize,
                    /** Hex strings */
                    color: params.buttonStyle.color,
                    hoverColor: params.buttonStyle.hoverColor,
                    textColor: params.buttonStyle.textColor,
                    selectedColor: params.buttonStyle.selectedColor,
                    selectedBorderColor: params.buttonStyle.selectedBorderColor,
                },
                onClick: () => {
                    this.onButtonClicked(index);
                },
            }));
        }
        this.onChangeCallback = params.onChangeCallback;
        this.currentlySelectedIndex = params.initialSelectionIndex;
        this.buttons[this.currentlySelectedIndex].setIsSelected(true);
    }

    readonly render = (context: CanvasRenderingContext2D) => {
        for (const button of this.buttons) {
            button.render(context);
        }
    };

    readonly onClick = (uiCoords: Point): boolean => {
        for (const button of this.buttons) {
            if (button.onClick(uiCoords)) {
                return true;
            }
        }
        return false;
    };

    readonly onMouseMove = (uiCoords: Point) => {
        for (const button of this.buttons) {
            button.onMouseMove(uiCoords);
        }
    };

    private readonly onButtonClicked = (index: number) => {
        if (index !== this.currentlySelectedIndex) {
            this.buttons[this.currentlySelectedIndex].setIsSelected(false);
            this.currentlySelectedIndex = index;
            this.buttons[this.currentlySelectedIndex].setIsSelected(true);
            this.onChangeCallback(this.currentlySelectedIndex);
        }
    };
}
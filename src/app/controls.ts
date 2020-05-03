import { Point } from 'src/app/math/point';
import { RENDER_SETTINGS } from 'src/app/render_settings';

export enum EventType {
    KeyDown,
    KeyUp,
    KeyPress,
}

enum KeyPressState {
    NOT_STARTED,
    READY,
    DOWN,
}

export class ControlMap {
    assignedControls: Map<Key, () => void> = new Map();
    keyToEventType: Map<Key, EventType> = new Map();

    keyToKeyPressState: Map<Key, KeyPressState> = new Map();

    add(params: { key: Key, name: string, func: () => void, eventType: EventType }) {
        this.assignedControls.set(params.key, params.func);
        CONTROLS.addAssignedControl(params.key, params.name);
        this.keyToEventType.set(params.key, params.eventType);

        if (params.eventType === EventType.KeyPress) {
            this.keyToKeyPressState.set(
                params.key,
                CONTROLS.isKeyDown(params.key) ? KeyPressState.NOT_STARTED
                    : KeyPressState.READY);
        }
    }

    remove(key: Key): void {
        CONTROLS.removeAssignedControl(key);
        this.assignedControls.delete(key);
        this.keyToEventType.delete(key);
    }

    clear(): void {
        for (let key of this.assignedControls.keys()) {
            CONTROLS.removeAssignedControl(key);
        }
        this.assignedControls.clear();
        this.keyToEventType.clear();
    }

    check(): void {
        for (let key of this.assignedControls.keys()) {
            const eventType = this.keyToEventType.get(key);
            const isKeyDown = CONTROLS.isKeyDown(key);
            if (eventType === EventType.KeyDown && isKeyDown
                || eventType === EventType.KeyUp && !isKeyDown) {
                this.assignedControls.get(key)!();
            } else if (eventType === EventType.KeyPress) {
                const currentState = this.keyToKeyPressState.get(key);
                if (isKeyDown) {
                    if (currentState === KeyPressState.READY) {
                        this.keyToKeyPressState.set(key, KeyPressState.DOWN);
                    }
                } else {
                    switch (currentState) {
                        case KeyPressState.DOWN:
                            this.assignedControls.get(key)!();
                            this.keyToKeyPressState.set(key, KeyPressState.READY);
                            break;
                        case KeyPressState.NOT_STARTED:
                            this.keyToKeyPressState.set(key, KeyPressState.READY);
                            break;
                        default:
                            break;
                    }
                }
            }
        }
    }
}

class Controls {

    /** Value is true if Key is pressed. */
    private readonly keyMap: Map<Key, boolean> = new Map();

    /** Key to action it's bound to. */
    private readonly assignedControlMap: Map<Key, string> = new Map();

    private mouseCanvasCoords: Point = new Point(0, 0);
    private isMouseDownInternal: boolean = false;
    private hasClickInternal: boolean = false;

    constructor() {
        document.onkeydown = (e: KeyboardEvent) => {
            this.keyMap.set(e.keyCode, true);
            console.log(e.keyCode);
        };
        document.onkeyup = (e: KeyboardEvent) => {
            this.keyMap.set(e.keyCode, false);
        };
    }

    initMouseControls(canvas: HTMLCanvasElement): void {
        const isPointInCanvas = (pt: Point): boolean => {
            return pt.x >= 0 && pt.x <= RENDER_SETTINGS.canvasWidth
                && pt.y >= 0 && pt.y <= RENDER_SETTINGS.canvasHeight;
        };
        canvas.onmousemove = (event: MouseEvent) => {
            const canvasRect = canvas.getBoundingClientRect();
            const canvasCoords = new Point(
                event.clientX - canvasRect.left,
                event.clientY - canvasRect.top);
            if (isPointInCanvas(canvasCoords)) {
                this.mouseCanvasCoords = canvasCoords;
            }
        };
        canvas.onmousedown = (event: MouseEvent) => {
            this.isMouseDownInternal = true;
        };
        canvas.onmouseup = (event: MouseEvent) => {
            this.isMouseDownInternal = false;
        };
        canvas.onclick = (event: MouseEvent) => {
            this.hasClickInternal = true;
        };
    }

    hasClick(): boolean {
        return this.hasClickInternal;
    }

    handleClick(): Point {
        if (!this.hasClick()) {
            throw new Error(`Must check hasClick before handleClick, or click already handled.`);
        }
        this.hasClickInternal = false;
        return this.mouseCanvasCoords;
    }

    getMouseCanvasCoords(): Point {
        return this.mouseCanvasCoords;
    }

    isMouseDown(): boolean {
        return this.isMouseDownInternal;
    }

    isKeyDown(key: Key): boolean {
        const isDown = this.keyMap.get(key);
        if (isDown == null) {
            throw new Error(
                `Called isKeyDown for unmapped key: ${this.getStringForKey(key)}`);
        }
        return isDown;
    }

    addAssignedControl(key: Key, action: string): void {
        if (this.assignedControlMap.has(key)) {
            throw new Error(`Double-bound a control: ${key}`);
        }
        this.assignedControlMap.set(key, action);
        if (!this.keyMap.has(key)) {
            this.keyMap.set(key, false);
        }
    }

    removeAssignedControl(key: Key): void {
        if (!this.assignedControlMap.has(key)) {
            throw new Error('Removing unassigned control');
        }
        this.assignedControlMap.delete(key);
    }

    getAssignedControlMap(): Map<Key, string> {
        return this.assignedControlMap;
    }

    getStringForKey(key: Key): string {
        switch (key) {
            case Key.A:
                return 'A';
            case Key.B:
                return 'B';
            case Key.C:
                return 'C';
            case Key.D:
                return 'D';
            case Key.E:
                return 'E';
            case Key.F:
                return 'F';
            case Key.G:
                return 'G';
            case Key.H:
                return 'H';
            case Key.I:
                return 'I';
            case Key.J:
                return 'J';
            case Key.K:
                return 'K';
            case Key.L:
                return 'L';
            case Key.M:
                return 'M';
            case Key.N:
                return 'N';
            case Key.O:
                return 'O';
            case Key.P:
                return 'P';
            case Key.Q:
                return 'Q';
            case Key.R:
                return 'R';
            case Key.S:
                return 'S';
            case Key.T:
                return 'T';
            case Key.U:
                return 'U';
            case Key.V:
                return 'V';
            case Key.W:
                return 'W';
            case Key.X:
                return 'X';
            case Key.Y:
                return 'Y';
            case Key.Z:
                return 'Z';
            case Key.ONE:
                return '1';
            case Key.TWO:
                return '2';
            case Key.THREE:
                return '3';
            case Key.FOUR:
                return '4';
            case Key.FIVE:
                return '5';
            case Key.SIX:
                return '6';
            case Key.SEVEN:
                return '7';
            case Key.EIGHT:
                return '8';
            case Key.NINE:
                return '9';
            case Key.ZERO:
                return '0';
            case Key.SPACE:
                return 'Space';
            case Key.QUESTION_MARK:
                return '?';
            case Key.LEFT_ARROW:
                return 'Left arrow';
            case Key.UP_ARROW:
                return 'Up arrow';
            case Key.RIGHT_ARROW:
                return 'Right arrow';
            case Key.DOWN_ARROW:
                return 'Down arrow';
            default:
                throw new Error("Need to add string for Key");
        }
    }
}

export enum Key {
    ENTER = 13,
    SHIFT = 16,
    SPACE = 32,

    LEFT_ARROW = 37,
    UP_ARROW = 38,
    RIGHT_ARROW = 39,
    DOWN_ARROW = 40,

    ONE = 49,
    TWO = 50,
    THREE = 51,
    FOUR = 52,
    FIVE = 53,
    SIX = 54,
    SEVEN = 55,
    EIGHT = 56,
    NINE = 57,
    ZERO = 58,

    A = 65,
    B = 66,
    C = 67,
    D = 68,
    E = 69,
    F = 70,
    G = 71,
    H = 72,
    I = 73,
    J = 74,
    K = 75,
    L = 76,
    M = 77,
    N = 78,
    O = 79,
    P = 80,
    Q = 81,
    R = 82,
    S = 83,
    T = 84,
    U = 85,
    V = 86,
    W = 87,
    X = 88,
    Y = 89,
    Z = 90,

    // TODO - this is actually backwards slash...
    QUESTION_MARK = 191,
}

export const numberToKey = new Map<number, Key>([
    [1, Key.ONE],
    [2, Key.TWO],
    [3, Key.THREE],
    [4, Key.FOUR],
    [5, Key.FIVE],
    [6, Key.SIX],
    [7, Key.SEVEN],
    [8, Key.EIGHT],
    [9, Key.NINE],
]);

export const numberToOrdinal = new Map<number, string>([
    [1, '1st'],
    [2, '2nd'],
    [3, '3rd'],
    [4, '4th'],
    [5, '5th'],
    [6, '6th'],
    [7, '7th'],
    [8, '8th'],
    [9, '9th'],
]);

export const CONTROLS = new Controls();
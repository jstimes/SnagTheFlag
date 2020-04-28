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
                this.assignedControls.get(key)();
            } else if (eventType === EventType.KeyPress) {
                const currentState = this.keyToKeyPressState.get(key);
                if (isKeyDown) {
                    if (currentState === KeyPressState.READY) {
                        this.keyToKeyPressState.set(key, KeyPressState.DOWN);
                    }
                } else {
                    switch (currentState) {
                        case KeyPressState.DOWN:
                            this.assignedControls.get(key)();
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

    constructor() {
        document.onkeydown = (e: KeyboardEvent) => {
            this.keyMap.set(e.keyCode, true);
        };
        document.onkeyup = (e: KeyboardEvent) => {
            this.keyMap.set(e.keyCode, false);
        };
    }

    isKeyDown(key: Key): boolean {
        return this.keyMap.get(key);
    }

    addAssignedControl(key: Key, action: string): void {
        if (this.assignedControlMap.has(key)) {
            throw new Error(`Double-bound a control: ${key}`);
        }
        this.assignedControlMap.set(key, action);
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
            case Key.D:
                return 'D';
            case Key.W:
                return 'W';
            case Key.S:
                return 'S';
            case Key.J:
                return 'J';
            case Key.L:
                return 'L';
            case Key.N:
                return 'N';
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
            default:
                throw new Error("Need to add string for Key");
        }
    }
}

export enum Key {
    ENTER = 13,
    SHIFT = 16,
    SPACE = 32,

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
}

export const CONTROLS = new Controls();
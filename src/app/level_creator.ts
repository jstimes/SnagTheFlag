import { RENDER_SETTINGS } from 'src/app/render_settings';
import { Grid } from 'src/app/grid';
import { Point } from 'src/app/math/point';
import { Obstacle } from 'src/app/obstacle';
import { CONTROLS, ControlMap, EventType, Key } from 'src/app/controls';
import { THEME } from 'src/app/theme';

export class LevelCreator {
    private readonly canvas: HTMLCanvasElement;
    private readonly context: CanvasRenderingContext2D;
    private readonly onExitGameCallback: () => void;

    private obstacles: Obstacle[];
    private controlMap: ControlMap;

    constructor(
        canvas: HTMLCanvasElement,
        context: CanvasRenderingContext2D,
        onExitGameCallback: () => void) {

        this.canvas = canvas;
        this.context = context;
        this.onExitGameCallback = onExitGameCallback;
        this.resetGame();
    }

    update(elapsedMs: number): void {
        this.controlMap.check();
        if (CONTROLS.hasClick()) {
            const clickCoords = CONTROLS.handleClick();
            const mouseTileCoords = Grid.getTileFromCanvasCoords(clickCoords);
            const obstacle = new Obstacle(mouseTileCoords);
            this.obstacles.push(obstacle);
        }
        for (const obstacle of this.obstacles) {
            obstacle.update(elapsedMs);
        }
    }

    render(): void {
        const context = this.context;
        context.fillStyle = THEME.gridBackgroundColor;
        context.clearRect(0, 0, RENDER_SETTINGS.canvasWidth, RENDER_SETTINGS.canvasHeight);
        context.fillRect(0, 0, RENDER_SETTINGS.canvasWidth, RENDER_SETTINGS.canvasHeight);

        // Draw grid lines.
        for (let i = 0; i < Grid.TILES_WIDE; i++) {
            const startX = i * Grid.TILE_SIZE;
            const endX = startX;
            const startY = 0;
            const endY = RENDER_SETTINGS.canvasHeight;

            context.beginPath();
            context.strokeStyle = THEME.gridLineColor;
            context.moveTo(startX, startY);
            context.lineTo(endX, endY);
            context.stroke();
        }
        for (let i = 0; i < Grid.TILES_TALL; i++) {
            const startX = 0;
            const endX = RENDER_SETTINGS.canvasWidth;
            const startY = i * Grid.TILE_SIZE;
            const endY = startY;

            context.beginPath();
            context.strokeStyle = THEME.gridLineColor;
            context.moveTo(startX, startY);
            context.lineTo(endX, endY);
            context.stroke();
        }

        // Indicate hovered tile.
        const mouseTileCoords = Grid.getTileFromCanvasCoords(CONTROLS.getMouseCanvasCoords());
        const tileCanvasTopLeft = Grid.getCanvasFromTileCoords(mouseTileCoords);
        context.fillStyle = THEME.hoveredTileColor;
        context.fillRect(tileCanvasTopLeft.x, tileCanvasTopLeft.y, Grid.TILE_SIZE, Grid.TILE_SIZE);

        for (const obstacle of this.obstacles) {
            obstacle.render(context);
        }

        this.renderControls();
    }

    private renderControls(): void {
        const context = this.context;
        context.fillStyle = THEME.textColor;
        const fontSize = 18;
        context.font = `${fontSize}px fantasy`;

        let renderTop = new Point(
            RENDER_SETTINGS.canvasWidth / 64,
            RENDER_SETTINGS.canvasHeight / 32);
        for (const key of this.controlMap.assignedControls.keys()) {
            const action = CONTROLS.getAssignedControlMap().get(key);
            context.fillText(
                `${CONTROLS.getStringForKey(key)} - ${action}`,
                renderTop.x,
                renderTop.y);

            renderTop = renderTop.add(new Point(0, fontSize + 4));
        }
    }

    destroy(): void {
        if (this.controlMap) {
            this.controlMap.clear();
        }
    }

    private readonly saveLevel = (): void => {
        // TODO
    };

    private resetGame = (): void => {
        this.destroy();
        this.obstacles = [];
        this.controlMap = new ControlMap();
        this.controlMap.add({
            key: Key.Q,
            name: 'Quit',
            func: this.onExitGameCallback,
            eventType: EventType.KeyPress,
        });
        this.controlMap.add({
            key: Key.R,
            name: 'Reset',
            func: this.resetGame,
            eventType: EventType.KeyPress,
        });
        this.controlMap.add({
            key: Key.S,
            name: 'Save',
            func: this.saveLevel,
            eventType: EventType.KeyPress,
        });
    }
}

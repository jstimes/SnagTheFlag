import { RENDER_SETTINGS } from 'src/app/render_settings';
import { Grid } from 'src/app/grid';
import { Point, pointFromSerialized } from 'src/app/math/point';
import { Obstacle } from 'src/app/obstacle';
import { CONTROLS, ControlMap, EventType, Key } from 'src/app/controls';
import { THEME } from 'src/app/theme';
import { Flag } from 'src/app/flag';
import { LEVELS } from 'src/app/level';

export class GameManager {

    private readonly canvas: HTMLCanvasElement;
    private readonly context: CanvasRenderingContext2D;
    private readonly levelIndex: number;
    private readonly onExitGameCallback: () => void;

    private obstacles: Obstacle[];
    private redFlag: Flag;
    private blueFlag: Flag;
    private controlMap: ControlMap;

    constructor(
        canvas: HTMLCanvasElement,
        context: CanvasRenderingContext2D,
        params: {
            levelIndex: number;
            onExitGameCallback: () => void;
        }) {

        this.canvas = canvas;
        this.context = context;
        this.levelIndex = params.levelIndex;
        this.onExitGameCallback = params.onExitGameCallback;
        this.resetGame();
    }

    update(elapsedMs: number): void {
        this.controlMap.check();
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
        context.fillStyle = THEME.emptyCellHoverColor;
        context.fillRect(tileCanvasTopLeft.x, tileCanvasTopLeft.y, Grid.TILE_SIZE, Grid.TILE_SIZE);

        for (const gameObject of this.obstacles) {
            gameObject.render(context);
        }
        this.redFlag.render(this.context);
        this.blueFlag.render(this.context);
    }

    destroy(): void {
        if (this.controlMap) {
            this.controlMap.clear();
        }
    }

    private resetGame = (): void => {
        this.destroy();
        this.loadLevel();
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
    }

    private loadLevel(): void {
        const level = LEVELS[this.levelIndex];
        this.redFlag = new Flag({
            tileCoords: pointFromSerialized(level.data.redFlag),
            isBlue: false,
        });
        this.blueFlag = new Flag({
            tileCoords: pointFromSerialized(level.data.blueFlag),
            isBlue: true,
        });
        this.obstacles = level.data.obstacles.map((serializedPt) => {
            return new Obstacle(pointFromSerialized(serializedPt));
        });
    }
}

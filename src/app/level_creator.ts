import { RENDER_SETTINGS } from 'src/app/render_settings';
import { Grid } from 'src/app/grid';
import { Point } from 'src/app/math/point';
import { Obstacle } from 'src/app/obstacle';
import { Flag } from 'src/app/flag';
import { CONTROLS, ControlMap, EventType, Key } from 'src/app/controls';
import { THEME } from 'src/app/theme';
import { hexStringToColor, colorToString } from 'src/app/color';

enum PlacementMode {
    BLUE_FLAG,
    RED_FLAG,
    OBSTACLE,
    ERASE,
}

export class LevelCreator {
    private readonly canvas: HTMLCanvasElement;
    private readonly context: CanvasRenderingContext2D;
    private readonly onExitGameCallback: () => void;

    private placementMode: PlacementMode;
    private obstacles: Obstacle[];
    private blueFlag?: Flag;
    private redFlag?: Flag;
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
        if (!CONTROLS.hasClick()) {
            return;
        }
        const clickCoords = CONTROLS.handleClick();
        const mouseTileCoords = Grid.getTileFromCanvasCoords(clickCoords);
        if (!this.isTileOccupied(mouseTileCoords)) {
            switch (this.placementMode) {
                case PlacementMode.BLUE_FLAG:
                    this.blueFlag = new Flag({ tileCoords: mouseTileCoords, isBlue: true });
                    break;
                case PlacementMode.RED_FLAG:
                    this.redFlag = new Flag({ tileCoords: mouseTileCoords, isBlue: false });
                    break;
                case PlacementMode.OBSTACLE:
                    const obstacle = new Obstacle(mouseTileCoords);
                    this.obstacles.push(obstacle);
                    break;
            }
        } else if (this.placementMode === PlacementMode.ERASE) {
            this.removeObjectInTile(mouseTileCoords);
        }
    }

    private isTileOccupied(tileCoords: Point): boolean {
        if (this.redFlag != null && this.redFlag.tileCoords.equals(tileCoords)) {
            return true;
        }
        if (this.blueFlag != null && this.blueFlag.tileCoords.equals(tileCoords)) {
            return true;
        }
        const obstacle = this.obstacles.find((obstacle: Obstacle) => obstacle.tileCoords.equals(tileCoords));
        return obstacle != null;
    }

    private removeObjectInTile(tileCoords: Point): void {
        if (this.redFlag != null && this.redFlag.tileCoords.equals(tileCoords)) {
            this.redFlag = null;
        }
        if (this.blueFlag != null && this.blueFlag.tileCoords.equals(tileCoords)) {
            this.blueFlag = null;
        }
        this.obstacles = this.obstacles.filter((obstacle: Obstacle) => !obstacle.tileCoords.equals(tileCoords));
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

        const mouseTileCoords = Grid.getTileFromCanvasCoords(CONTROLS.getMouseCanvasCoords());
        const tileCanvasTopLeft = Grid.getCanvasFromTileCoords(mouseTileCoords);
        if (this.placementMode !== PlacementMode.ERASE && !this.isTileOccupied(mouseTileCoords)) {
            // Indicate hovered tile.
            const tileCanvasTopLeft = Grid.getCanvasFromTileCoords(mouseTileCoords);
            let hoverColor = THEME.obstacleColor;
            if (this.placementMode === PlacementMode.RED_FLAG) {
                hoverColor = THEME.redFlagColor;
            } else if (this.placementMode === PlacementMode.BLUE_FLAG) {
                hoverColor = THEME.blueFlagColor;
            }
            const hoverAlpha = .7;
            const fillColor = hexStringToColor(hoverColor);
            fillColor.a = hoverAlpha;
            context.fillStyle = colorToString(fillColor);
            context.fillRect(tileCanvasTopLeft.x, tileCanvasTopLeft.y, Grid.TILE_SIZE, Grid.TILE_SIZE);
        }

        for (const obstacle of this.obstacles) {
            obstacle.render(context);
        }
        if (this.redFlag != null) {
            this.redFlag.render(this.context);
        }
        if (this.blueFlag != null) {
            this.blueFlag.render(this.context);
        }

        if (this.placementMode === PlacementMode.ERASE && this.isTileOccupied(mouseTileCoords)) {
            context.fillStyle = '#000000';
            context.fillRect(tileCanvasTopLeft.x, tileCanvasTopLeft.y, Grid.TILE_SIZE, Grid.TILE_SIZE);
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
        this.placementMode = PlacementMode.OBSTACLE;
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
        this.controlMap.add({
            key: Key.O,
            name: 'Place Obstacles',
            func: () => { this.setPlacementMode(PlacementMode.OBSTACLE) },
            eventType: EventType.KeyPress,
        });
        this.controlMap.add({
            key: Key.B,
            name: 'Place Blue Flag',
            func: () => { this.setPlacementMode(PlacementMode.BLUE_FLAG) },
            eventType: EventType.KeyPress,
        });
        this.controlMap.add({
            key: Key.V,
            name: 'Place Red Flag',
            func: () => { this.setPlacementMode(PlacementMode.RED_FLAG) },
            eventType: EventType.KeyPress,
        });
        this.controlMap.add({
            key: Key.E,
            name: 'Erase',
            func: () => { this.setPlacementMode(PlacementMode.ERASE) },
            eventType: EventType.KeyPress,
        });
    }

    private setPlacementMode(mode: PlacementMode): void {
        this.placementMode = mode;
    }
}

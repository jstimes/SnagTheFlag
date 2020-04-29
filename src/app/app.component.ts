import { Component } from '@angular/core';
import { RENDER_SETTINGS } from 'src/app/render_settings';
import { Grid } from 'src/app/grid';
import { Point } from 'src/app/math/point';
import { GameObject } from 'src/app/game_object';
import { CONTROLS } from 'src/app/controls';
import { GameManager } from 'src/app/game_manager';
import { StartMenu } from 'src/app/start_menu';


const BACKGROUND_COLOR = '#959aa3';
const GRID_COLOR = '#1560e8';
const HOVERED_TILE_COLOR = '#f7c25e';

enum GameState {
  START_MENU,
  GAME,
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {

  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  lastRenderTime = 0;

  gameState: GameState = GameState.START_MENU;
  gameManager?: GameManager;
  startMenu?: StartMenu;

  ngOnInit() {
    this.canvas = document.getElementById('canvas') as HTMLCanvasElement;
    this.canvas.setAttribute('height', `${RENDER_SETTINGS.canvasHeight}px`);
    this.canvas.setAttribute('width', `${RENDER_SETTINGS.canvasWidth}px`);
    this.context = this.canvas.getContext('2d');
    CONTROLS.initMouseControls(this.canvas);
    this.initStartMenu();
    window.requestAnimationFrame((timestamp: number) => {
      this.lastRenderTime = timestamp;
      this.gameLoop(timestamp);
    });
  }

  gameLoop(timestamp: number): void {
    const elapsedMs = timestamp - this.lastRenderTime;
    if (elapsedMs > RENDER_SETTINGS.msBetweenRenders) {
      this.lastRenderTime = timestamp;
      switch (this.gameState) {
        case GameState.START_MENU:
          this.startMenu.update(elapsedMs);
          // TODO - find a better way to transition states...
          if (this.startMenu != null) {
            this.startMenu.render();
          }
          break;
        case GameState.GAME:
          this.gameManager.update(elapsedMs);
          if (this.gameManager != null) {
            this.gameManager.render();
          }
          break;
        default:
          throw new Error('Unknown GameState');
      }
    }
    window.requestAnimationFrame((timestamp: number) => {
      this.gameLoop(timestamp);
    });
  }

  private initStartMenu(): void {
    this.gameState = GameState.START_MENU;
    this.startMenu = new StartMenu(
      this.canvas,
      this.context,
      () => {
        this.startMenu.destroy();
        this.startMenu = null;
        this.initGame();
      });
  }

  private initGame(): void {
    this.gameState = GameState.GAME;
    this.gameManager = new GameManager(
      this.canvas,
      this.context,
      () => {
        this.gameManager.destroy();
        this.gameManager = null;
        this.initStartMenu();
      });
  }
}

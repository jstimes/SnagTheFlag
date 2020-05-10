import { Component } from '@angular/core';
import { RENDER_SETTINGS } from 'src/app/render_settings';
import { Grid } from 'src/app/grid';
import { Point } from 'src/app/math/point';
import { CONTROLS } from 'src/app/controls';
import { GameManager } from 'src/app/game_manager';
import { StartMenu } from 'src/app/start_menu';
import { GameModeManager } from 'src/app/game_mode_manager';
import { LevelCreator } from 'src/app/level_creator';
import { GameSettings } from 'src/app/game_settings';
import { LevelMenu } from 'src/app/level_menu';
import { DEFAULT_GAME_SETTINGS } from './game_settings';


const BACKGROUND_COLOR = '#959aa3';
const GRID_COLOR = '#1560e8';
const HOVERED_TILE_COLOR = '#f7c25e';

enum GameState {
  START_MENU,
  LEVEL_MENU,
  GAME,
  LEVEL_CREATOR,
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
  gameStateManager: GameModeManager;

  ngOnInit() {
    this.canvas = document.getElementById('canvas') as HTMLCanvasElement;
    this.canvas.setAttribute('height', `${RENDER_SETTINGS.canvasHeight}px`);
    this.canvas.setAttribute('width', `${RENDER_SETTINGS.canvasWidth}px`);
    this.context = this.canvas.getContext('2d')!;
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
      this.gameStateManager.update(elapsedMs);
      this.gameStateManager.render();
    }
    window.requestAnimationFrame((timestamp: number) => {
      this.gameLoop(timestamp);
    });
  }

  private initStartMenu(): void {
    this.gameState = GameState.START_MENU;
    this.gameStateManager = new StartMenu(
      this.canvas,
      this.context,
      {
        onPlayGame: () => {
          this.tearDownCurrentGameState();
          this.initLevelMenu();
        },
        onCreateLevel: () => {
          this.tearDownCurrentGameState();
          this.initLevelCreator();
        },
      });
  }

  private initGame(levelIndex: number, gameSettings: GameSettings): void {
    this.gameState = GameState.GAME;
    this.gameStateManager = new GameManager(
      this.canvas,
      this.context,
      {
        gameSettings,
        levelIndex,
        onExitGameCallback: () => {
          this.tearDownCurrentGameState();
          this.initStartMenu();
        },
      });
  }

  private initLevelMenu(): void {
    this.gameState = GameState.LEVEL_MENU;
    this.gameStateManager = new LevelMenu(this.canvas, this.context, {
      onSelectLevel: (levelIndex: number, gameSettings: GameSettings) => {
        this.initGame(levelIndex, gameSettings);
      },
    });
  }

  private initLevelCreator(): void {
    this.gameState = GameState.LEVEL_CREATOR;
    this.gameStateManager = new LevelCreator(
      this.canvas,
      this.context,
      () => {
        this.tearDownCurrentGameState();
        this.initStartMenu();
      });
  }

  private tearDownCurrentGameState(): void {
    this.gameStateManager.destroy();
  }
}

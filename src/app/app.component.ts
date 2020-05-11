import { Component } from '@angular/core';
import { RENDER_SETTINGS } from 'src/app/render_settings';
import { CONTROLS } from 'src/app/controls';
import { GameModeManager } from 'src/app/game_mode_manager';
import { GameManager } from 'src/app/game_manager';
import { LevelCreator } from 'src/app/level_creator';
import { GameSettings } from 'src/app/game_settings';
import { CAMPAIGN_LEVELS } from 'src/app/campaign_level';
import { FreePlayMenu } from 'src/app/menus/free_play_menu';
import { CampaignMenu } from 'src/app/menus/campaign_menu';
import { StartMenu } from 'src/app/menus/start_menu';


const BACKGROUND_COLOR = '#959aa3';
const GRID_COLOR = '#1560e8';
const HOVERED_TILE_COLOR = '#f7c25e';

enum GameState {
  START_MENU,
  FREE_PLAY_MENU,
  CAMPAIGN_MENU,
  GAME,
  LEVEL_CREATOR,
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: [],
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
        onFreePlay: () => {
          this.tearDownCurrentGameState();
          this.initFreePlayMenu();
        },
        onCampaign: () => {
          this.tearDownCurrentGameState();
          this.initCampaignMenu();
        },
        onCreateLevel: () => {
          this.tearDownCurrentGameState();
          this.initLevelCreator();
        },
      });
  }

  private initGame(levelIndex: number, gameSettings: GameSettings, onExitGameCallback: (winningTeamIndex: number) => void): void {
    this.gameState = GameState.GAME;
    this.gameStateManager = new GameManager(
      this.canvas,
      this.context,
      {
        gameSettings,
        levelIndex,
        onExitGameCallback,
      });
  }

  private initFreePlayMenu(): void {
    this.gameState = GameState.FREE_PLAY_MENU;
    this.gameStateManager = new FreePlayMenu(this.canvas, this.context, {
      onSelectLevel: this.onSelectFreePlayLevel,
      onBack: this.onBack,
    });
  }

  private initCampaignMenu(): void {
    this.gameState = GameState.CAMPAIGN_MENU;
    this.gameStateManager = new CampaignMenu(this.canvas, this.context, {
      onSelectLevel: this.onSelectCampaignLevel,
      onBack: this.onBack,
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

  private readonly onSelectFreePlayLevel = (levelIndex: number, gameSettings: GameSettings) => {
    this.initGame(levelIndex, gameSettings, (winningTeamIndex: number) => {
      this.tearDownCurrentGameState();
      this.initFreePlayMenu();
    });
  };

  private readonly onSelectCampaignLevel = (campaignLevelIndex: number, levelIndex: number, gameSettings: GameSettings) => {
    this.initGame(levelIndex, gameSettings, (winningTeamIndex: number) => {
      if (winningTeamIndex === 0) {
        if (campaignLevelIndex < CAMPAIGN_LEVELS.length + 1) {
          CAMPAIGN_LEVELS[campaignLevelIndex + 1].isUnlocked = true;
        }
      }
      this.tearDownCurrentGameState();
      this.initCampaignMenu();
    });
  };

  private readonly onBack = () => {
    this.tearDownCurrentGameState();
    this.initStartMenu();
  };
}

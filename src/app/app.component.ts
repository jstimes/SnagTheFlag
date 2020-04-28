import { Component } from '@angular/core';
import { RENDER_SETTINGS } from 'src/app/render_settings';
import { Grid } from 'src/app/grid';


const BACKGROUND_COLOR = '#959aa3';
const GRID_COLOR = '#1560e8';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {

  canvas: HTMLCanvasElement;
  lastRenderTime = 0;

  ngOnInit() {
    this.canvas = document.getElementById('canvas') as HTMLCanvasElement;
    this.canvas.setAttribute('height', `${RENDER_SETTINGS.canvasHeight}px`);
    this.canvas.setAttribute('width', `${RENDER_SETTINGS.canvasWidth}px`);
    this.resetGame();
  }

  gameLoop(timestamp: number): void {
    const elapsedMs = timestamp - this.lastRenderTime;
    if (elapsedMs > RENDER_SETTINGS.msBetweenRenders) {
      this.lastRenderTime = timestamp;
      this.update();
      this.render();
    }
    window.requestAnimationFrame((timestamp: number) => {
      this.gameLoop(timestamp);
    });
  }

  update(): void {

  }

  render(): void {
    const context = this.canvas.getContext('2d');
    context.fillStyle = BACKGROUND_COLOR;
    context.clearRect(0, 0, RENDER_SETTINGS.canvasWidth, RENDER_SETTINGS.canvasHeight);
    context.fillRect(0, 0, RENDER_SETTINGS.canvasWidth, RENDER_SETTINGS.canvasHeight);

    for (let i = 0; i < Grid.TILES_WIDE; i++) {
      const startX = i * Grid.TILE_SIZE;
      const endX = startX;
      const startY = 0;
      const endY = RENDER_SETTINGS.canvasHeight;

      context.beginPath();
      context.strokeStyle = GRID_COLOR;
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
      context.strokeStyle = GRID_COLOR;
      context.moveTo(startX, startY);
      context.lineTo(endX, endY);
      context.stroke();
    }
  }

  private resetGame(): void {
    window.requestAnimationFrame((timestamp: number) => {
      this.lastRenderTime = timestamp;
      this.gameLoop(timestamp);
    });
  }
}

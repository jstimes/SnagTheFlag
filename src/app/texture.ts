
export class Texture {
    readonly image: HTMLImageElement;
    isLoaded: boolean;

    constructor(src: string) {
        this.image = new Image();
        this.image.onload = () => {
            this.isLoaded = true;
        }
        this.image.src = src;
    }

    tryDrawing(params: {
        context: CanvasRenderingContext2D;
        sourceX: number;
        sourceY: number;
        sourceWidth: number;
        sourceHeight: number;
        canvasX: number;
        canvasY: number;
        canvasWidth: number;
        canvasHeight: number;
    }): void {
        if (!this.isLoaded) {
            return;
        }
        params.context.drawImage(
            this.image,
            params.sourceX,
            params.sourceY,
            params.sourceWidth,
            params.sourceHeight,
            params.canvasX,
            params.canvasY,
            params.canvasWidth,
            params.canvasHeight);
    }
}
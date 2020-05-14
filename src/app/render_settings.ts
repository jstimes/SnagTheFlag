export interface RenderSettings {
    readonly canvasHeight: number;
    readonly canvasWidth: number;
    /** Frames per second. */
    readonly frameRate: number;
    readonly msBetweenRenders: number;
}

function createDefaultRenderSettings(): RenderSettings {
    const canvasHeight = 800;
    const canvasWidth = 1040;
    const frameRate = 60;
    const msBetweenRenders = 1000 / frameRate;
    return {
        canvasHeight,
        canvasWidth,
        frameRate,
        msBetweenRenders,
    }
}

export const RENDER_SETTINGS = createDefaultRenderSettings();


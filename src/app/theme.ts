/** All values expected to be CSS color strings. */
export interface Theme {
    /* Gameplay/level creation colors. */
    readonly gridBackgroundColor: string;
    readonly gridLineColor: string;
    readonly hoveredTileColor: string;
    readonly textColor: string;

    /* UI colors. */
    readonly uiBackgroundColor;
    readonly buttonTextColor;
    readonly buttonBackgroundColor;
}

export const THEME: Theme = {
    gridBackgroundColor: '#959aa3',
    gridLineColor: '#1560e8',
    hoveredTileColor: '#f7c25e',
    textColor: '#117a01',

    uiBackgroundColor: '#959aa3',
    buttonTextColor: '#1560e8',
    buttonBackgroundColor: '#f7c25e',
};
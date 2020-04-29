/** All values expected to be CSS color strings. */
export interface Theme {
    /* Gameplay/level creation colors. */
    readonly gridBackgroundColor: string;
    readonly gridLineColor: string;
    readonly textColor: string;

    readonly obstacleColor: string;
    readonly flagPoleColor: string;
    readonly redFlagColor: string;
    readonly blueFlagColor: string;

    /* UI colors. */
    readonly uiBackgroundColor;
    readonly buttonTextColor;
    readonly buttonBackgroundColor;
}

export const THEME: Theme = {
    gridBackgroundColor: '#959aa3',
    gridLineColor: '#1560e8',
    textColor: '#117a01',

    obstacleColor: '#4c6e47',
    flagPoleColor: '#7a5f3e',
    redFlagColor: '#e34055',
    blueFlagColor: '#3d7cd4',

    uiBackgroundColor: '#959aa3',
    buttonTextColor: '#1560e8',
    buttonBackgroundColor: '#f7c25e',
};

const a_nice_yellow = '#f7c25e';
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

    /** Color for red squad members when they can move/take action. */
    readonly redCharacterReadyColor: string;
    /** Color for blue squad members when they can move/take action. */
    readonly blueCharacterReadyColor: string;
    /** Color for red squad members when their turn is done. */
    readonly redCharacterDoneColor: string;
    /** Color for blue squad members when their turn is done. */
    readonly blueCharacterDoneColor: string;

    readonly selectedCharacterOutlineColor: string;
    readonly availableForMovementColor: string;
    readonly emptyCellHoverColor: string;

    readonly bulletColor: string;
    readonly grenadeColor: string;
    readonly projectileTrailColor: string;
    readonly remainingHealthBarColor: string;
    readonly lostHealthBarColor: string;

    /* UI colors. */
    readonly uiBackgroundColor;
    readonly buttonTextColor;
    readonly buttonBackgroundColor;
}

export const THEME: Theme = {
    gridBackgroundColor: '#959aa3',
    gridLineColor: '#1560e8',
    textColor: '#614447',

    obstacleColor: '#4c6e47',
    flagPoleColor: '#7a5f3e',
    redFlagColor: '#e34055',
    blueFlagColor: '#3d7cd4',

    redCharacterReadyColor: '#e34055',
    blueCharacterReadyColor: '#3d7cd4',
    redCharacterDoneColor: '#b05662',
    blueCharacterDoneColor: '#547199',

    selectedCharacterOutlineColor: '#000000',
    availableForMovementColor: '#b8b6a5',
    emptyCellHoverColor: '#d9d7bf',

    bulletColor: '#fff86e',
    grenadeColor: '#176107',
    projectileTrailColor: '#e8e1d8',
    remainingHealthBarColor: '#00FF00',
    lostHealthBarColor: '#FF0000',

    uiBackgroundColor: '#959aa3',
    buttonTextColor: '#1560e8',
    buttonBackgroundColor: '#f7c25e',
};

const a_nice_yellow = '#f7c25e';
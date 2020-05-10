

interface CampaignLevel {
    readonly levelIndex: number;
    readonly levelName: string;
    readonly teamIndexToSquadSize: Map<number, number>;
    isUnlocked: boolean;
}

export const CAMPAIGN_LEVELS: CampaignLevel[] = [
    {
        levelIndex: 0,
        levelName: 'Starting grounds',
        teamIndexToSquadSize: new Map([[0, 4], [1, 4]]),
        isUnlocked: true,
    },
    {
        levelIndex: 1,
        levelName: 'Getting tougher',
        teamIndexToSquadSize: new Map([[0, 3], [1, 5]]),
        isUnlocked: false,
    },
    {
        levelIndex: 2,
        levelName: 'Snagged',
        teamIndexToSquadSize: new Map([[0, 4], [1, 8]]),
        isUnlocked: false,
    },
]
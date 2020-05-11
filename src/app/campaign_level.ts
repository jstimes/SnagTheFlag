import { AiDifficulty } from './game_settings';


interface CampaignLevel {
    readonly levelIndex: number;
    readonly levelName: string;
    readonly teamIndexToSquadSize: Map<number, number>;
    isUnlocked: boolean;
    readonly aiDifficulty: AiDifficulty;
}

export const CAMPAIGN_LEVELS: CampaignLevel[] = [
    {
        levelIndex: 3,
        levelName: 'Starting grounds',
        teamIndexToSquadSize: new Map([[0, 4], [1, 4]]),
        isUnlocked: true,
        aiDifficulty: AiDifficulty.WEAK,
    },
    {
        levelIndex: 1,
        levelName: 'Getting tougher',
        teamIndexToSquadSize: new Map([[0, 3], [1, 5]]),
        isUnlocked: false,
        aiDifficulty: AiDifficulty.WEAK,
    },
    {
        levelIndex: 2,
        levelName: 'Snag...',
        teamIndexToSquadSize: new Map([[0, 4], [1, 8]]),
        isUnlocked: false,
        aiDifficulty: AiDifficulty.WEAK,
    },
    {
        levelIndex: 2,
        levelName: 'Or be snagged...',
        teamIndexToSquadSize: new Map([[0, 4], [1, 8]]),
        isUnlocked: false,
        aiDifficulty: AiDifficulty.WEAK,
    },
]
import { Point } from 'src/app/math/point';

interface SerializedPoint {
    x: number;
    y: number;
}

export interface LevelData {
    redFlag: SerializedPoint;
    blueFlag: SerializedPoint;
    obstacles: SerializedPoint[];
}

export interface Level {
    name: string;
    data: LevelData;
}

const diagonal: Level = {
    name: 'Diagonal',
    data: {
        redFlag: { x: 0, y: 0 },
        blueFlag: { x: 19, y: 19 },
        obstacles: [
            { x: 16, y: 18 },
            { x: 16, y: 17 },
            { x: 16, y: 16 },
            { x: 17, y: 16 },
            { x: 18, y: 16 },
            { x: 1, y: 3 },
            { x: 2, y: 3 },
            { x: 3, y: 3 },
            { x: 3, y: 2 },
            { x: 3, y: 1 },
            { x: 0, y: 6 },
            { x: 1, y: 6 },
            { x: 2, y: 6 },
            { x: 3, y: 6 },
            { x: 6, y: 0 },
            { x: 6, y: 1 },
            { x: 6, y: 2 },
            { x: 6, y: 3 },
            { x: 6, y: 6 },
            { x: 6, y: 7 },
            { x: 6, y: 8 },
            { x: 6, y: 9 },
            { x: 7, y: 6 },
            { x: 8, y: 6 },
            { x: 9, y: 6 },
            { x: 13, y: 19 },
            { x: 13, y: 18 },
            { x: 13, y: 17 },
            { x: 13, y: 16 },
            { x: 19, y: 13 },
            { x: 18, y: 13 },
            { x: 17, y: 13 },
            { x: 16, y: 13 },
            { x: 13, y: 13 },
            { x: 13, y: 12 },
            { x: 13, y: 11 },
            { x: 13, y: 10 },
            { x: 12, y: 13 },
            { x: 11, y: 13 },
            { x: 10, y: 13 },
            { x: 10, y: 9 },
            { x: 10, y: 10 },
            { x: 9, y: 10 },
            { x: 9, y: 9 },
            { x: 13, y: 6 },
            { x: 13, y: 5 },
            { x: 13, y: 4 },
            { x: 14, y: 6 },
            { x: 15, y: 6 },
            { x: 6, y: 13 },
            { x: 6, y: 14 },
            { x: 6, y: 15 },
            { x: 5, y: 13 },
            { x: 4, y: 13 },
            { x: 3, y: 16 },
            { x: 2, y: 16 },
            { x: 2, y: 17 },
            { x: 3, y: 17 },
            { x: 16, y: 3 },
            { x: 16, y: 2 },
            { x: 17, y: 2 },
            { x: 17, y: 3 },
            { x: 3, y: 9 },
            { x: 3, y: 10 },
            { x: 9, y: 3 },
            { x: 10, y: 3 },
            { x: 10, y: 16 },
            { x: 9, y: 16 },
            { x: 16, y: 10 },
            { x: 16, y: 9 },
            { x: 17, y: 10 },
            { x: 10, y: 17 },
            { x: 2, y: 9 },
            { x: 9, y: 2 },
            { x: 6, y: 19 },
            { x: 6, y: 18 },
            { x: 1, y: 13 },
            { x: 0, y: 13 },
            { x: 13, y: 1 },
            { x: 13, y: 0 },
            { x: 18, y: 6 },
            { x: 19, y: 6 }]
    },
}

export const LEVELS: Level[] = [
    diagonal,
];
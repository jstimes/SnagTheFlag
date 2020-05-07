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

// TODO - custom game settings with level
export interface Level {
    name: string;
    data: LevelData;
}

const diagonal: Level = {
    name: 'Diagonal',
    data: {
        redFlag: { x: 0, y: 19 },
        blueFlag: { x: 19, y: 0 },
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

const horizontal: Level = {
    name: 'Horizontal',
    data: { "redFlag": { "x": 10, "y": 19 }, "blueFlag": { "x": 9, "y": 0 }, "obstacles": [{ "x": 2, "y": 17 }, { "x": 3, "y": 17 }, { "x": 5, "y": 17 }, { "x": 6, "y": 17 }, { "x": 7, "y": 17 }, { "x": 10, "y": 17 }, { "x": 13, "y": 17 }, { "x": 14, "y": 17 }, { "x": 17, "y": 17 }, { "x": 8, "y": 17 }, { "x": 9, "y": 17 }, { "x": 11, "y": 17 }, { "x": 12, "y": 17 }, { "x": 16, "y": 17 }, { "x": 17, "y": 2 }, { "x": 16, "y": 2 }, { "x": 14, "y": 2 }, { "x": 13, "y": 2 }, { "x": 12, "y": 2 }, { "x": 11, "y": 2 }, { "x": 10, "y": 2 }, { "x": 9, "y": 2 }, { "x": 8, "y": 2 }, { "x": 7, "y": 2 }, { "x": 6, "y": 2 }, { "x": 5, "y": 2 }, { "x": 3, "y": 2 }, { "x": 2, "y": 2 }, { "x": 3, "y": 5 }, { "x": 4, "y": 5 }, { "x": 5, "y": 5 }, { "x": 14, "y": 5 }, { "x": 15, "y": 5 }, { "x": 16, "y": 5 }, { "x": 14, "y": 15 }, { "x": 15, "y": 15 }, { "x": 16, "y": 15 }, { "x": 4, "y": 15 }, { "x": 5, "y": 15 }, { "x": 3, "y": 15 }, { "x": 6, "y": 15 }, { "x": 13, "y": 15 }, { "x": 13, "y": 5 }, { "x": 6, "y": 5 }, { "x": 1, "y": 9 }, { "x": 1, "y": 10 }, { "x": 0, "y": 9 }, { "x": 1, "y": 8 }, { "x": 19, "y": 9 }, { "x": 18, "y": 9 }, { "x": 18, "y": 8 }, { "x": 18, "y": 10 }, { "x": 2, "y": 8 }, { "x": 17, "y": 8 }, { "x": 18, "y": 11 }, { "x": 1, "y": 11 }, { "x": 4, "y": 11 }, { "x": 5, "y": 11 }, { "x": 6, "y": 11 }, { "x": 7, "y": 11 }, { "x": 8, "y": 11 }, { "x": 8, "y": 12 }, { "x": 11, "y": 12 }, { "x": 11, "y": 11 }, { "x": 12, "y": 11 }, { "x": 13, "y": 11 }, { "x": 15, "y": 11 }, { "x": 14, "y": 11 }, { "x": 9, "y": 9 }, { "x": 10, "y": 9 }, { "x": 11, "y": 9 }, { "x": 8, "y": 9 }, { "x": 9, "y": 15 }, { "x": 10, "y": 15 }, { "x": 9, "y": 5 }, { "x": 10, "y": 5 }, { "x": 8, "y": 7 }, { "x": 7, "y": 7 }, { "x": 6, "y": 7 }, { "x": 11, "y": 7 }, { "x": 12, "y": 7 }, { "x": 13, "y": 7 }] },
}

const paths: Level = {
    name: 'Paths',
    data: { "redFlag": { "x": 0, "y": 19 }, "blueFlag": { "x": 19, "y": 0 }, "obstacles": [{ "x": 17, "y": 1 }, { "x": 17, "y": 2 }, { "x": 18, "y": 2 }, { "x": 1, "y": 17 }, { "x": 2, "y": 17 }, { "x": 2, "y": 18 }, { "x": 1, "y": 16 }, { "x": 3, "y": 18 }, { "x": 16, "y": 1 }, { "x": 18, "y": 3 }, { "x": 16, "y": 5 }, { "x": 15, "y": 6 }, { "x": 14, "y": 7 }, { "x": 13, "y": 8 }, { "x": 14, "y": 3 }, { "x": 13, "y": 4 }, { "x": 12, "y": 5 }, { "x": 11, "y": 6 }, { "x": 10, "y": 7 }, { "x": 10, "y": 6 }, { "x": 11, "y": 5 }, { "x": 12, "y": 4 }, { "x": 13, "y": 3 }, { "x": 14, "y": 8 }, { "x": 15, "y": 7 }, { "x": 16, "y": 6 }, { "x": 13, "y": 9 }, { "x": 12, "y": 9 }, { "x": 3, "y": 14 }, { "x": 5, "y": 16 }, { "x": 6, "y": 16 }, { "x": 3, "y": 13 }, { "x": 4, "y": 13 }, { "x": 6, "y": 15 }, { "x": 7, "y": 15 }, { "x": 7, "y": 14 }, { "x": 4, "y": 12 }, { "x": 8, "y": 14 }, { "x": 8, "y": 13 }, { "x": 5, "y": 12 }, { "x": 5, "y": 11 }, { "x": 6, "y": 11 }, { "x": 6, "y": 10 }, { "x": 9, "y": 13 }, { "x": 9, "y": 12 }, { "x": 7, "y": 10 }, { "x": 9, "y": 10 }, { "x": 9, "y": 9 }, { "x": 10, "y": 9 }, { "x": 10, "y": 10 }, { "x": 16, "y": 9 }, { "x": 7, "y": 7 }, { "x": 7, "y": 6 }, { "x": 6, "y": 6 }, { "x": 6, "y": 5 }, { "x": 5, "y": 5 }, { "x": 12, "y": 12 }, { "x": 12, "y": 13 }, { "x": 13, "y": 13 }, { "x": 13, "y": 14 }, { "x": 14, "y": 14 }, { "x": 14, "y": 15 }, { "x": 15, "y": 15 }, { "x": 5, "y": 4 }, { "x": 4, "y": 4 }, { "x": 15, "y": 18 }, { "x": 16, "y": 18 }, { "x": 16, "y": 17 }, { "x": 17, "y": 17 }, { "x": 17, "y": 16 }, { "x": 18, "y": 16 }, { "x": 18, "y": 15 }, { "x": 2, "y": 2 }, { "x": 3, "y": 2 }, { "x": 3, "y": 1 }, { "x": 4, "y": 1 }, { "x": 2, "y": 3 }, { "x": 1, "y": 3 }, { "x": 1, "y": 4 }, { "x": 16, "y": 10 }, { "x": 17, "y": 11 }, { "x": 16, "y": 12 }, { "x": 16, "y": 13 }, { "x": 3, "y": 6 }, { "x": 3, "y": 7 }, { "x": 2, "y": 8 }, { "x": 3, "y": 9 }, { "x": 3, "y": 10 }, { "x": 18, "y": 9 }, { "x": 19, "y": 9 }, { "x": 19, "y": 8 }, { "x": 0, "y": 10 }, { "x": 1, "y": 10 }, { "x": 1, "y": 11 }, { "x": 8, "y": 4 }, { "x": 7, "y": 3 }, { "x": 10, "y": 3 }, { "x": 11, "y": 2 }, { "x": 12, "y": 1 }, { "x": 6, "y": 2 }, { "x": 11, "y": 15 }, { "x": 12, "y": 16 }, { "x": 13, "y": 17 }, { "x": 9, "y": 16 }, { "x": 8, "y": 17 }, { "x": 7, "y": 18 }, { "x": 9, "y": 0 }, { "x": 10, "y": 19 }] },
}

export const LEVELS: Level[] = [
    diagonal,
    horizontal,
    paths,
];
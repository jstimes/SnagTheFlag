import { Point } from './math/point';
import { ParticleSystemParams, ParticleShape } from './particle_system';
import { Grid } from './grid';

export function getBulletParticleSystemParams(startPositionCanvas: Point): ParticleSystemParams {
    return {
        startPositionCanvas,
        particleCount: 60,
        colorA: '#a83232',
        colorB: '#cc7606',
        shape: ParticleShape.LINE,
        minParticleSpeed: .003 * Grid.TILE_SIZE,
        maxParticleSpeed: .005 * Grid.TILE_SIZE,
        minLifetimeMs: 100,
        maxLifetimeMs: 200,
        minRadius: .035 * Grid.TILE_SIZE,
        maxRadius: .065 * Grid.TILE_SIZE,
    };
};

export function getGrenadeSmokeParticleSystemParams(startPositionCanvas: Point): ParticleSystemParams {
    return {
        startPositionCanvas,
        particleCount: 160,
        colorA: '#a1a1a1',
        colorB: '#403f3f',
        shape: ParticleShape.CIRCLE,
        minParticleSpeed: .0005 * Grid.TILE_SIZE,
        maxParticleSpeed: .001 * Grid.TILE_SIZE,
        minLifetimeMs: 800,
        maxLifetimeMs: 100,
        minRadius: .055 * Grid.TILE_SIZE,
        maxRadius: .085 * Grid.TILE_SIZE,
    };
};

export function getGrenadeBurstParticleSystemParams(startPositionCanvas: Point): ParticleSystemParams {
    return {
        startPositionCanvas,
        particleCount: 100,
        colorA: '#e3a14f',
        colorB: '#6e6151',
        shape: ParticleShape.ELLIPSE,
        minParticleSpeed: .0015 * Grid.TILE_SIZE,
        maxParticleSpeed: .0025 * Grid.TILE_SIZE,
        minLifetimeMs: 500,
        maxLifetimeMs: 600,
        minRadius: .035 * Grid.TILE_SIZE,
        maxRadius: .055 * Grid.TILE_SIZE,
    };
};

export function getHealParticleSystemParams(startPositionCanvas: Point): ParticleSystemParams {
    return {
        startPositionCanvas,
        particleCount: 12,
        colorA: '#1bd133',
        colorB: '#07ad1d',
        shape: ParticleShape.PLUS,
        minParticleSpeed: .001 * Grid.TILE_SIZE,
        maxParticleSpeed: .002 * Grid.TILE_SIZE,
        minLifetimeMs: 600,
        maxLifetimeMs: 800,
        minRadius: .07 * Grid.TILE_SIZE,
        maxRadius: .12 * Grid.TILE_SIZE,
    }
};
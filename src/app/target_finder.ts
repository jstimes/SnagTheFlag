import { ShotInfo } from 'src/app/shot_info';
import { Ray, LineSegment, detectRayLineSegmentCollision } from 'src/app/math/collision_detection';
import { Point, containsPoint } from 'src/app/math/point';
import { Character } from 'src/app/game_objects/character';
import { Obstacle } from 'src/app/game_objects/obstacle';
import { Target } from 'src/app/math/target';
import { Grid } from 'src/app/grid';

export function getRayForShot(shotInfo: ShotInfo): Ray {
    const ray = new Ray(
        shotInfo.fromCanvasCoords,
        new Point(
            Math.cos(shotInfo.aimAngleRadiansClockwise),
            Math.sin(shotInfo.aimAngleRadiansClockwise)));
    return ray;
}

export function getRayForShot2(
    fromCanvasCoords: Point, aimAngleRadiansClockwise: number): Ray {
    return new Ray(
        fromCanvasCoords,
        new Point(
            Math.cos(aimAngleRadiansClockwise),
            Math.sin(aimAngleRadiansClockwise)));
}

export function getProjectileTargetsPath(params: {
    ray: Ray;
    startingTileCoords: Point;
    fromTeamIndex: number;
    numRicochets: number;
    characters: Character[];
    obstacles: Obstacle[];
}): Target[] {
    const { ray,
        fromTeamIndex,
        startingTileCoords,
        numRicochets,
        characters,
        obstacles } = params;
    const targets: Target[] = [];
    let pathsLeft = numRicochets + 1;
    let currentTileCoords = startingTileCoords;
    let currentRay = ray;
    let hasHitCharacter = false;
    const isTargetEnemyCharacter = (target: Target) => {
        return characters
            .filter((character) => {
                return character.teamIndex !== params.fromTeamIndex;
            })
            .find((character) => {
                return character.tileCoords.equals(target.tile);
            }) != null;
    };

    while (pathsLeft > 0 && !hasHitCharacter) {
        const target = getProjectileTarget({
            ray: currentRay,
            startTile: currentTileCoords,
            fromTeamIndex,
            obstacles,
            characters,
        });
        targets.push(target);
        hasHitCharacter = isTargetEnemyCharacter(target);
        pathsLeft -= 1;
        const newDirection = currentRay.direction
            .reflect(target.normal!);
        currentRay = new Ray(target.canvasCoords, newDirection);
        currentTileCoords = target.tile;
        if (target.isTargetGridBorder) {
            hasHitCharacter = false;
            currentTileCoords =
                Grid.getTileFromCanvasCoords(
                    target.canvasCoords.add(
                        target.normal!.multiplyScaler(-Grid.TILE_SIZE / 2)));
        }
    }
    return targets;
}

export function getProjectileTarget(params: {
    ray: Ray;
    startTile: Point;
    obstacles: Obstacle[];
    characters: Character[];
    fromTeamIndex: number;
}): Target {
    const { ray, fromTeamIndex, startTile } = params;
    const gridBorderTarget: Target = getGridBorderTarget(ray);
    const tileTarget = getTileTarget({
        startTile,
        ray,
        obstacles: params.obstacles,
        characters: params.characters,
        maxDistance: ray.startPt.distanceTo(gridBorderTarget.canvasCoords),
        fromTeamIndex,
    });
    const target = tileTarget != null ? tileTarget : gridBorderTarget;
    return target;
}

function getGridBorderTarget(ray: Ray): Target {
    // Find which game border the ray intersects.
    const topLeftCanvas = new Point(0, 0);
    const topRightCanvas = topLeftCanvas.add(new Point(Grid.GAME_WIDTH, 0));
    const bottomLeftCanvas = topLeftCanvas.add(new Point(0, Grid.GAME_HEIGHT));
    const bottomRightCanvas = topRightCanvas.add(bottomLeftCanvas);
    const leftBorderSegment =
        new LineSegment(topLeftCanvas, bottomLeftCanvas, new Point(1, 0));
    const topBorderSegment =
        new LineSegment(topLeftCanvas, topRightCanvas, new Point(0, 1));
    const rightBorderSegment =
        new LineSegment(topRightCanvas, bottomRightCanvas, new Point(-1, 0));
    const bottomBorderSegment =
        new LineSegment(bottomLeftCanvas, bottomRightCanvas, new Point(0, -1));
    const borders = [
        leftBorderSegment,
        topBorderSegment,
        rightBorderSegment,
        bottomBorderSegment];
    let gridBorderCollisionPt: Point | null = null;
    let gridBorderCollisionTile: Point | null = null;
    let borderNormal: Point | null = null;
    for (const border of borders) {
        const collisionResult = detectRayLineSegmentCollision(ray, border);
        if (collisionResult.isCollision) {
            borderNormal = border.normal;
            // Move out from edge a little to accurately get tile.
            const offset = borderNormal.multiplyScaler(Grid.TILE_SIZE * .05);
            gridBorderCollisionPt = collisionResult.collisionPt!.add(offset);
            gridBorderCollisionTile =
                Grid.getTileFromCanvasCoords(gridBorderCollisionPt);
            break;
        }
    }
    if (gridBorderCollisionPt == null) {
        debugger;
        const a = detectRayLineSegmentCollision(ray, bottomBorderSegment);
        const b = detectRayLineSegmentCollision(ray, rightBorderSegment);

        throw new Error(`Shot ray does not intersect with any Grid`);
    }
    const hitCorner = (corner: Point): boolean => {
        return Math.abs(corner.x - gridBorderCollisionPt!.x) < Grid.TILE_SIZE * .1
            && Math.abs(corner.y - gridBorderCollisionPt!.y) < Grid.TILE_SIZE * .1;
    };
    // Ensure projectile stays in Grid bounds.
    const inset = Grid.TILE_SIZE * .05;
    if (hitCorner(topLeftCanvas)) {
        gridBorderCollisionPt =
            gridBorderCollisionPt.add(new Point(inset, inset));
    } else if (hitCorner(topRightCanvas)) {
        gridBorderCollisionPt =
            gridBorderCollisionPt.add(new Point(-inset, inset));
    } else if (hitCorner(bottomLeftCanvas)) {
        gridBorderCollisionPt =
            gridBorderCollisionPt.add(new Point(inset, -inset));
    } else if (hitCorner(bottomRightCanvas)) {
        gridBorderCollisionPt =
            gridBorderCollisionPt.add(new Point(-inset, -inset));
    }
    const target: Target = {
        normal: borderNormal!,
        ray,
        isTargetGridBorder: true,
        canvasCoords: gridBorderCollisionPt!,
        tile: gridBorderCollisionTile!,
        maxDistance: ray.startPt.distanceTo(gridBorderCollisionPt!),
    };
    return target;
}

/** Assumes only alive characters are passed in. */
function getTileTarget(
    params: {
        startTile: Point;
        ray: Ray;
        obstacles: Obstacle[];
        characters: Character[];
        maxDistance: number;
        fromTeamIndex: number;
    }): Target | null {

    const stepSize = 3 * Grid.TILE_SIZE / 4;
    let curDistance = stepSize;
    const currentTileString = params.startTile.toString();
    const checkedTilesStringSet: Set<string> = new Set([currentTileString]);
    let closestCollisionPt: Point | null = null;
    let closestCollisionTile: Point | null = null;
    let closestCollisionDistance = params.maxDistance;
    let closestTargetNormal: Point | null = null;
    const ray = params.ray;
    const potentialTargetLocations =
        params.obstacles
            .map((obstacle) => obstacle.tileCoords)
            .concat(params.characters.map((character) => character.tileCoords));
    while (curDistance < params.maxDistance) {
        const curTile = Grid.getTileFromCanvasCoords(
            params.ray.pointAtDistance(curDistance));
        const tilesToCheck =
            [curTile]
                .concat(Grid.getAdjacentTiles(curTile))
                .filter((tile: Point) => !checkedTilesStringSet.has(tile.toString()));

        for (const tile of tilesToCheck) {
            checkedTilesStringSet.add(tile.toString());
            if (!containsPoint(tile, potentialTargetLocations)) {
                continue;
            }
            // Either an obstacle or player in tile.
            const obstacle = params.obstacles
                .find((obstacle) => obstacle.tileCoords.equals(tile));
            if (obstacle) {
                // Omit edges on opposite side of obstacle.
                const edges = obstacle.getEdges()
                    .filter((edge) => edge.normal.dot(ray.direction) <= 0);
                for (const edge of edges) {
                    const collisionResult =
                        detectRayLineSegmentCollision(ray, edge);
                    if (collisionResult.isCollision) {
                        const distance =
                            ray.startPt
                                .distanceTo(collisionResult.collisionPt!);
                        if (distance < closestCollisionDistance) {
                            closestCollisionDistance = distance;
                            closestCollisionTile = tile;
                            closestCollisionPt = collisionResult.collisionPt!;
                            closestTargetNormal = edge.normal;
                        }
                    }
                }
            } else {
                const character = params.characters
                    .find((character) => character.tileCoords.equals(tile));
                if (!character) {
                    throw new Error(
                        `Tile is occupied but no obstacle or character...`);
                }
                if (character.teamIndex === params.fromTeamIndex) {
                    // TODO - allow friendly fire?
                    continue;
                }
                // Approximate with bounding box for now.
                for (const edge of character.getEdges()) {
                    const collisionResult =
                        detectRayLineSegmentCollision(ray, edge);
                    if (collisionResult.isCollision) {
                        const distance =
                            ray.startPt
                                .distanceTo(collisionResult.collisionPt!);
                        if (distance < closestCollisionDistance) {
                            closestCollisionDistance = distance;
                            closestCollisionTile = tile;
                            closestCollisionPt = collisionResult.collisionPt!;
                            closestTargetNormal = edge.normal;
                        }
                    }
                }
            }
        }
        if (closestCollisionPt != null) {
            break;
        }
        curDistance += stepSize;
    }
    if (closestCollisionTile != null) {
        const target: Target = {
            normal: closestTargetNormal!,
            isTargetGridBorder: false,
            ray,
            tile: closestCollisionTile!,
            canvasCoords: closestCollisionPt!,
            maxDistance: closestCollisionDistance,
        };
        return target;
    }
    return null;
}
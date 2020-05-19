import { Action, ActionType, EndCharacterTurnAction, ShootAction, SelectCharacterStateAction, SelectTileAction, AimAction, SelectCharacterClassAction, HealAction } from 'src/app/actions';
import { Point } from 'src/app/math/point';
import { GameState, GamePhase, SelectedCharacterState } from 'src/app/game_state';
import { Character } from 'src/app/game_objects/character';
import { Grid, pathTo } from 'src/app/grid';
import { getProjectileTarget, getRayForShot, getRayForShot2 } from 'src/app/target_finder';
import { Target } from './math/target';
import { CharacterSettings, ASSAULT_CHARACTER_SETTINGS, SCOUT_CHARACTER_SETTINGS, CharacterAbilityType, HealAbility } from './character_settings';
import { AiDifficulty } from './game_settings';
import { randomElement } from './math/random';
import { LOGGER, LogType } from 'src/app/logger';

interface AiSettings {
    /** If true, simply chooses any optimal tile instead of always the first. */
    readonly randomizeMovement: boolean;
    readonly maxAngleRandomization: number;

    // Just delete... ?
    readonly ignoresFogOfWar: boolean;
    readonly characterClass: CharacterSettings;
    readonly heals: boolean;
}

const WEAK_AI_SETTINGS: AiSettings = {
    randomizeMovement: false,
    maxAngleRandomization: Math.PI / 18,
    ignoresFogOfWar: false,
    characterClass: SCOUT_CHARACTER_SETTINGS,
    heals: false,
};

const MEDIUM_AI_SETTINGS: AiSettings = {
    randomizeMovement: true,
    maxAngleRandomization: Math.PI / 24,
    ignoresFogOfWar: false,
    characterClass: ASSAULT_CHARACTER_SETTINGS,
    heals: false,
};

const STRONG_AI_SETTINGS: AiSettings = {
    randomizeMovement: true,
    maxAngleRandomization: 0,
    ignoresFogOfWar: false,
    characterClass: ASSAULT_CHARACTER_SETTINGS,
    heals: false,
};

const difficultyToSettings: Map<AiDifficulty, AiSettings> = new Map([
    [AiDifficulty.WEAK, WEAK_AI_SETTINGS],
    [AiDifficulty.MEDIUM, MEDIUM_AI_SETTINGS],
    [AiDifficulty.STRONG, STRONG_AI_SETTINGS],
])

interface ShotDetails {
    readonly aimAngleClockwiseRadians: number;
    readonly target: Target;
}

type OnGetNextAction = (gameState: GameState) => Action;

enum Priority {
    /** Stays close to flag until detects enemy in direct sight. */
    DEFEND = 'DEFEND',
    /**
     *  Moves in general direction of enemy flag, but prioritizes enemy 
     * characters whenever spotted.
     */
    ELIMINATE = 'ELIMINATE',
    /** Goes for enemy flag, but also engages enemies along the way. */
    SNAG = 'SNAG',
}

const POST_ANIMATION_DELAY = 500;

export class Ai {

    readonly difficulty: AiDifficulty;
    readonly settings: AiSettings;
    readonly teamIndex: number;
    private actionQueue: OnGetNextAction[];
    private characterIndexToPriority: Map<number, Priority>;

    constructor({ teamIndex, difficulty }: { teamIndex: number; difficulty: AiDifficulty; }) {
        this.teamIndex = teamIndex;
        this.difficulty = difficulty;
        this.log(`AI created on ${difficulty} difficulty`);
        this.settings = difficultyToSettings.get(difficulty)!;
        this.actionQueue = [];
        this.characterIndexToPriority = new Map();
    }

    getNextAction(gameState: GameState): Action {
        if (this.actionQueue.length === 0) {
            this.actionQueue = this.getActionsForGameState(gameState);
        }
        const nextActionProducer = this.actionQueue.shift();
        if (nextActionProducer == null) {
            throw new Error(`AI couldn't get action to perform`);
        }
        const nextAction = nextActionProducer(gameState);
        if (gameState.selectedCharacter != null) {
            this.log(`selected character index - ` +
                `${gameState.selectedCharacter!.index}`);
        }
        this.log(`AI: Taking action: ${JSON.stringify(nextAction)}`);
        return nextAction;
    }

    private getActionsForGameState(gameState: GameState): OnGetNextAction[] {
        if (gameState.gamePhase === GamePhase.CHARACTER_PLACEMENT) {
            return this.placeCharacter(gameState);
        }
        if (gameState.selectedCharacter == null
            || gameState.selectedCharacterState == null) {
            throw new Error('Expected a selected character and state');
        }
        const selectedCharacter = gameState.selectedCharacter;
        if (!this.characterIndexToPriority.has(selectedCharacter.index)) {
            this.assignPriority(selectedCharacter.index, gameState);
        }
        const selectedCharacterState = gameState.selectedCharacterState;
        const isFlagCarrier =
            selectedCharacter.tileCoords
                .equals(gameState.getEnemyFlag().tileCoords);
        if (isFlagCarrier && !selectedCharacter.hasMoved) {
            return this.getActionsForFlagCarrrier(selectedCharacter, gameState);
        }
        if (!selectedCharacter.hasMoved && !selectedCharacter.hasShot) {
            return this.getHasntMovedNorShot(selectedCharacter, gameState);
        }
        if (!selectedCharacter.hasShot) {
            const characterCenter =
                getTileCenterCanvas(selectedCharacter.tileCoords);
            const possibleShots =
                this.getEnemyTargetsInDirectSight(characterCenter, gameState);
            if (possibleShots.length > 0) {
                return this.getShootSequence(
                    this.getBestShot(
                        selectedCharacter.tileCoords,
                        gameState,
                        possibleShots));
            }
        }

        const canHeal =
            this.settings.heals
            && selectedCharacter.health < selectedCharacter.settings.maxHealth
            && selectedCharacter.extraAbilities
                .find((ability) => {
                    return ability.abilityType === CharacterAbilityType.HEAL;
                })
            != null;
        if (canHeal) {
            const heal = (gameState: GameState) => {
                const healAction: HealAction = {
                    type: ActionType.HEAL,
                    healAmount: (
                        selectedCharacter.extraAbilities
                            .find((ability) => {
                                return ability.abilityType === CharacterAbilityType.HEAL;
                            }) as HealAbility).healAmount,
                }
                return healAction;
            };
            return [heal];
        }
        const endTurn = (gameState: GameState) => {
            const endTurnAction: EndCharacterTurnAction = {
                type: ActionType.END_CHARACTER_TURN,
            };
            return endTurnAction;
        };
        return [endTurn];
    }

    private placeCharacter(gameState: GameState): OnGetNextAction[] {
        const characterIndex = gameState.getActiveSquad().length;
        this.assignPriority(characterIndex, gameState);
        const priority = this.characterIndexToPriority.get(characterIndex)!;
        const selectCharacterClass = (gameState: GameState) => {
            const selectCharacterClassAction: SelectCharacterClassAction = {
                type: ActionType.SELECT_CHARACTER_CLASS,
                class: this.settings.characterClass,
            };
            return selectCharacterClassAction;
        };

        const thenSelectTile = (gameState: GameState) => {
            let tile = gameState.selectableTiles[0];
            let optimalTiles: Point[] = [];
            if (priority === Priority.DEFEND) {
                optimalTiles =
                    this.getClosestSelectableTileToLocationWithFewestDirectHits(
                        gameState.getActiveTeamFlag().tileCoords, gameState);
            } else {
                optimalTiles =
                    this.getClosestSelectableTileToLocationWithFewestDirectHits(
                        gameState.getEnemyFlag().tileCoords, gameState);
            }
            if (optimalTiles.length > 0) {
                let selection = optimalTiles[0];
                if (this.settings.randomizeMovement) {
                    selection = randomElement(optimalTiles);
                }
                const action: SelectTileAction = {
                    type: ActionType.SELECT_TILE,
                    tile: selection,
                };
                return action;
            }

            this.log("AI: No optimal tiles in placement");
            const selectTileAction: SelectTileAction = {
                type: ActionType.SELECT_TILE,
                tile: gameState.selectableTiles[0],
            };
            return selectTileAction;
        };
        return [selectCharacterClass, thenSelectTile];
    }

    private getHasntMovedNorShot(character: Character, gameState: GameState):
        OnGetNextAction[] {
        const currentCharacterCenterCanvas =
            getTileCenterCanvas(character.tileCoords);

        const priority = this.characterIndexToPriority.get(character.index)!;


        const possibleShots = this.getEnemyTargetsInDirectSight(
            currentCharacterCenterCanvas, gameState);
        if (possibleShots.length > 0) {
            const shoot = this.getShootSequence(
                this.getBestShot(
                    character.tileCoords, gameState, possibleShots));
            let characterMoveTargetTile: Point | null = null;
            if (priority === Priority.DEFEND) {
                characterMoveTargetTile =
                    gameState.getActiveTeamFlag().tileCoords;
            } else if (priority === Priority.ELIMINATE) {
                const enemies = this.getVisibleEnemies(gameState);
                if (enemies.length > 0) {
                    let best: Array<{ dist: number; tile: Point; hp: number }>
                        = [];
                    for (const enemy of enemies) {
                        const score = {
                            dist: enemy.tileCoords.
                                manhattanDistanceTo(character.tileCoords),
                            tile: enemy.tileCoords,
                            hp: enemy.health,
                        };
                        if (best.length === 0) {
                            best.push(score);
                        } else if (score.hp < best[0].hp || score.hp === best[0].hp && score.dist < best[0].dist) {
                            best = [score];
                        }
                        else if (score.hp === best[0].hp && score.dist === best[0].dist) {
                            best.push(score);
                        }
                    }
                    characterMoveTargetTile = best[0].tile;
                    if (this.settings.randomizeMovement) {
                        characterMoveTargetTile = randomElement(best).tile;
                    }
                }
                else {
                    characterMoveTargetTile = gameState.enemyHasFlag()
                        ? gameState.getActiveTeamFlag().tileCoords
                        : gameState.getEnemyFlag().tileCoords;
                }
            } else {
                characterMoveTargetTile = gameState.enemyHasFlag()
                    ? gameState.getActiveTeamFlag().tileCoords
                    : gameState.getEnemyFlag().tileCoords;
            }
            const safeMove =
                this.getSafeMoveTowardsLocation(
                    character, characterMoveTargetTile);
            return shoot.concat(safeMove);
        } else {
            const startMoving = (gameState: GameState) => {
                const startMovingAction: SelectCharacterStateAction = {
                    type: ActionType.SELECT_CHARACTER_STATE,
                    state: SelectedCharacterState.MOVING,
                };
                return startMovingAction;
            };
            const thenMove = (gameState: GameState) => {
                const selectedCharacter = gameState.selectedCharacter!;
                const characterIsFullyHealed =
                    selectedCharacter.health === selectedCharacter.settings.maxHealth;
                if (gameState.selectableTiles.length === 0) {
                    this.log(`AI: No selectable tiles when able to move`);
                    const endTurnAction: EndCharacterTurnAction = {
                        type: ActionType.END_CHARACTER_TURN,
                    };
                    return endTurnAction;
                }
                const tileAndDirectHits:
                    Array<{ tile: Point; directHits: number; }> = [];
                for (const selectableTile of gameState.selectableTiles) {
                    const tileCenterCanvas =
                        getTileCenterCanvas(selectableTile);
                    const directHitDetails =
                        this.getEnemyTargetsInDirectSight(
                            tileCenterCanvas, gameState);
                    tileAndDirectHits.push({
                        tile: selectableTile,
                        directHits: directHitDetails.length,
                    });
                }
                let optimalTiles: Point[] = [];
                const enemies = this.getVisibleEnemies(gameState);
                const bestTileAndHits = tileAndDirectHits
                    .filter((tileAndHit) => {
                        return tileAndHit.directHits === 1
                            || (tileAndHit.directHits === 2
                                && characterIsFullyHealed);
                    });
                if (bestTileAndHits.length > 0) {
                    optimalTiles = bestTileAndHits.map(obj => obj.tile);
                } else {
                    let targetTile: Point | null = null;
                    if (priority === Priority.DEFEND) {
                        if (gameState.getActiveTeamFlag().isAtStart()) {
                            const enemiesInSight =
                                enemies.filter((enemy) => {
                                    return (enemy.tileCoords
                                        .manhattanDistanceTo(
                                            selectedCharacter.tileCoords)
                                        <= selectedCharacter.settings.maxSight);
                                });
                            if (enemies.length === 0
                                || enemiesInSight.length === 0) {

                                // Get any tile within x tiles of own team 
                                // flag to 'patrol';
                                const x = 5;
                                optimalTiles =
                                    gameState.selectableTiles
                                        .filter((tile) => {
                                            return tile.manhattanDistanceTo(
                                                gameState
                                                    .getActiveTeamFlag()
                                                    .tileCoords)
                                                < x;
                                        });
                            } else {
                                let best: Array<{ hp: number; tile: Point }> = [];
                                for (const enemy of enemiesInSight) {
                                    const score = {
                                        hp: enemy.health,
                                        tile: enemy.tileCoords,
                                    };
                                    if (best.length === 0) {
                                        best.push(score);
                                    } else if (enemy.health < best[0].hp) {
                                        best = [score];
                                    }
                                    else if (enemy.health === best[0].hp) {
                                        best.push(score);
                                    }
                                }
                                targetTile = best[0].tile;
                                if (this.settings.randomizeMovement) {
                                    targetTile = randomElement(best).tile;
                                }
                            }
                        } else {
                            targetTile =
                                gameState.getActiveTeamFlag().tileCoords;
                        }
                    } else if (priority === Priority.ELIMINATE) {
                        if (enemies.length > 0) {
                            let best:
                                Array<{ dist: number; tile: Point; hp: number }>
                                = [];
                            for (const enemy of enemies) {
                                const score = {
                                    dist: enemy.tileCoords.
                                        manhattanDistanceTo(
                                            character.tileCoords),
                                    tile: enemy.tileCoords,
                                    hp: enemy.health,
                                };
                                if (best.length === 0) {
                                    best.push(score);
                                } else if (score.hp < best[0].hp
                                    || score.hp === best[0].hp
                                    && score.dist < best[0].dist) {
                                    best = [score];
                                }
                                else if (score.hp === best[0].hp
                                    && score.dist === best[0].dist) {
                                    best.push(score);
                                }
                            }
                            const possibleTiles = best.map((b) => b.tile);
                            targetTile = possibleTiles[0];
                            if (this.settings.randomizeMovement) {
                                targetTile = randomElement(possibleTiles);
                            }
                        }
                        else {
                            targetTile = gameState.enemyHasFlag()
                                ? gameState.getActiveTeamFlag().tileCoords
                                : gameState.getEnemyFlag().tileCoords;
                        }
                    } else {
                        targetTile = gameState.enemyHasFlag()
                            ? gameState.getActiveTeamFlag().tileCoords
                            : gameState.getEnemyFlag().tileCoords;
                    }
                    if (targetTile != null) {
                        optimalTiles =
                            this.getClosestSelectableTileToLocationWithFewestDirectHits(
                                targetTile, gameState);
                    }
                }

                let selection = optimalTiles[0];
                if (this.settings.randomizeMovement) {
                    selection = randomElement(optimalTiles);
                }
                if (selection == null) {
                    const endTurnAction: EndCharacterTurnAction = {
                        type: ActionType.END_CHARACTER_TURN,
                    };
                    return endTurnAction;
                }
                const selectTileAction: SelectTileAction = {
                    type: ActionType.SELECT_TILE,
                    tile: selection,
                };
                return selectTileAction;
            };
            return [startMoving, thenMove];
        }
    }

    private getActionsForFlagCarrrier(
        character: Character, gameState: GameState): OnGetNextAction[] {
        // TODO - need to differentiate flag starting spot and flag current spot.
        const teamFlagTile = gameState.getActiveTeamFlag().tileCoords;
        return this.getSafeMoveTowardsLocation(character, teamFlagTile);
    }

    private getSafeMoveTowardsLocation(
        character: Character, tileLocation: Point): OnGetNextAction[] {
        const startMoving = (gameState: GameState) => {
            const startMovingAction: SelectCharacterStateAction = {
                type: ActionType.SELECT_CHARACTER_STATE,
                state: SelectedCharacterState.MOVING,
            };
            return startMovingAction;
        };
        const thenMove = (gameState: GameState) => {
            const bestTiles =
                this.getClosestSelectableTileToLocationWithFewestDirectHits(
                    tileLocation, gameState);
            let selection = bestTiles[0];
            if (this.settings.randomizeMovement) {
                selection = randomElement(bestTiles);
            }
            if (selection == null) {
                const endTurnAction: EndCharacterTurnAction = {
                    type: ActionType.END_CHARACTER_TURN,
                };
                return endTurnAction;
            }
            const selectTileAction: SelectTileAction = {
                type: ActionType.SELECT_TILE,
                tile: selection,
            };
            return selectTileAction;
        };
        return [startMoving, thenMove];
    }

    private getClosestSelectableTileToLocationWithFewestDirectHits(
        tileLocation: Point, gameState: GameState): Point[] {
        let bestTile = {
            tile: gameState.selectableTiles[0],
            distance: 10000,
            directHits: 100,
        };
        let optimalTiles: Point[] = [];
        for (const selectableTile of gameState.selectableTiles) {
            const pathToLocation =
                getPathToLocation(selectableTile, tileLocation, gameState);
            const tileCenterCanvas = getTileCenterCanvas(selectableTile)
            const directHits = this.getEnemyTargetsInDirectSight(
                tileCenterCanvas, gameState).length;
            if (directHits < bestTile.directHits
                || (directHits === bestTile.directHits
                    && pathToLocation.length < bestTile.distance)) {
                bestTile.tile = selectableTile;
                bestTile.distance = pathToLocation.length;
                bestTile.directHits = directHits;
                optimalTiles = [bestTile.tile];
            } else if (directHits === bestTile.directHits
                && pathToLocation.length === bestTile.distance) {
                optimalTiles.push(selectableTile);
            }
        }
        return optimalTiles;
    }

    private getBestShot(
        fromTile: Point, gameState: GameState, shots: ShotDetails[]):
        ShotDetails {
        // Best is flag carrier. 
        for (const shot of shots) {
            if (shot.target.tile.equals(gameState.getActiveTeamFlag().tileCoords)) {
                return shot;
            }
        }

        // Then pick weakest, tie break by distance.
        const enemyCharacters = gameState.getEnemyCharacters();
        let best: { shot: ShotDetails, targetHealth: number, distance: number } | null = null;
        for (const shot of shots) {
            const targetCharacter = enemyCharacters
                .find((character) => character.tileCoords.equals(shot.target.tile));
            if (targetCharacter == null) {
                throw new Error(
                    `Expected a character at shot: ${JSON.stringify(shot)}`);
            }
            const targetHealth = targetCharacter.health;
            const distance =
                targetCharacter.tileCoords.manhattanDistanceTo(fromTile);
            if ((best == null)
                || (targetHealth < best.targetHealth)
                || (targetHealth === best.targetHealth
                    && distance < best.distance)) {
                best = { shot, distance, targetHealth };
            }
        }
        if (best == null) {
            throw new Error(`Expected to find best shot in getBestShot`);
        }
        return best.shot;
    }

    private getShootSequence(shotDetails: ShotDetails): OnGetNextAction[] {
        const startAiming = (gameState: GameState) => {
            const startAimingAction: SelectCharacterStateAction = {
                type: ActionType.SELECT_CHARACTER_STATE,
                state: SelectedCharacterState.AIMING,
            };
            return startAimingAction;
        };
        const thenAim = (gameState: GameState) => {
            const randomAimAdjustment =
                Math.random()
                * this.settings.maxAngleRandomization
                * - this.settings.maxAngleRandomization / 2;
            const aim =
                shotDetails.aimAngleClockwiseRadians + randomAimAdjustment;
            const takeAimAction: AimAction = {
                type: ActionType.AIM,
                aimAngleClockwiseRadians: aim,
            };
            return takeAimAction;
        };
        const thenShoot = (gameState: GameState) => {
            const shootAction: ShootAction = {
                type: ActionType.SHOOT,
            };
            return shootAction;
        };
        return [
            startAiming,
            thenAim,
            thenShoot,
        ];
    }

    private getEnemyTargetsInDirectSight(
        fromCanvas: Point, gameState: GameState): ShotDetails[] {
        const fromTile = Grid.getTileFromCanvasCoords(fromCanvas);
        const shots: ShotDetails[] = [];
        const visibleEnemies = this.getVisibleEnemies(gameState);
        for (const enemy of visibleEnemies) {
            const enemyCenter = getTileCenterCanvas(enemy.tileCoords);
            const direction = enemyCenter.subtract(fromCanvas).normalize();
            const aimAngleClockwiseRadians =
                direction.getPointRotationRadians();
            const target = getProjectileTarget({
                ray: getRayForShot2(fromCanvas, aimAngleClockwiseRadians),
                characters: gameState.getAliveCharacters(),
                obstacles: gameState.obstacles,
                fromTeamIndex: this.teamIndex,
                startTile: fromTile,
            });
            if (target.tile.equals(enemy.tileCoords)) {
                shots.push({
                    aimAngleClockwiseRadians,
                    target,
                });
            }
        }
        return shots;
    }

    private getVisibleEnemies(gameState: GameState): Character[] {
        return gameState.getEnemyCharacters().filter((enemy) => {
            if (this.settings.ignoresFogOfWar) {
                return true;
            }
            return gameState.isTileVisibleByTeamIndex(
                enemy.tileCoords, this.teamIndex);
        });
    }

    private assignPriority(characterIndex: number, gameState: GameState): void {
        const priority = this.getNextPriority(gameState);
        this.log(`AI: Assigning priority: ${priority}`);
        this.characterIndexToPriority.set(
            characterIndex,
            priority);
    }

    private getNextPriority(gameState: GameState): Priority {
        const startingTeamSize =
            gameState.settings
                .teamIndexToSquadSize
                .get(this.teamIndex)!;
        const desiredDefenders = (1 / 4) * startingTeamSize;
        const desiredSnaggers = (1 / 2) * startingTeamSize;
        const desiredEliminators = (1 / 4) * startingTeamSize;
        const defenders = gameState.getActiveSquad()
            .filter((character) => {
                const priority = this.characterIndexToPriority.get(character.index);
                return priority != null && priority === Priority.DEFEND;
            }).length;
        if (defenders < desiredDefenders) {
            return Priority.DEFEND;
        }
        const snaggers = gameState.getActiveSquad()
            .filter((character) => {
                const priority = this.characterIndexToPriority.get(character.index);
                return priority != null && priority === Priority.SNAG;
            }).length;
        if (snaggers < desiredSnaggers) {
            return Priority.SNAG;
        }
        return Priority.ELIMINATE;
    }

    private log(message: string) {
        LOGGER.log(LogType.AI, message);
    }
}

function getTileCenterCanvas(tile: Point): Point {
    return Grid.getCanvasFromTileCoords(tile).add(Grid.HALF_TILE)
}

function getTileClosestTo(tiles: Point[], to: Point): Point {
    let closestDistance = 10000;
    let closestTile = tiles[0];
    for (const tile of tiles) {
        const distance = tile.manhattanDistanceTo(to)
        if (distance < closestDistance) {
            closestDistance = distance;
            closestTile = tile;
        }
    }
    return closestTile;
}

function getPathToLocation(
    startTile: Point, tileLocation: Point, gameState: GameState): Point[] {
    return gameState.getPath({
        from: startTile,
        to: tileLocation,
    });
}
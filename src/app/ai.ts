import { Action, MoveCharacterAction, ActionType, EndCharacterTurnAction, ShootAction, SelectCharacterStateAction } from 'src/app/actions';
import { Point } from 'src/app/math/point';
import { GameState, GamePhase, SelectedCharacterState } from 'src/app/game_state';
import { Character } from 'src/app/character';
import { Grid } from 'src/app/grid';
import { getProjectileTarget, getRayForShot } from 'src/app/target_finder';

interface Delegate {
    getGameState: () => GameState;
    onAction: (action: Action) => void;
    isAnimating: () => boolean;
}

const POST_ANIMATION_DELAY = 500;

export class Ai {

    isBlue: boolean;
    constructor({ isBlue }: { isBlue: boolean; }) {
        this.isBlue = isBlue;
    }

    async onNextTurn(delegate: Delegate) {
        let gameState = delegate.getGameState();
        if (gameState.gamePhase === GamePhase.CHARACTER_PLACEMENT) {
            // TODO
            return;
        }
        const checkTurnAndTakeAction = () => {
            gameState = delegate.getGameState();
            if (gameState.isBlueTurn !== this.isBlue) {
                return;
            }
            if (delegate.isAnimating()) {
                setTimeout(() => {
                    checkTurnAndTakeAction();
                }, POST_ANIMATION_DELAY);
                return;
            }
            const action = this.getActionForGameState(gameState, delegate);
            delegate.onAction(action);
            checkTurnAndTakeAction();
        };
        checkTurnAndTakeAction();
    }

    private getActionForGameState(gameState: GameState, delegate: Delegate): Action {
        if (gameState.selectedCharacter == null || gameState.selectedCharacterState == null) {
            throw new Error('Expected a selected character and state');
        }
        const selectedCharacter = gameState.selectedCharacter;
        const selectedCharacterState = gameState.selectedCharacterState;
        if (!selectedCharacter.hasMoved) {
            if (selectedCharacterState !== SelectedCharacterState.MOVING) {
                const action: SelectCharacterStateAction = {
                    type: ActionType.SELECT_CHARACTER_STATE,
                    state: SelectedCharacterState.MOVING,
                };
                return action;
            }
            const goToFlag = getTileClosestTo(gameState.selectableTiles, this.getEnemyFlagCoords(gameState));
            const moveAction: MoveCharacterAction = {
                type: ActionType.MOVE_CHARACTER,
                tileCoords: goToFlag,
            };
            return moveAction;
        }
        if (!selectedCharacter.hasShot) {
            if (selectedCharacterState !== SelectedCharacterState.AIMING) {
                const action: SelectCharacterStateAction = {
                    type: ActionType.SELECT_CHARACTER_STATE,
                    state: SelectedCharacterState.AIMING,
                };
                return action;
            }

            const characterCenter = getCharacterCanvasCenter(selectedCharacter);
            for (const enemy of this.getEnemyCharacters(gameState)) {
                const enemyCenter = getCharacterCanvasCenter(enemy);
                const direction = enemyCenter.subtract(characterCenter).normalize();
                selectedCharacter.setAim(direction.getPointRotationRadians());
                const target = getProjectileTarget({
                    ray: getRayForShot(selectedCharacter.getCurrentShotInfo()[0]),
                    characters: gameState.blueSquad.concat(gameState.redSquad),
                    obstacles: gameState.obstacles,
                    isShotFromBlueTeam: this.isBlue,
                    startTile: selectedCharacter.tileCoords,
                });
                if (target.tile.equals(enemy.tileCoords)) {
                    const shootAction: ShootAction = {
                        type: ActionType.SHOOT,
                    };
                    return shootAction;
                }
            }
        }
        const endTurnAction: EndCharacterTurnAction = {
            type: ActionType.END_CHARACTER_TURN,
        }
        return endTurnAction;
    }

    private getEnemyFlagCoords(gameState: GameState): Point {
        const flag = this.isBlue ? gameState.redFlag : gameState.blueFlag;
        return flag.tileCoords;
    }

    private getEnemyCharacters(gameState: GameState): Character[] {
        return this.isBlue ? gameState.redSquad : gameState.blueSquad;
    }
}

function getCharacterCanvasCenter(character: Character): Point {
    return Grid.getCanvasFromTileCoords(character.tileCoords).add(Grid.HALF_TILE)
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
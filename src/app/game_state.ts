import { Point } from 'src/app/math/point';
import { Flag } from 'src/app/game_objects/flag';
import { Obstacle } from 'src/app/game_objects/obstacle';
import { Character } from 'src/app/game_objects/character';
import { pathTo, Grid } from 'src/app/grid';
import { GameSettings } from './game_settings';
import { Spawner } from './game_objects/spawner';

export enum GamePhase {
    // Setup.
    CHARACTER_PLACEMENT,
    // Main game.
    COMBAT,
}

export enum SelectedCharacterState {
    AWAITING = 'AWAITING',
    MOVING = 'MOVING',
    AIMING = 'AIMING',
    THROWING_GRENADE = 'THROWING_GRENADE',
}


const DEFAULT_FLAG_VISIBILITY = 2;

export class GameState {
    readonly settings: GameSettings;
    gamePhase: GamePhase;
    obstacles: Obstacle[];
    characters: Character[];
    spawners: Spawner[];
    flags: Flag[];
    currentTeamIndex: number;
    selectableTiles: Point[];
    selectedCharacter?: Character;
    selectedCharacterState?: SelectedCharacterState;

    constructor(settings: GameSettings) {
        this.gamePhase = GamePhase.CHARACTER_PLACEMENT;
        this.settings = settings;
        this.obstacles = [];
        this.characters = [];
        this.flags = [];
        this.currentTeamIndex = 0;
        this.selectableTiles = [];
    }

    isFogOfWarOn(): boolean {
        return this.settings.hasFogOfWar != null
            && this.settings.hasFogOfWar === true;
    }

    isTileVisibleByTeamIndex(tile: Point, teamIndex: number): boolean {
        for (const character of this.getCharactersForTeamIndex(teamIndex)) {
            if (character.getCurrentTile().manhattanDistanceTo(tile)
                <= character.settings.maxSight) {
                return true;
            }
        }
        const distToTeamFlag =
            this.getFlagForTeamIndex(teamIndex).getCurrentTile()
                .manhattanDistanceTo(tile);
        if (distToTeamFlag <= DEFAULT_FLAG_VISIBILITY) {
            return true;
        }
        return false;
    }

    getTilesVisibleByTeamIndex(teamIndex: number): Point[] {
        const visibleTiles: Point[] = [];
        for (let x = 0; x < Grid.TILES_WIDE; x++) {
            for (let y = 0; y < Grid.TILES_TALL; y++) {
                const tile = new Point(x, y);
                if (this.isTileVisibleByTeamIndex(tile, teamIndex)) {
                    visibleTiles.push(tile);
                }
            }
        }
        return visibleTiles;
    }

    getFirstCharacterIndex(): number {
        const squad = this.getActiveSquad().filter((character) => !character.isTurnOver());
        if (squad.length === 0) {
            throw new Error(`No more characters alive - should be game over?`);
        }
        return squad[0].index;
    }

    getGameInfo(): { characters: Character[]; obstacles: Obstacle[] } {
        return {
            characters: this.getAliveCharacters(),
            obstacles: this.obstacles,
        }
    }

    getAliveCharacters(): Character[] {
        return this.characters.filter((character) => character.isAlive());
    }

    getActiveTeamName(): string {
        switch (this.currentTeamIndex) {
            case 0:
                return 'Blue';
            case 1:
                return 'Red';
            default:
                throw new Error(`Unsupported number of teams: ${this.currentTeamIndex}`);
        }
    }

    getEnemyTeamName(): string {
        switch (this.currentTeamIndex) {
            case 1:
                return 'Blue';
            case 0:
                return 'Red';
            default:
                throw new Error(`Unsupported number of teams: ${this.currentTeamIndex}`);
        }
    }

    getActiveSquad(): Character[] {
        return this.getAliveCharacters().filter((character) => character.teamIndex === this.currentTeamIndex)
    }

    getEnemyCharacters(): Character[] {
        return this.getAliveCharacters().filter((character) => character.teamIndex !== this.currentTeamIndex);
    }

    getActiveTeamFlag(): Flag {
        return this.flags.find((flag) => flag.teamIndex === this.currentTeamIndex)!;
    }

    getEnemyFlag(): Flag {
        return this.flags.find((flag) => flag.teamIndex !== this.currentTeamIndex)!;
    }

    tileHasObstacle(tile: Point): boolean {
        return this.obstacles.find((obstacle) => obstacle.tileCoords.equals(tile)) != null;
    }

    enemyHasFlag(): boolean {
        const teamFlagCoords = this.getActiveTeamFlag().tileCoords;
        return this.getEnemyCharacters().find((character) => character.tileCoords.equals(teamFlagCoords)) != null;
    }


    teamHasFlag(): boolean {
        const enemyFlagCoords = this.getEnemyFlag().tileCoords;
        return this.getActiveSquad().find((character) => character.tileCoords.equals(enemyFlagCoords)) != null;
    }

    getPath({ from, to }: { from: Point; to: Point }): Point[] {
        const isObstacleFree = (tile: Point): boolean => {
            return !this.tileHasObstacle(tile);
        };
        return pathTo({
            startTile: from,
            endTile: to,
            isAvailable: isObstacleFree,
            canGoThrough: isObstacleFree,
        });
    }

    isSquadMemberAtTile(tile: Point): boolean {
        const squad = this.getActiveSquad();
        return squad.find((squadMember: Character) => {
            return squadMember.isAlive()
                && squadMember.tileCoords.equals(tile)
                && squadMember !== this.selectedCharacter;
        }) != null;
    }

    getCharactersForTeamIndex(teamIndex: number): Character[] {
        return this.getAliveCharacters().filter((character) => {
            return character.teamIndex === teamIndex;
        });
    }

    getFlagForTeamIndex(teamIndex: number): Flag {
        return this.flags[teamIndex];
    }
}
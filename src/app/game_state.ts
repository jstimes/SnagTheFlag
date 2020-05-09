import { Point } from 'src/app/math/point';
import { Flag } from 'src/app/flag';
import { Obstacle } from 'src/app/obstacle';
import { Character } from 'src/app/character';
import { pathTo } from './grid';

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

export class GameState {
    gamePhase: GamePhase;
    obstacles: Obstacle[];
    characters: Character[];
    flags: Flag[];
    currentTeamIndex: number;
    selectableTiles: Point[];
    selectedCharacter?: Character;
    selectedCharacterState?: SelectedCharacterState;

    constructor() {
        this.gamePhase = GamePhase.CHARACTER_PLACEMENT;
        this.obstacles = [];
        this.characters = [];
        this.flags = [];
        this.currentTeamIndex = 0;
        this.selectableTiles = [];
    }

    getFirstCharacterIndex(): number {
        const squad = this.getActiveSquad();
        for (let index = 0; index < squad.length; index++) {
            if (squad[index].isAlive()) {
                return index;
            }
        }
        throw new Error(`No more characters alive - should be game over?`);
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
        return this.flags.filter((flag) => flag.teamIndex !== this.currentTeamIndex)[0];
    }

    tileHasObstacle(tile: Point): boolean {
        return this.obstacles.find((obstacle) => obstacle.tileCoords.equals(tile)) != null;
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
}
import { RENDER_SETTINGS } from 'src/app/render_settings';
import { Grid, bfs, pathTo } from 'src/app/grid';
import { Point, pointFromSerialized, containsPoint } from 'src/app/math/point';
import { Obstacle } from 'src/app/obstacle';
import { MatchType } from 'src/app/match_type';
import { CONTROLS, ControlMap, EventType, Key, numberToKey, numberToOrdinal } from 'src/app/controls';
import { THEME } from 'src/app/theme';
import { Flag } from 'src/app/flag';
import { LEVELS } from 'src/app/level';
import { GameSettings, DEFAULT_GAME_SETTINGS } from 'src/app/game_settings';
import { Character } from 'src/app/character';
import { Hud, TextType, Duration } from 'src/app/hud';
import { Ray, LineSegment, detectRayLineSegmentCollision } from 'src/app/math/collision_detection';
import { Projectile } from 'src/app/projectile';
import { ParticleSystem, ParticleShape, ParticleSystemParams } from 'src/app/particle_system';
import { ShotInfo, ProjectileDetailsType, Bullet, ProjectileDetails } from 'src/app/shot_info';
import { Action, ActionType, throwBadAction, HealAction, PlaceCharacterAction, MoveCharacterAction, EndCharacterTurnAction, ShootAction, ThrowGrenadeAction, SelectCharacterStateAction, AimAction } from 'src/app/actions';
import { CharacterSettings, HealAbility, ASSAULT_CHARACTER_SETTINGS, ClassType, CHARACTER_CLASSES } from 'src/app/character_settings';
import { Ai } from 'src/app/ai';
import { GamePhase, SelectedCharacterState, GameState } from 'src/app/game_state';
import { GameModeManager } from 'src/app/game_mode_manager';
import { getRayForShot, getProjectileTargetsPath } from 'src/app/target_finder';
import { Target } from 'src/app/math/target';
import { AnimationState } from 'src/app/animation_state';


const MOVE_KEY = Key.M;
/** Used to start and cancel shooting, but doesn't fire the shot.  */
const TOGGLE_AIM_KEY = Key.A;
const AIM_COUNTERCLOCKWISE_KEY = Key.S;
const AIM_CLOCKWISE_KEY = Key.D;
const SHOOT_KEY = Key.F;
const HEAL_KEY = Key.H;
const TOGGLE_THROW_GRENADE_KEY = Key.T;
const END_TURN_KEY = Key.E;
const keysToCharacterClassType: Map<Key, ClassType> = new Map([
    [Key.J, ClassType.SCOUT],
    [Key.K, ClassType.ASSAULT],
    [Key.L, ClassType.SNIPER],
    [Key.I, ClassType.DEMOLITION],
]);

const getBulletParticleSystemParams = (startPositionCanvas: Point): ParticleSystemParams => {
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
    };
};

const getGrenadeParticleSystemParams = (startPositionCanvas: Point): ParticleSystemParams => {
    return {
        startPositionCanvas,
        particleCount: 120,
        colorA: '#a83232',
        colorB: '#cc7606',
        shape: ParticleShape.LINE,
        minParticleSpeed: .002 * Grid.TILE_SIZE,
        maxParticleSpeed: .004 * Grid.TILE_SIZE,
        minLifetimeMs: 300,
        maxLifetimeMs: 400,
    };
};

export class GameManager implements GameModeManager {

    private readonly canvas: HTMLCanvasElement;
    private readonly context: CanvasRenderingContext2D;
    private readonly levelIndex: number;
    private readonly matchType: MatchType;
    private readonly onExitGameCallback: () => void;

    private gameSettings: GameSettings;
    private obstacles: Obstacle[];
    private redFlag: Flag;
    private blueFlag: Flag;
    private hud: Hud;

    private blueSquad: Character[];
    private redSquad: Character[];
    private gamePhase: GamePhase;
    private isBlueTurn: boolean;

    private controlMap: ControlMap;
    private selectableTiles: Point[];
    private selectedCharacter?: Character;
    private selectedCharacterState?: SelectedCharacterState;
    private selectedCharacterSettings: CharacterSettings = ASSAULT_CHARACTER_SETTINGS;

    private projectiles: Projectile[];
    private particleSystems: ParticleSystem[];

    private ai: Ai;

    constructor(
        canvas: HTMLCanvasElement,
        context: CanvasRenderingContext2D,
        params: {
            matchType: MatchType;
            levelIndex: number;
            onExitGameCallback: () => void;
        }) {

        this.canvas = canvas;
        this.context = context;
        this.matchType = params.matchType;
        this.levelIndex = params.levelIndex;
        this.onExitGameCallback = params.onExitGameCallback;
        this.resetGame();
    }

    getGameInfo(): { characters: Character[]; obstacles: Obstacle[] } {
        return {
            characters: this.redSquad.concat(this.blueSquad).filter((character) => character.isAlive()),
            obstacles: this.obstacles,
        }
    }

    isAnimating(): boolean {
        const animatables: { animationState: AnimationState }[] = [
            ...this.blueSquad,
            ...this.redSquad,
            ...this.projectiles];
        return animatables.some((animatable) => animatable.animationState.isAnimating);
    }

    update(elapsedMs: number): void {
        for (const particleSystem of this.particleSystems) {
            particleSystem.update(elapsedMs);
        }
        this.particleSystems = this.particleSystems
            .filter((particleSystem) => particleSystem.isAlive);

        let hasFiringProjectiles = false;
        for (const projectile of this.projectiles) {
            this.updateProjectile(elapsedMs, projectile);
            if (!projectile.isDead) {
                hasFiringProjectiles = true;
            }
        }
        this.projectiles = this.projectiles
            .filter((projectile) => !projectile.isDead || !projectile.isTrailGone());
        if (hasFiringProjectiles) {
            // No moves until shot is done.
            return;
        }

        this.controlMap.check();
        if (this.gamePhase === GamePhase.CHARACTER_PLACEMENT && CONTROLS.hasClick()) {
            const mouseTileCoords = Grid.getTileFromCanvasCoords(CONTROLS.handleClick());
            this.tryPlacingCharacter(mouseTileCoords);
        } else if (this.gamePhase === GamePhase.COMBAT && CONTROLS.hasClick()) {
            const mouseTileCoords = Grid.getTileFromCanvasCoords(CONTROLS.handleClick());
            switch (this.selectedCharacterState) {
                case SelectedCharacterState.AWAITING:
                    this.trySelectingCharacter(mouseTileCoords);
                    break;
                case (SelectedCharacterState.MOVING):
                    this.tryMovingSelectedCharacter(mouseTileCoords);
                    break;
                case (SelectedCharacterState.THROWING_GRENADE):
                    this.tryThrowingGrenade(mouseTileCoords);
                    break;
            }
        }
        for (const character of this.redSquad.concat(this.blueSquad)) {
            character.update(elapsedMs, this.getGameInfo());
        }
        this.hud.update(elapsedMs);
    }

    private updateProjectile(elapsedMs: number, projectile: Projectile): void {
        projectile.update(elapsedMs);
        if (projectile.isDead || !projectile.isAtFinalTarget()) {
            return;
        }
        let particleSystemParams: ParticleSystemParams;
        const finalTarget = projectile.getCurrentTarget();
        const hitPositionCanvas = finalTarget.canvasCoords;
        if (projectile.projectileDetails.type === ProjectileDetailsType.SPLASH) {
            const splashDamage = projectile.projectileDetails;
            particleSystemParams = getGrenadeParticleSystemParams(hitPositionCanvas);
            const hitTiles = bfs({
                startTile: finalTarget.tile,
                maxDepth: splashDamage.damageManhattanDistanceRadius,
                isAvailable: (tile: Point) => {
                    return true;
                },
                canGoThrough: (tile: Point) => {
                    return true;
                },
            });
            for (const hitTile of hitTiles) {
                const targetCharacter = this.redSquad.concat(this.blueSquad)
                    .filter((character) => character.isAlive())
                    .find((character) => character.tileCoords.equals(hitTile));
                if (targetCharacter) {
                    const manhattanDistance = targetCharacter.tileCoords
                        .manhattanDistanceTo(finalTarget.tile);
                    const damage = splashDamage.damage * Math.pow(splashDamage.tilesAwayDamageReduction, manhattanDistance);
                    targetCharacter.health -= damage;
                }
            }
        } else {
            const targetCharacter = this.redSquad.concat(this.blueSquad)
                .filter((character) => character.isAlive())
                .find((character) => character.tileCoords.equals(finalTarget.tile));
            if (targetCharacter && targetCharacter !== this.selectedCharacter!) {
                // Assumes friendly fire check occurred in 'fire'.
                targetCharacter.health -= projectile.projectileDetails.damage;
            }
            particleSystemParams = getBulletParticleSystemParams(hitPositionCanvas);
        }
        projectile.setIsDead();

        // Recalculate other projectile targets as they may have been going towards a
        // now destroyed character or obstacle.
        for (const projectile of this.projectiles.filter((projectile) => !projectile.isDead)) {
            const canvasCoords = projectile.animationState.currentCenterCanvas;
            const newTargets = getProjectileTargetsPath({
                ray: projectile.getCurrentTarget().ray,
                startingTileCoords: Grid.getTileFromCanvasCoords(canvasCoords),
                isShotFromBlueTeam: projectile.isFromBlueTeam,
                numRicochets: projectile.getNumRicochetsLeft(),
                characters: this.redSquad.concat(this.blueSquad).filter((character) => character.isAlive()),
                obstacles: this.obstacles,
            });
            projectile.setNewTargets(newTargets);
        }
        this.checkCharacterTurnOver();
        const particleSystem = new ParticleSystem(particleSystemParams);
        this.particleSystems.push(particleSystem);
    }

    render(): void {
        const context = this.context;
        context.fillStyle = THEME.gridBackgroundColor;
        context.clearRect(0, 0, RENDER_SETTINGS.canvasWidth, RENDER_SETTINGS.canvasHeight);
        context.fillRect(0, 0, RENDER_SETTINGS.canvasWidth, RENDER_SETTINGS.canvasHeight);

        if (this.selectableTiles != null && this.selectableTiles.length) {
            for (const availableTile of this.selectableTiles) {
                const tileCanvasTopLeft = Grid.getCanvasFromTileCoords(availableTile);
                context.fillStyle = THEME.availableForMovementColor;
                context.fillRect(tileCanvasTopLeft.x, tileCanvasTopLeft.y, Grid.TILE_SIZE, Grid.TILE_SIZE);
            }
            // Indicate hovered tile.
            const mouseTileCoords = Grid.getTileFromCanvasCoords(CONTROLS.getMouseCanvasCoords());
            if (this.selectableTiles.find((tile) => tile.equals(mouseTileCoords))) {
                const tileCanvasTopLeft = Grid.getCanvasFromTileCoords(mouseTileCoords);
                context.fillStyle = THEME.emptyCellHoverColor;
                context.fillRect(tileCanvasTopLeft.x, tileCanvasTopLeft.y, Grid.TILE_SIZE, Grid.TILE_SIZE);
            }
        }
        // Render PS first to be covered by obstacle for now...
        for (const particleSystem of this.particleSystems) {
            // TODO - be consistent with giving context
            particleSystem.render(this.context);
        }
        for (const obstacle of this.obstacles) {
            obstacle.render(context);
        }
        this.redFlag.render(this.context);
        this.blueFlag.render(this.context);
        const remainingCharacters =
            this.blueSquad
                .concat(this.redSquad)
                .filter((character) => character.isAlive());
        for (const character of remainingCharacters) {
            character.render(this.context);
        }
        if (this.selectedCharacter != null) {
            const tileCanvasTopLeft = Grid.getCanvasFromTileCoords(this.selectedCharacter.tileCoords);
            context.strokeStyle = THEME.selectedCharacterOutlineColor;
            context.lineWidth = 2;
            context.strokeRect(tileCanvasTopLeft.x, tileCanvasTopLeft.y, Grid.TILE_SIZE, Grid.TILE_SIZE);
        }
        for (const projectile of this.projectiles) {
            projectile.render();
        }
        this.hud.render();
    }

    destroy(): void {
        if (this.controlMap) {
            this.controlMap.clear();
        }
    }

    onAction(action: Action): void {
        const squad = this.isBlueTurn ? this.blueSquad : this.redSquad;
        switch (action.type) {
            case ActionType.PLACE_CHARACTER:
                if (this.gamePhase !== GamePhase.CHARACTER_PLACEMENT) {
                    throw new Error(
                        `PLACE_CHARACTER action only allowed in character placement phase`);
                }
                if (!this.selectableTiles
                    .find((tile) => tile.equals(action.tileCoords))) {

                    throw new Error(
                        `Invalid character placement location: ${action.tileCoords.toString()}`);
                }
                const squadIndex = squad.length;
                squad.push(new Character({
                    startCoords: action.tileCoords,
                    isBlueTeam: this.isBlueTurn,
                    index: squadIndex,
                    settings: this.selectedCharacterSettings,
                    gameInfo: this.getGameInfo(),
                }));
                if (squad.length === this.gameSettings.squadSize) {
                    // Placed all characters, end turn.
                    this.nextTurn();
                } else {
                    this.selectableTiles = this.selectableTiles
                        .filter((availableTile) => !availableTile.equals(action.tileCoords));
                }
                break;
            case ActionType.MOVE_CHARACTER:
                if (this.gamePhase !== GamePhase.COMBAT) {
                    throw new Error(
                        `MOVE_CHARACTER action only allowed in combat phase`);
                }
                if (!this.selectableTiles
                    .find((tile) => tile.equals(action.tileCoords))) {

                    throw new Error(
                        `Invalid character movement location: ${action.tileCoords.toString()}`);
                }
                if (this.selectedCharacter == null) {
                    throw new Error(`Selected character is null on MOVE action`);
                }
                const character = this.selectedCharacter!;
                const manhattandDistanceAway = character.tileCoords.manhattanDistanceTo(action.tileCoords);
                if (manhattandDistanceAway > character.settings.maxMovesPerTurn) {
                    throw new Error(`Invalid character movement location (too far): ` +
                        `start: ${character.tileCoords.toString()}, end: ${action.tileCoords.toString()}`);
                }
                const tilePath = this.getPath({ from: character.tileCoords, to: action.tileCoords });
                const targets: Target[] = mapTilePathToTargetsPath(character.tileCoords, tilePath);
                character.moveTo(action.tileCoords, targets);
                this.checkCharacterTurnOver();
                break;
            case ActionType.SHOOT:
                if (this.selectedCharacter == null) {
                    throw new Error(`Selected character is null on FIRE action`);
                }
                const shotInfos = this.selectedCharacter.shoot();
                for (const shotInfo of shotInfos) {
                    this.fireShot(shotInfo);
                }
                // Next turn logic runs when projectile dies.
                break;
            case ActionType.HEAL:
                if (this.selectedCharacter == null) {
                    throw new Error(`Selected character is null on HEAL action`);
                }
                this.selectedCharacter.regenHealth(action.healAmount);
                this.selectedCharacter.useAbility(action.type);
                this.checkCharacterTurnOver();
                break;
            case ActionType.THROW_GRENADE:
                if (this.selectedCharacter == null) {
                    throw new Error(`Selected character is null on THROW GRENADE action`);
                }
                this.selectedCharacter.useAbility(action.type);
                this.throwGrenade(action);
                break;
            case ActionType.END_CHARACTER_TURN:
                if (this.selectedCharacter == null) {
                    throw new Error(`Selected character is null on END_CHARACTER_TURN action`);
                }
                this.selectedCharacter.setTurnOver();
                this.onCharacterTurnOver();
                break;
            case ActionType.AIM:
                if (this.selectedCharacter == null) {
                    throw new Error();
                }
                this.selectedCharacter.setAim(action.aimAngleClockwiseRadians);
            case ActionType.SELECT_TILE:
                break;
            case ActionType.SELECT_CHARACTER:
                break;
            case ActionType.SELECT_CHARACTER_STATE:
                this.setSelectedCharacterState(action.state);
                break;
            default:
                throwBadAction(action);
        }
    }

    private checkCharacterTurnOver(): void {
        if (this.selectedCharacter!.isTurnOver()) {
            this.onCharacterTurnOver();
        } else {
            this.setSelectedCharacterState(SelectedCharacterState.AWAITING);
        }
    }

    /** Checks if there's another squad member still active, or advances turn if not. */
    private onCharacterTurnOver(): void {
        const squad = this.isBlueTurn ? this.blueSquad : this.redSquad;
        const activeSquadMember = squad.find((character: Character) => {
            return !character.isTurnOver() && character.isAlive();
        });
        if (activeSquadMember) {
            this.setSelectedCharacter(activeSquadMember.index);
        } else {
            this.nextTurn();
        }
    }

    private nextTurn(): void {
        if (this.gamePhase === GamePhase.CHARACTER_PLACEMENT) {
            if (this.isBlueTurn) {
                this.isBlueTurn = false;
                this.selectableTiles = this.getAvailableTilesForCharacterPlacement();
                this.hud.setText('Red team turn', TextType.TITLE, Duration.LONG);
                this.hud.setText(
                    `Place squad members (${this.gameSettings.squadSize} remaining)`,
                    TextType.SUBTITLE,
                    Duration.LONG);
            } else {
                this.gamePhase = GamePhase.COMBAT;
                this.advanceToNextCombatTurn();
            }
            return;
        }
        this.advanceToNextCombatTurn();
    }

    private advanceToNextCombatTurn(): void {
        this.isBlueTurn = !this.isBlueTurn;
        const squad = this.isBlueTurn ? this.blueSquad : this.redSquad;
        for (const character of squad) {
            character.resetTurnState();
        }
        const teamName = this.isBlueTurn ? `Blue` : `Red`;
        this.setSelectedCharacter(this.getFirstCharacterIndex());
        this.hud.setText(`${teamName} team turn`, TextType.TITLE, Duration.LONG);
        this.hud.setText(
            `Move squad members`,
            TextType.SUBTITLE,
            Duration.LONG);

        if (this.matchType === MatchType.PLAYER_VS_AI) {
            if (this.isBlueTurn !== this.ai.isBlue) {
                return;
            }
            this.ai.onNextTurn({
                getGameState: () => {
                    return this.getGameState();
                },
                onAction: (action: Action) => {
                    this.onAction(action);
                },
                isAnimating: () => this.isAnimating(),
            });
        }
    }

    private getGameState(): GameState {
        const state: GameState = {
            blueFlag: this.blueFlag,
            redFlag: this.redFlag,
            blueSquad: this.blueSquad.filter((character) => character.isAlive()),
            redSquad: this.redSquad.filter((character) => character.isAlive()),
            gamePhase: this.gamePhase,
            isBlueTurn: this.isBlueTurn,
            obstacles: this.obstacles,
            selectableTiles: this.selectableTiles,
            selectedCharacter: this.selectedCharacter,
            selectedCharacterState: this.selectedCharacterState,
        };
        return state;
    }

    private fireShot(shotInfo: ShotInfo): void {
        const ray = getRayForShot(shotInfo);
        const numRicochets = shotInfo.projectileDetails.type === ProjectileDetailsType.BULLET
            ? shotInfo.projectileDetails.numRicochets
            : 0;
        const targetsPath = getProjectileTargetsPath({
            ray,
            startingTileCoords: shotInfo.fromTileCoords,
            isShotFromBlueTeam: shotInfo.isShotFromBlueTeam,
            numRicochets,
            characters: this.redSquad.concat(this.blueSquad).filter((character) => character.isAlive()),
            obstacles: this.obstacles,
        });
        this.projectiles.push(new Projectile({
            context: this.context,
            projectileDetails: shotInfo.projectileDetails,
            targets: targetsPath,
            isFromBlueTeam: shotInfo.isShotFromBlueTeam,
        }));
    }

    private throwGrenade(action: ThrowGrenadeAction): void {
        const fromTile = this.selectedCharacter!.tileCoords;
        const fromCanvasCoords = Grid.getCanvasFromTileCoords(fromTile).add(Grid.HALF_TILE);
        const targetTile = action.targetTile;
        const targetCanvasCoords = Grid.getCanvasFromTileCoords(targetTile).add(Grid.HALF_TILE);
        const direction = targetCanvasCoords.subtract(fromCanvasCoords).normalize();
        const ray = new Ray(fromCanvasCoords, direction);
        const target: Target = {
            canvasCoords: targetCanvasCoords,
            ray,
            tile: targetTile,
            maxDistance: targetCanvasCoords.distanceTo(fromCanvasCoords),
        };
        const shotInfo: ShotInfo = {
            isShotFromBlueTeam: this.selectedCharacter!.isBlueTeam,
            fromCanvasCoords,
            fromTileCoords: fromTile,
            aimAngleRadiansClockwise: direction.getPointRotationRadians(),
            projectileDetails: action.splashDamage,
        };
        const proj = new Projectile({
            context: this.context,
            projectileDetails: shotInfo.projectileDetails,
            targets: [target],
            isFromBlueTeam: shotInfo.isShotFromBlueTeam,
        });
        this.projectiles.push(proj);
    }

    private tryPlacingCharacter(tileCoords: Point): void {
        if (!this.selectableTiles.find((tile) => tile.equals(tileCoords))) {
            this.hud.setText(`Can't place character here`, TextType.TOAST, Duration.SHORT);
            return;
        }

        const placeCharacterAction: PlaceCharacterAction = {
            type: ActionType.PLACE_CHARACTER,
            tileCoords,
        };
        this.onAction(placeCharacterAction);
    }

    private tryMovingSelectedCharacter(tileCoords: Point): void {
        if (!this.selectableTiles.find((tile) => tile.equals(tileCoords))) {
            this.hud.setText(`Can't move character here`, TextType.TOAST, Duration.SHORT);
            return;
        }

        const moveCharacterAction: MoveCharacterAction = {
            type: ActionType.MOVE_CHARACTER,
            tileCoords,
        };
        this.onAction(moveCharacterAction);
    }

    private trySelectingCharacter(tileCoords: Point): void {
        const squad = this.isBlueTurn ? this.blueSquad : this.redSquad;
        const squadMemeberAtTile =
            squad.find((character) => character.tileCoords.equals(tileCoords));
        if (squadMemeberAtTile) {
            this.setSelectedCharacter(squadMemeberAtTile.index);
        }
    }

    private tryThrowingGrenade(tileCoords: Point): void {
        if (!this.selectableTiles.find((tile) => tile.equals(tileCoords))) {
            this.hud.setText(`Can't throw grenade here`, TextType.TOAST, Duration.SHORT);
            return;
        }
        this.selectableTiles = [];
        const grenadeAction: ThrowGrenadeAction = {
            type: ActionType.THROW_GRENADE,
            splashDamage: this.selectedCharacter!.getGrenadeAbility().splashDamage,
            targetTile: tileCoords,
        };
        this.onAction(grenadeAction);
    }

    private getAvailableTilesForCharacterPlacement(): Point[] {
        const flagCoords = this.isBlueTurn ? this.blueFlag.tileCoords : this.redFlag.tileCoords;
        const maxDistFromFlag = this.gameSettings.maxSpawnDistanceFromFlag;
        const availableTiles = bfs({
            startTile: flagCoords,
            maxDepth: maxDistFromFlag,
            isAvailable: (tile: Point): boolean => {
                return !this.isTileOccupied(tile) && !tile.equals(flagCoords);
            },
            canGoThrough: (tile: Point): boolean => {
                // Can go through other players, just not obstacles.
                return this.obstacles.find(
                    (obstacle: Obstacle) => obstacle.tileCoords.equals(tile)) == null;
            },
        });
        return availableTiles;
    }

    private getAvailableTilesForCharacterMovement(): Point[] {
        if (this.selectedCharacter == null) {
            throw new Error(`No character selected in getAvailableTilesForCharacterMovement`);
        }
        const ownFlagCoords = this.isBlueTurn ? this.blueFlag.tileCoords : this.redFlag.tileCoords;
        const currentCoords = this.selectedCharacter.tileCoords;
        const maxMoves = this.selectedCharacter.settings.maxMovesPerTurn;
        const isAvailable = (tile: Point): boolean => {
            return !this.isTileOccupied(tile)
                && (!tile.equals(ownFlagCoords) || this.selectedCharacter!.hasFlag);
        };
        const canGoThrough = (tile: Point): boolean => {
            // Characters can go through tiles occupied by squad members.
            // but they can't stop there.
            return isAvailable(tile) || this.isSquadMemberAtTile(tile);
        };
        const availableTiles = bfs({
            startTile: currentCoords,
            maxDepth: maxMoves,
            isAvailable,
            canGoThrough,
        });
        return availableTiles;
    }

    private getPath({ from, to }: { from: Point; to: Point }): Point[] {
        const isObstacleFree = (tile: Point): boolean => {
            return this.obstacles.find((obstacle) => obstacle.tileCoords.equals(tile)) == null;
        };
        return pathTo({
            startTile: from,
            endTile: to,
            isAvailable: isObstacleFree,
            canGoThrough: isObstacleFree,
        });
    }

    private getAvailableTilesForThrowingGrenade(): Point[] {
        if (this.selectedCharacter == null) {
            throw new Error(`No character selected in getAvailableTilesForCharacterMovement`);
        }
        const ownFlagCoords = this.isBlueTurn ? this.blueFlag.tileCoords : this.redFlag.tileCoords;
        const currentCoords = this.selectedCharacter.tileCoords;
        const maxDist = this.selectedCharacter.getGrenadeAbility().maxManhattanDistance;
        const isAvailable = (tile: Point): boolean => {
            return !this.tileHasObstacle(tile)
                && !tile.equals(currentCoords)
                && !this.isSquadMemberAtTile(tile);
        };
        const canGoThrough = (tile: Point): boolean => {
            // Grenades can go over any tile.
            return Grid.inbounds(tile);
        };
        const availableTiles = bfs({
            startTile: currentCoords,
            maxDepth: maxDist,
            isAvailable,
            canGoThrough,
        });
        return availableTiles;
    }

    private setSelectedCharacter(index: number): void {
        const squad = this.isBlueTurn ? this.blueSquad : this.redSquad;
        const character = squad[index];
        if (character.isTurnOver()) {
            this.hud.setText(
                `Unit ${index + 1}'s turn is over.`, TextType.TOAST, Duration.SHORT);
            return;
        }
        this.selectedCharacter = character;
        this.setSelectedCharacterState(SelectedCharacterState.AWAITING);
    }

    private setSelectedCharacterState(state: SelectedCharacterState) {
        if (this.selectedCharacter == null) {
            throw new Error(
                `There needs to be a selected character before calling setSelectedCharacterState`);
        }
        this.selectedCharacterState = state;
        this.controlMap.clear();
        this.addDefaultControls();
        this.addSwitchSquadMemberControls();

        this.controlMap.add({
            key: END_TURN_KEY,
            name: 'End character turn',
            func: () => {
                if (this.selectedCharacter == null) {
                    throw new Error(
                        `There's no selected character when ending turn.`);
                }
                const action: EndCharacterTurnAction = {
                    type: ActionType.END_CHARACTER_TURN,
                };
                this.onAction(action);
            },
            eventType: EventType.KeyPress,
        });

        switch (state) {
            case SelectedCharacterState.AWAITING:
                this.selectableTiles = [];
                this.selectedCharacter.cancelAiming();
                if (!this.selectedCharacter.hasMoved) {
                    this.controlMap.add({
                        key: MOVE_KEY,
                        name: 'Move',
                        func: () => {
                            const action: SelectCharacterStateAction = {
                                type: ActionType.SELECT_CHARACTER_STATE,
                                state: SelectedCharacterState.MOVING,
                            };
                            this.onAction(action);
                        },
                        eventType: EventType.KeyPress,
                    });
                }
                if (this.selectedCharacter.canShoot()) {
                    this.controlMap.add({
                        key: TOGGLE_AIM_KEY,
                        name: 'Aim',
                        func: () => {
                            const action: SelectCharacterStateAction = {
                                type: ActionType.SELECT_CHARACTER_STATE,
                                state: SelectedCharacterState.AIMING,
                            };
                            this.onAction(action);
                        },
                        eventType: EventType.KeyPress,
                    });
                }
                for (const extraAction of this.selectedCharacter.extraAbilities) {
                    switch (extraAction.actionType) {
                        case ActionType.HEAL:
                            this.controlMap.add({
                                key: HEAL_KEY,
                                name: 'Heal',
                                func: () => {
                                    const healAction: HealAction = {
                                        type: ActionType.HEAL,
                                        healAmount: extraAction.healAmount,
                                    };
                                    this.onAction(healAction);
                                },
                                eventType: EventType.KeyPress,
                            });
                            break;
                        case ActionType.THROW_GRENADE:
                            this.controlMap.add({
                                key: TOGGLE_THROW_GRENADE_KEY,
                                name: 'Throw grenade',
                                func: () => {
                                    const action: SelectCharacterStateAction = {
                                        type: ActionType.SELECT_CHARACTER_STATE,
                                        state: SelectedCharacterState.THROWING_GRENADE,
                                    };
                                    this.onAction(action);
                                },
                                eventType: EventType.KeyPress,
                            });
                            break;
                    }
                }
                break;
            case SelectedCharacterState.MOVING:
                this.selectableTiles = this.getAvailableTilesForCharacterMovement();
                this.controlMap.add({
                    key: MOVE_KEY,
                    name: 'Cancel Move',
                    func: () => {
                        const action: SelectCharacterStateAction = {
                            type: ActionType.SELECT_CHARACTER_STATE,
                            state: SelectedCharacterState.AWAITING,
                        };
                        this.onAction(action);
                    },
                    eventType: EventType.KeyPress,
                });
                break;
            case SelectedCharacterState.AIMING:
                this.selectedCharacter.startAiming();
                this.controlMap.add({
                    key: TOGGLE_AIM_KEY,
                    name: 'Stop Aiming',
                    func: () => {
                        if (this.selectedCharacter == null) {
                            throw new Error(
                                `There's no selected character when canceling shooting.`);
                        }
                        const action: SelectCharacterStateAction = {
                            type: ActionType.SELECT_CHARACTER_STATE,
                            state: SelectedCharacterState.AWAITING,
                        };
                        this.onAction(action);
                    },
                    eventType: EventType.KeyPress,
                });
                const AIM_ANGLE_RADIANS_DELTA = Math.PI / 32;
                this.controlMap.add({
                    key: AIM_COUNTERCLOCKWISE_KEY,
                    name: 'Aim counterclockwise',
                    func: () => {
                        if (this.selectedCharacter == null) {
                            throw new Error(
                                `There's no selected character when aiming CCW.`);
                        }
                        const aimAction: AimAction = {
                            type: ActionType.AIM,
                            aimAngleClockwiseRadians: this.selectedCharacter.getAim() - AIM_ANGLE_RADIANS_DELTA,
                        }
                        this.onAction(aimAction);
                    },
                    eventType: EventType.KeyDown,
                });
                this.controlMap.add({
                    key: AIM_CLOCKWISE_KEY,
                    name: 'Aim clockwise',
                    func: () => {
                        if (this.selectedCharacter == null) {
                            throw new Error(
                                `There's no selected character when aiming CC.`);
                        }
                        const aimAction: AimAction = {
                            type: ActionType.AIM,
                            aimAngleClockwiseRadians: this.selectedCharacter.getAim() + AIM_ANGLE_RADIANS_DELTA,
                        }
                        this.onAction(aimAction);
                    },
                    eventType: EventType.KeyDown,
                });
                this.controlMap.add({
                    key: SHOOT_KEY,
                    name: 'Fire',
                    func: () => {
                        if (this.selectedCharacter == null) {
                            throw new Error(
                                `There's no selected character when canceling shooting.`);
                        }
                        const fireAction: ShootAction = {
                            type: ActionType.SHOOT,
                        };
                        this.onAction(fireAction);
                        this.setSelectedCharacterState(SelectedCharacterState.AWAITING);
                    },
                    eventType: EventType.KeyPress,
                });
                break;
            case SelectedCharacterState.THROWING_GRENADE:
                this.selectableTiles = this.getAvailableTilesForThrowingGrenade();
                this.controlMap.add({
                    key: TOGGLE_THROW_GRENADE_KEY,
                    name: 'Cancel throwing grenade',
                    func: () => {
                        const action: SelectCharacterStateAction = {
                            type: ActionType.SELECT_CHARACTER_STATE,
                            state: SelectedCharacterState.AWAITING,
                        };
                        this.onAction(action);
                    },
                    eventType: EventType.KeyPress,
                });
                break;
            default:
                throw new Error(`Unknown selected character state`);
        }
    }

    /** 
     * Whether a tile contains an obstacle or character. 
     * Tiles with flags are NOT considered occupied. 
     */
    private isTileOccupied(tileCoords: Point): boolean {
        const potentialObstacle = this.obstacles.find(
            (obstacle: Obstacle) => obstacle.tileCoords.equals(tileCoords));
        const potentialCharacter =
            this.blueSquad
                .concat(this.redSquad)
                .find(
                (character) => {
                    return character.isAlive() && character.tileCoords.equals(tileCoords);
                });
        return potentialObstacle != null || potentialCharacter != null;
    }

    private resetGame = (): void => {
        this.destroy();
        this.loadLevel();
        this.gameSettings = DEFAULT_GAME_SETTINGS;
        this.gamePhase = GamePhase.CHARACTER_PLACEMENT;
        this.blueSquad = [];
        this.redSquad = [];
        this.projectiles = [];
        this.particleSystems = [];
        if (this.matchType === MatchType.PLAYER_VS_AI) {
            this.ai = new Ai({ isBlue: false });
        }
        // Blue is always assumed to go first...
        this.isBlueTurn = true;
        this.selectableTiles = this.getAvailableTilesForCharacterPlacement();
        this.controlMap = new ControlMap();
        this.addDefaultControls();
        this.addCharacterClassControls();
        this.hud = new Hud(this.context);
        this.hud.setControlMap(this.controlMap);
        this.hud.setText('Blue team turn', TextType.TITLE, Duration.LONG);
        this.hud.setText(
            `Place squad members (${this.gameSettings.squadSize} remaining)`,
            TextType.SUBTITLE,
            Duration.LONG);
    }

    private loadLevel(): void {
        const level = LEVELS[this.levelIndex];
        this.redFlag = new Flag({
            tileCoords: pointFromSerialized(level.data.redFlag),
            isBlue: false,
        });
        this.blueFlag = new Flag({
            tileCoords: pointFromSerialized(level.data.blueFlag),
            isBlue: true,
        });
        this.obstacles = level.data.obstacles.map((serializedPt) => {
            return new Obstacle(pointFromSerialized(serializedPt));
        });
    }

    private addDefaultControls(): void {
        this.controlMap.add({
            key: Key.Q,
            name: 'Quit',
            func: this.onExitGameCallback,
            eventType: EventType.KeyPress,
        });
        this.controlMap.add({
            key: Key.R,
            name: 'Reset',
            func: this.resetGame,
            eventType: EventType.KeyPress,
        });
        this.controlMap.add({
            key: Key.QUESTION_MARK,
            name: 'Show/Hide controls',
            func: () => { this.hud.toggleShowControlMap(); },
            eventType: EventType.KeyPress,
        });
    }

    private addSwitchSquadMemberControls(): void {
        const squad = this.isBlueTurn ? this.blueSquad : this.redSquad;
        for (const character of squad) {
            // Use 1-based numbers for UI.
            const characterNumber = character.index + 1;
            const key = numberToKey.get(characterNumber);
            if (key == null) {
                throw new Error(`Not enough keys for all character numbers!`);
            }
            this.controlMap.add({
                key,
                name: `Select ${numberToOrdinal.get(characterNumber)} character`,
                func: () => { this.setSelectedCharacter(character.index); },
                eventType: EventType.KeyPress,
            });
        }
    }

    private getFirstCharacterIndex(): number {
        const squad = this.isBlueTurn ? this.blueSquad : this.redSquad;
        for (let index = 0; index < squad.length; index++) {
            if (squad[index].isAlive()) {
                return index;
            }
        }
        throw new Error(`No more characters alive - should be game over?`);
    }

    private tileHasObstacle(tile: Point): boolean {
        return this.obstacles.find((obstacle) => obstacle.tileCoords.equals(tile)) != null;
    }

    private isSquadMemberAtTile(tile: Point): boolean {
        const squad = this.isBlueTurn ? this.blueSquad : this.redSquad;
        return squad.find((squadMember: Character) => {
            return squadMember.isAlive()
                && squadMember.tileCoords.equals(tile)
                && squadMember !== this.selectedCharacter;
        }) != null;
    }

    private addCharacterClassControls(): void {
        for (const key of keysToCharacterClassType.keys()) {
            const characterClassType = keysToCharacterClassType.get(key)!;
            this.controlMap.add({
                key,
                name: characterClassType,
                func: () => {
                    const newClass = CHARACTER_CLASSES.find((settings) => {
                        return settings.type === characterClassType;
                    })!;
                    this.selectedCharacterSettings = newClass;
                    return true;
                },
                eventType: EventType.KeyPress,
            });
        }

    }
}

function mapTilePathToTargetsPath(startTile: Point, tilePath: Point[]): Target[] {
    const targets: Target[] = [];
    let curTile = startTile;
    const tileToCanvas = (tile: Point) => Grid.getCanvasFromTileCoords(tile).add(Grid.HALF_TILE);
    let curCanvas = tileToCanvas(curTile);
    for (const nextTile of tilePath) {
        const nextCanvas = tileToCanvas(nextTile);
        const direction = nextCanvas.subtract(curCanvas).normalize();
        const target: Target = {
            ray: new Ray(curCanvas, direction),
            canvasCoords: nextCanvas,
            tile: nextTile,
            maxDistance: curCanvas.distanceTo(nextCanvas),
        };
        curTile = nextTile;
        curCanvas = nextCanvas;
        targets.push(target);
    }
    return targets;
}
import { RENDER_SETTINGS } from 'src/app/render_settings';
import { Grid, bfs, pathTo } from 'src/app/grid';
import { Point, pointFromSerialized, containsPoint } from 'src/app/math/point';
import { CONTROLS, ControlMap, EventType, Key, numberToKey, numberToOrdinal } from 'src/app/controls';
import { THEME } from 'src/app/theme';
import { LEVELS } from 'src/app/level';
import { GameSettings, MatchType, AiDifficulty } from 'src/app/game_settings';
import { Ray, LineSegment, detectRayLineSegmentCollision } from 'src/app/math/collision_detection';
import { ShotInfo, ProjectileDetailsType, Bullet, ProjectileDetails, SplashDamage } from 'src/app/shot_info';
import { Action, ActionType, throwBadAction, HealAction, EndCharacterTurnAction, ShootAction, SelectCharacterStateAction, AimAction, SelectTileAction, SelectCharacterAction, SelectCharacterClassAction } from 'src/app/actions';
import { CharacterSettings, HealAbility, ASSAULT_CHARACTER_SETTINGS, ClassType, CHARACTER_CLASSES, CharacterAbilityType } from 'src/app/character_settings';
import { Flag } from 'src/app/game_objects/flag';
import { Projectile } from 'src/app/game_objects/projectile';
import { ParticleSystem, ParticleShape, ParticleSystemParams } from 'src/app/game_objects/particle_system';
import { Hud, TextType, Duration } from 'src/app/hud';
import { Obstacle } from 'src/app/game_objects/obstacle';
import { Character } from 'src/app/game_objects/character';
import { Ai } from 'src/app/ai';
import { GamePhase, SelectedCharacterState, GameState } from 'src/app/game_state';
import { GameModeManager } from 'src/app/game_mode_manager';
import { getRayForShot, getProjectileTargetsPath } from 'src/app/target_finder';
import { Target } from 'src/app/math/target';
import { AnimationState } from 'src/app/animation_state';
import { getGrenadeSmokeParticleSystemParams, getGrenadeBurstParticleSystemParams, getBulletParticleSystemParams, getHealParticleSystemParams } from './particle_system_theme';
import { Spawner } from './game_objects/spawner';

interface ClickHandler {
    onClick: (tile: Point) => void;
}

const ALLOW_ELIMINATION_VICTORY_WITH_SPAWNERS = false;
const DEFAULT_HUMAN_TEAM_INDEX = 0;

const PAUSE_KEY = Key.P;
const QUIT_KEY = Key.Q;
const RESTART_KEY = Key.R;
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

export class GameManager implements GameModeManager {

    private readonly canvas: HTMLCanvasElement;
    private readonly context: CanvasRenderingContext2D;
    private readonly levelIndex: number;
    private readonly gameSettings: GameSettings;
    private readonly onExitGameCallback:
        (winningTeamIndex: number) => void;

    private isGameOver: boolean;
    private isPaused: boolean;
    private winningTeamIndex: number;
    private hud: Hud;
    private clickHandler: ClickHandler | null = null;
    private onAnimationDone: (() => void) | null = null;
    private controlMap: ControlMap;
    private gameState: GameState;

    private selectedCharacterSettings:
        CharacterSettings = ASSAULT_CHARACTER_SETTINGS;
    private projectiles: Projectile[];
    private particleSystems: ParticleSystem[];

    private teamIndexToIsAi: boolean[];
    private ais: Ai[];

    constructor(
        canvas: HTMLCanvasElement,
        context: CanvasRenderingContext2D,
        params: {
            gameSettings: GameSettings;
            levelIndex: number;
            onExitGameCallback: (winningTeamIndex: number) => void;
        }) {

        this.canvas = canvas;
        this.context = context;
        this.gameSettings = params.gameSettings;
        this.levelIndex = params.levelIndex;
        this.onExitGameCallback = params.onExitGameCallback;
        this.resetGame();
    }

    isAnimating(): boolean {
        const animatables: { animationState: AnimationState }[] = [
            ...this.gameState.getAliveCharacters(),
            ...this.projectiles];
        return animatables
            .some((animatable) => animatable.animationState.isAnimating);
    }

    update(elapsedMs: number): void {
        if (this.isPaused) {
            this.controlMap.check();
            return;
        }
        for (const particleSystem of this.particleSystems) {
            particleSystem.update(elapsedMs);
        }
        this.particleSystems = this.particleSystems
            .filter((particleSystem) => particleSystem.isAlive);

        let hasFiringProjectiles = false;
        for (const projectile of this.projectiles) {
            this.updateProjectile(elapsedMs, projectile);
        }
        this.projectiles = this.projectiles
            .filter((projectile) => {
                return !projectile.isDead || !projectile.isTrailGone();
            });
        for (const character of this.gameState.getAliveCharacters()) {
            character.update(elapsedMs);
            if (character.animationState.isAnimating
                && this.shouldSkipAnimation(character)) {
                character.skipAnimation();
            }
        }
        this.hud.update(elapsedMs);

        this.controlMap.check();
        if (CONTROLS.hasClick()) {
            const mouseTileCoords =
                Grid.getTileFromCanvasCoords(CONTROLS.handleClick());
            if (this.clickHandler != null) {
                this.clickHandler.onClick(mouseTileCoords);
            }
        }

        if (!this.isAnimating() && this.onAnimationDone != null) {
            this.onAnimationDone();
            this.onAnimationDone = null;
        }

        if (this.gameState.gamePhase !== GamePhase.CHARACTER_PLACEMENT
            && this.gameState.getActiveSquad()
                .filter(character => !character.isTurnOver()).length === 0) {
            // Should automatically skip turn with delay 
            // when team is out of characters but need update 
            // loop to run for spawners...
            return;
        }

        if (this.isAiTurn() && !this.isAnimating()) {
            const nextAction = this.getCurrentTurnAi()
                .getNextAction(this.getGameState());
            this.onAction(nextAction);
        }
    }

    private updateProjectile(
        elapsedMs: number, projectile: Projectile): void {

        projectile.update(elapsedMs);
        if (projectile.isDead || !projectile.isAtFinalTarget()) {
            return;
        }
        const finalTarget = projectile.getCurrentTarget();
        const hitPositionCanvas = finalTarget.canvasCoords;
        if (projectile.projectileDetails.type === ProjectileDetailsType.SPLASH) {
            const splashDamage = projectile.projectileDetails;
            this.particleSystems.push(new ParticleSystem(
                getGrenadeSmokeParticleSystemParams(hitPositionCanvas)));
            this.particleSystems.push(new ParticleSystem(
                getGrenadeBurstParticleSystemParams(hitPositionCanvas)));
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
                const targetCharacter = this.gameState.getAliveCharacters()
                    .find((character) => character.tileCoords.equals(hitTile));
                if (targetCharacter) {
                    const manhattanDistance = targetCharacter.tileCoords
                        .manhattanDistanceTo(finalTarget.tile);
                    const damageReduction =
                        Math.pow(
                            splashDamage.tilesAwayDamageReduction,
                            manhattanDistance);
                    const damage = splashDamage.damage * damageReduction
                    targetCharacter.health -= damage;
                }
            }
        } else {
            const targetCharacter = this.gameState.getAliveCharacters()
                .find((character) => character.tileCoords.equals(finalTarget.tile));
            if (targetCharacter
                && targetCharacter !== this.gameState.selectedCharacter!
                // Avoid edge case ;) where bullet hits wall and
                // not actually the character at the tile specified
                && !finalTarget.isTargetGridBorder) {

                // Assumes friendly fire check occurred in 'fireShot'.
                targetCharacter.health -= projectile.projectileDetails.damage;
            }
            this.particleSystems.push(new ParticleSystem(
                getBulletParticleSystemParams(hitPositionCanvas)));
        }
        projectile.setIsDead();

        // Recalculate other projectile targets 
        // as they may have been going towards a
        // now destroyed character or obstacle.
        for (const projectile of this.projectiles
            .filter((projectile) => !projectile.isDead)) {
            const canvasCoords = projectile.animationState.currentCenterCanvas;
            const newTargets = getProjectileTargetsPath({
                ray: projectile.getCurrentTarget().ray,
                startingTileCoords: Grid.getTileFromCanvasCoords(canvasCoords),
                fromTeamIndex: projectile.fromTeamIndex,
                numRicochets: projectile.getNumRicochetsLeft(),
                characters: this.gameState.getAliveCharacters(),
                obstacles: this.gameState.obstacles,
            });
            projectile.setNewTargets(newTargets);
        }
    }

    private shouldSkipAnimation(character: Character): boolean {
        if (!this.isAiTurn()) {
            return false;
        }
        if (this.gameState.settings.matchType === MatchType.AI_VS_AI) {
            return true;
        }
        // TODO check if ai charcter's path is completely out of sight.
        return false;
    }

    render(): void {
        const context = this.context;
        context.fillStyle = THEME.gridBackgroundColor;
        context.clearRect(
            0, 0, RENDER_SETTINGS.canvasWidth, RENDER_SETTINGS.canvasHeight);
        context.fillRect(
            0, 0, RENDER_SETTINGS.canvasWidth, RENDER_SETTINGS.canvasHeight);

        if (this.gameState.selectableTiles != null
            && this.gameState.selectableTiles.length) {
            if (!this.isAiTurn()) {
                for (const availableTile of this.gameState.selectableTiles) {
                    const tileCanvasTopLeft =
                        Grid.getCanvasFromTileCoords(availableTile);
                    context.fillStyle = THEME.availableForMovementColor;
                    context.fillRect(
                        tileCanvasTopLeft.x, tileCanvasTopLeft.y,
                        Grid.TILE_SIZE, Grid.TILE_SIZE);
                }
            }
            // Indicate hovered tile.
            const mouseTileCoords =
                Grid.getTileFromCanvasCoords(CONTROLS.getMouseCanvasCoords());
            if (this.gameState.selectableTiles
                .find((tile) => tile.equals(mouseTileCoords))) {
                const tileCanvasTopLeft =
                    Grid.getCanvasFromTileCoords(mouseTileCoords);
                context.fillStyle = THEME.emptyCellHoverColor;
                context.fillRect(
                    tileCanvasTopLeft.x, tileCanvasTopLeft.y,
                    Grid.TILE_SIZE, Grid.TILE_SIZE);
            }
        }
        for (const obstacle of this.gameState.obstacles) {
            obstacle.render(context);
        }
        for (const flag of this.gameState.flags) {
            flag.render(this.context);
        }
        for (const character of this.gameState.getAliveCharacters()) {
            if (this.shouldRenderCharacter(character)) {
                character.render(this.context);
            }
        }
        for (const spawner of this.gameState.spawners) {
            spawner.render(this.context);
        }
        if (this.gameState.selectedCharacter != null && !this.isAiTurn()) {
            const tileCanvasTopLeft = Grid.getCanvasFromTileCoords(
                this.gameState.selectedCharacter.tileCoords);
            context.strokeStyle = THEME.selectedCharacterOutlineColor;
            context.lineWidth = 2;
            context.strokeRect(
                tileCanvasTopLeft.x, tileCanvasTopLeft.y,
                Grid.TILE_SIZE, Grid.TILE_SIZE);
        }
        for (const projectile of this.projectiles) {
            if (this.shouldRenderObjectAtTile(projectile.tileCoords)) {
                projectile.render();
            }
        }
        for (const particleSystem of this.particleSystems) {
            if (this.shouldRenderObjectAtTile(particleSystem.tileCoords)) {
                particleSystem.render(this.context);
            }
        }
        this.renderFogOfWar(this.context);
        this.hud.render();
    }

    private shouldRenderCharacter(character: Character): boolean {
        if (!this.gameState.isFogOfWarOn()) {
            return true;
        }
        if (this.gameState.settings.matchType === MatchType.PLAYER_VS_PLAYER_LOCAL
            || this.gameState.settings.matchType === MatchType.AI_VS_AI) {
            // TODO - implement 'pass device' screen.
            return this.gameState.isTileVisibleByTeamIndex(
                character.tileCoords, this.gameState.currentTeamIndex);
        }

        // In player vs AI, always render from player perspective
        if (character.teamIndex === DEFAULT_HUMAN_TEAM_INDEX) {
            return true;
        } else {
            const animatingCharacterTile = Grid.getTileFromCanvasCoords(
                character.animationState.currentCenterCanvas);
            return this.gameState
                .isTileVisibleByTeamIndex(animatingCharacterTile,
                    DEFAULT_HUMAN_TEAM_INDEX);
        }
    }

    private shouldRenderObjectAtTile(tile: Point): boolean {
        if (!this.gameState.isFogOfWarOn()) {
            return true;
        }
        if (this.gameState.settings.matchType === MatchType.PLAYER_VS_PLAYER_LOCAL
            || this.gameState.settings.matchType === MatchType.AI_VS_AI) {
            // TODO - implement 'pass device' screen.
            return this.gameState.isTileVisibleByTeamIndex(
                tile, this.gameState.currentTeamIndex);
        }
        // In player vs AI, always render from player perspective
        return this.gameState.isTileVisibleByTeamIndex(
            tile,
            DEFAULT_HUMAN_TEAM_INDEX);
    }

    private renderFogOfWar(context: CanvasRenderingContext2D): void {
        if (!this.gameState.isFogOfWarOn()) {
            return;
        }
        let visibleTiles: Point[] = [];
        if (this.gameState.settings.matchType === MatchType.PLAYER_VS_PLAYER_LOCAL
            || this.gameState.settings.matchType === MatchType.AI_VS_AI) {
            visibleTiles =
                this.gameState.getTilesVisibleByTeamIndex(
                    this.gameState.currentTeamIndex);
        } else if (this.gameState.settings.matchType === MatchType.PLAYER_VS_AI) {
            visibleTiles = this.gameState
                .getTilesVisibleByTeamIndex(DEFAULT_HUMAN_TEAM_INDEX);
        }
        if (this.gameState.gamePhase === GamePhase.CHARACTER_PLACEMENT
            && !this.isAiTurn()) {
            visibleTiles = visibleTiles.concat(this.gameState.selectableTiles);
        }
        context.fillStyle = THEME.fogColor;
        for (let x = 0; x < Grid.TILES_WIDE; x++) {
            for (let y = 0; y < Grid.TILES_TALL; y++) {
                const tile = new Point(x, y);
                const isVisible = visibleTiles
                    .find((visibleTile) => visibleTile.equals(tile));
                if (isVisible) {
                    continue;
                }
                const canvasTopLeft = Grid.getCanvasFromTileCoords(tile);
                context.fillRect(
                    canvasTopLeft.x, canvasTopLeft.y,
                    Grid.TILE_SIZE, Grid.TILE_SIZE);
            }
        }
    }

    destroy(): void {
        if (this.controlMap) {
            this.controlMap.clear();
        }
    }

    onAction(action: Action): void {
        if (this.isPaused) {
            return;
        }
        const activeSquad = this.gameState.getActiveSquad();
        switch (action.type) {
            case ActionType.SHOOT:
                if (this.gameState.selectedCharacter == null) {
                    throw new Error(
                        `Selected character is null on FIRE action`);
                }
                const shotInfos = this.gameState.selectedCharacter.shoot();
                for (const shotInfo of shotInfos) {
                    this.fireShot(shotInfo);
                    // Next turn logic runs when projectile dies.
                    this.addOnAnimationDoneCallback(() => {
                        this.checkGameOver();
                        if (!this.isGameOver) {
                            this.checkCharacterTurnOver();
                        }
                    });
                }
                break;
            case ActionType.HEAL:
                if (this.gameState.selectedCharacter == null) {
                    throw new Error(
                        `Selected character is null on HEAL action`);
                }
                this.gameState.selectedCharacter.regenHealth(action.healAmount);
                this.gameState.selectedCharacter
                    .useAbility(CharacterAbilityType.HEAL);
                const characterCenter =
                    Grid.getCanvasFromTileCoords(
                        this.gameState.selectedCharacter.tileCoords)
                        .add(Grid.HALF_TILE);
                this.particleSystems.push(new ParticleSystem(
                    getHealParticleSystemParams(characterCenter)));
                this.checkCharacterTurnOver();
                break;
            case ActionType.END_CHARACTER_TURN:
                if (this.gameState.selectedCharacter == null) {
                    throw new Error(
                        `Selected character is null on END_CHARACTER_TURN action`);
                }
                this.gameState.selectedCharacter.setTurnOver();
                this.onCharacterTurnOver();
                break;
            case ActionType.AIM:
                if (this.gameState.selectedCharacter == null) {
                    throw new Error(
                        `No selected character when trying to aim`);
                }
                this.gameState.selectedCharacter
                    .setAim(action.aimAngleClockwiseRadians);
                break;
            case ActionType.SELECT_TILE:
                if (!this.gameState.selectableTiles
                    .find((tile) => tile.equals(action.tile))) {
                    throw new Error(
                        `Invalid tile selection: ${action.tile.toString()}`);
                }
                if (this.gameState.gamePhase === GamePhase.COMBAT) {
                    if (this.gameState.selectedCharacter == null) {
                        throw new Error(
                            `Selected character is null on ` +
                            `SELECT_TILE action in combat phase`);
                    }
                    this.gameState.selectableTiles = [];
                    if (this.gameState.selectedCharacterState
                        === SelectedCharacterState.MOVING) {
                        this.handleCharacterMovement(action.tile);
                    } else if (this.gameState.selectedCharacterState
                        === SelectedCharacterState.THROWING_GRENADE) {
                        const grenadeDetails = {
                            splashDamage: this.gameState.selectedCharacter
                                .getGrenadeAbility().splashDamage,
                            tile: action.tile,
                        };
                        this.gameState.selectedCharacter
                            .useAbility(CharacterAbilityType.THROW_GRENADE);
                        this.throwGrenade(grenadeDetails);
                    }
                } else {
                    const squadIndex = activeSquad.length;
                    this.gameState.characters.push(new Character({
                        startCoords: action.tile,
                        teamIndex: this.gameState.currentTeamIndex,
                        index: squadIndex,
                        settings: this.selectedCharacterSettings,
                        gameDelegate: this.gameDelegate,
                    }));
                    const teamMaxSquadSize =
                        this.gameSettings.teamIndexToSquadSize
                            .get(this.gameState.currentTeamIndex)!;
                    if (activeSquad.length + 1 === teamMaxSquadSize) {
                        // Placed all characters, end turn.
                        this.nextTurn();
                    } else {
                        // MUTATE
                        this.gameState.selectableTiles =
                            this.gameState.selectableTiles
                                .filter((availableTile) => {
                                    return !availableTile.equals(action.tile);
                                });
                    }
                }
                break;
            case ActionType.SELECT_CHARACTER:
                const character = activeSquad
                    .find((character) => character.index === action.characterIndex);
                if (character == null) {
                    throw new Error(
                        `Can't find character in SELECT_CHARACTER action. ` +
                        `cur team index: ${this.gameState.currentTeamIndex}; ` +
                        ` charIndex: ${action.characterIndex}`);
                }
                if (character.isTurnOver() || !character.isAlive()) {
                    throw new Error(
                        `Selected character is dead or turn is over.`);
                }
                this.setSelectedCharacter(action.characterIndex);
                break;
            case ActionType.SELECT_CHARACTER_STATE:
                this.setSelectedCharacterState(action.state);
                break;
            case ActionType.SELECT_CHARACTER_CLASS:
                this.selectedCharacterSettings = action.class;
                break;
            default:
                throwBadAction(action);
        }
    }

    private gameDelegate = {
        getCurrentAimPath: (params: {
            ray: Ray;
            startingTileCoords: Point;
            fromTeamIndex: number;
            numRicochets: number;
        }) => {
            return getProjectileTargetsPath({
                ...params,
                characters: this.gameState.getAliveCharacters(),
                obstacles: this.gameState.obstacles
            });
        }
    };

    private checkGameOver(): void {
        if (!ALLOW_ELIMINATION_VICTORY_WITH_SPAWNERS
            && this.gameState.spawners.length > 0) {
            // TODO - assumes spawners only appear for ai
            if (this.gameState.getCharactersForTeamIndex(DEFAULT_HUMAN_TEAM_INDEX).length
                !== 0) {
                return;
            }
        }
        let winningTeam: string | null = null;
        let winningTeamIndex = -1;
        if (this.gameState.getEnemyCharacters().length === 0) {
            winningTeamIndex = this.gameState.currentTeamIndex;
            winningTeam = this.gameState.getActiveTeamName();
        }
        else if (this.gameState.getActiveSquad().length === 0) {
            winningTeam = this.gameState.getEnemyTeamName();
            winningTeamIndex =
                (1 + this.gameState.currentTeamIndex) % this.gameSettings.numTeams;
        }
        if (winningTeam != null) {
            this.setGameOver(
                winningTeamIndex,
                `${winningTeam} has elimanted all oponents.`);
        }
    }

    private checkCharacterTurnOver(): void {
        if (this.gameState.selectedCharacter!.isTurnOver()) {
            this.onCharacterTurnOver();
        } else {
            this.setSelectedCharacterState(SelectedCharacterState.AWAITING);
        }
    }

    /** 
     * Checks if there's another squad 
     * member still active, or advances turn if not. 
     * */
    private onCharacterTurnOver(): void {
        const squad = this.gameState.getActiveSquad();
        const activeSquadMember = squad.find((character: Character) => {
            return !character.isTurnOver() && character.isAlive();
        });
        if (activeSquadMember) {
            this.setSelectedCharacter(activeSquadMember.index);
        } else {
            this.nextTurn();
        }
    }

    // MUTATE
    private nextTurn(): void {
        if (this.gameState.gamePhase === GamePhase.CHARACTER_PLACEMENT) {
            if (this.gameState.currentTeamIndex + 1 < this.gameSettings.numTeams) {
                this.gameState.currentTeamIndex += 1;
                this.initCharacterPlacementTurn();
            } else {
                this.gameState.gamePhase = GamePhase.COMBAT;
                this.advanceToNextCombatTurn();
            }
        } else {
            this.advanceToNextCombatTurn();
        }

        if (!this.isAiTurn()) {
            this.initControlsForGameState();
            return;
        }
    }

    private isAiTurn(): boolean {
        if (this.isGameOver) {
            return false;
        }
        return this.teamIndexToIsAi[this.gameState.currentTeamIndex];
    }

    private initCharacterPlacementTurn(): void {
        this.gameState.selectableTiles =
            this.getAvailableTilesForCharacterPlacement();
        const teamName = this.gameState.getActiveTeamName();
        const teamMaxSquadSize = this.gameSettings.teamIndexToSquadSize
            .get(this.gameState.currentTeamIndex)!;
        this.hud.setText(
            `${teamName} team turn`, TextType.TITLE, Duration.LONG);
        this.hud.setText(
            `Place squad members (${teamMaxSquadSize} remaining) `,
            TextType.SUBTITLE,
            Duration.LONG);
    }

    private initControlsForGameState(): void {
        const isAi = this.teamIndexToIsAi[this.gameState.currentTeamIndex];
        if (isAi) {
            return;
        }
        if (this.gameState.gamePhase === GamePhase.CHARACTER_PLACEMENT) {
            this.clickHandler = {
                onClick: (tile: Point) => {
                    this.tryPlacingCharacter(tile);
                }
            };
            return;
        }
    }

    private advanceToNextCombatTurn(): void {
        // Spawn at end of turns.
        for (const spawner of this.gameState.spawners) {
            if (spawner.teamIndex === this.gameState.currentTeamIndex) {
                spawner.advanceTurn();
                const newCharacterIndex =
                    this.gameState.characters
                        .filter((character) =>
                            character.teamIndex === this.gameState.currentTeamIndex).length;
                if (spawner.checkAndHandleRespawn()) {
                    const character = new Character({
                        startCoords: spawner.tileCoords,
                        teamIndex: this.gameState.currentTeamIndex,
                        index: newCharacterIndex,
                        settings: this.selectedCharacterSettings,
                        gameDelegate: this.gameDelegate,
                    });
                    this.gameState.characters.push(character);
                }
            }
        }

        this.gameState.currentTeamIndex =
            (this.gameState.currentTeamIndex + 1) % this.gameSettings.numTeams;
        const squad = this.gameState.getActiveSquad();
        if (squad.length === 0) {
            this.advanceToNextCombatTurn();
            return;
        }
        for (const character of squad) {
            character.resetTurnState();
        }
        const teamName = this.gameState.getActiveTeamName();
        this.setSelectedCharacter(this.gameState.getFirstCharacterIndex());
        this.hud.setText(
            `${teamName} team turn`, TextType.TITLE, Duration.LONG);
        this.hud.setText(
            `Move squad members`,
            TextType.SUBTITLE,
            Duration.LONG);
    }

    private getCurrentTurnAi(): Ai {
        return this.ais
            .find((ai) => ai.teamIndex === this.gameState.currentTeamIndex)!;
    }

    private getGameState(): GameState {
        return this.gameState;
    }

    private addOnAnimationDoneCallback(callback: () => void): void {
        this.onAnimationDone = callback;
        this.controlMap.clear();
        this.addDefaultControls();
        this.clickHandler = null;
    }

    private handleCharacterMovement(toTile: Point): void {
        const character = this.gameState.selectedCharacter!;
        const manhattandDistanceAway =
            character.tileCoords.manhattanDistanceTo(toTile);
        if (manhattandDistanceAway > character.settings.maxMovesPerTurn) {
            throw new Error(`Invalid character movement location (too far): ` +
                `start: ${character.tileCoords.toString()}, ` +
                `end: ${toTile.toString()}`);
        }
        const tilePath =
            this.gameState.getPath({ from: character.tileCoords, to: toTile });
        const targets: Target[] =
            mapTilePathToTargetsPath(character.tileCoords, tilePath);
        const enemyFlag = this.gameState.getEnemyFlag();
        const characterHasFlag =
            character.tileCoords.equals(enemyFlag.tileCoords);
        character.moveTo(toTile, targets);
        this.addOnAnimationDoneCallback(() => {
            if (enemyFlag.tileCoords
                .equals(this.gameState.getActiveTeamFlag().tileCoords)) {
                this.setGameOver(
                    this.gameState.currentTeamIndex,
                    `${this.gameState.getActiveTeamName()} team has snagged ` +
                    `the flag.`);
                return;
            }
            this.checkCharacterTurnOver();
        });

        if (characterHasFlag) {
            enemyFlag.setIsTaken(() => {
                return character.animationState.currentCenterCanvas
                    .subtract(Grid.HALF_TILE);
            });
            enemyFlag.tileCoords = toTile;

        } else if (enemyFlag.tileCoords.equals(toTile)) {
            this.hud.setText(
                `${this.gameState.getActiveTeamName()} team has taken ` +
                `the flag.`,
                TextType.SUBTITLE,
                Duration.SHORT);
        }
    }

    // TODO - something doesn't work here in campaign mode.
    private setGameOver(winningTeamIndex: number, subtitle: string): void {
        this.controlMap.clear();
        this.togglePause();
        this.isGameOver = true;
        this.winningTeamIndex = winningTeamIndex;
        this.hud.setText(
            `Game over`,
            TextType.TITLE,
            Duration.LONG);
        this.hud.setText(
            `${subtitle}`,
            TextType.SUBTITLE,
            Duration.LONG);
        const quitKeyString = CONTROLS.getStringForKey(QUIT_KEY);
        const restartKey = CONTROLS.getStringForKey(RESTART_KEY);
        this.hud.setText(
            `Press ${quitKeyString} to quit, ${restartKey} to restart`,
            TextType.TOAST,
            Duration.LONG);
    }

    private fireShot(shotInfo: ShotInfo): void {
        const ray = getRayForShot(shotInfo);
        const numRicochets =
            shotInfo.projectileDetails.type === ProjectileDetailsType.BULLET
                ? shotInfo.projectileDetails.numRicochets
                : 0;
        const targetsPath = getProjectileTargetsPath({
            ray,
            startingTileCoords: shotInfo.fromTileCoords,
            fromTeamIndex: shotInfo.fromTeamIndex,
            numRicochets,
            characters: this.gameState.getAliveCharacters(),
            obstacles: this.gameState.obstacles,
        });
        this.projectiles.push(new Projectile({
            context: this.context,
            projectileDetails: shotInfo.projectileDetails,
            targets: targetsPath,
            fromTeamIndex: shotInfo.fromTeamIndex,
        }));
    }

    private throwGrenade(details: {
        tile: Point;
        splashDamage: SplashDamage
    }): void {
        const fromTile = this.gameState.selectedCharacter!.tileCoords;
        const fromCanvasCoords =
            Grid.getCanvasFromTileCoords(fromTile).add(Grid.HALF_TILE);
        const targetTile = details.tile;
        const targetCanvasCoords =
            Grid.getCanvasFromTileCoords(targetTile).add(Grid.HALF_TILE);
        const direction =
            targetCanvasCoords.subtract(fromCanvasCoords).normalize();
        const ray = new Ray(fromCanvasCoords, direction);
        const target: Target = {
            canvasCoords: targetCanvasCoords,
            ray,
            tile: targetTile,
            maxDistance: targetCanvasCoords.distanceTo(fromCanvasCoords),
        };
        const shotInfo: ShotInfo = {
            fromTeamIndex: this.gameState.selectedCharacter!.teamIndex,
            fromCanvasCoords,
            fromTileCoords: fromTile,
            aimAngleRadiansClockwise: direction.getPointRotationRadians(),
            projectileDetails: details.splashDamage,
        };
        const proj = new Projectile({
            context: this.context,
            projectileDetails: shotInfo.projectileDetails,
            targets: [target],
            fromTeamIndex: shotInfo.fromTeamIndex,
        });
        this.projectiles.push(proj);
    }

    private tryPlacingCharacter(tileCoords: Point): void {
        if (!this.gameState.selectableTiles
            .find((tile) => tile.equals(tileCoords))) {
            this.hud.setText(
                `Can't place character here`,
                TextType.TOAST, Duration.SHORT);
            return;
        }

        const placeCharacterAction: SelectTileAction = {
            type: ActionType.SELECT_TILE,
            tile: tileCoords,
        };
        this.onAction(placeCharacterAction);
    }

    private tryMovingSelectedCharacter(tileCoords: Point): void {
        if (!this.gameState.selectableTiles
            .find((tile) => tile.equals(tileCoords))) {
            this.hud.setText(
                `Can't move character here`,
                TextType.TOAST, Duration.SHORT);
            return;
        }

        const selectTileAction: SelectTileAction = {
            type: ActionType.SELECT_TILE,
            tile: tileCoords,
        };
        this.onAction(selectTileAction);
    }

    private trySelectingCharacter(tileCoords: Point): void {
        const squad = this.gameState.getActiveSquad();
        const squadMemeberAtTile =
            squad.find((character) => character.tileCoords.equals(tileCoords));
        if (squadMemeberAtTile && !squadMemeberAtTile.isTurnOver()) {
            const selectCharacterAction: SelectCharacterAction = {
                type: ActionType.SELECT_CHARACTER,
                characterIndex: squadMemeberAtTile.index,
            };
            this.onAction(selectCharacterAction);
        }
    }

    private tryThrowingGrenade(tileCoords: Point): void {
        if (!this.gameState.selectableTiles
            .find((tile) => tile.equals(tileCoords))) {
            this.hud.setText(
                `Can't throw grenade here`, TextType.TOAST, Duration.SHORT);
            return;
        }
        const action: SelectTileAction = {
            type: ActionType.SELECT_TILE,
            tile: tileCoords,
        };
        this.onAction(action);
    }

    private getAvailableTilesForCharacterPlacement(): Point[] {
        const flagCoords = this.gameState.getActiveTeamFlag().tileCoords;
        const maxDistFromFlag = this.gameSettings.maxSpawnDistanceFromFlag;
        const availableTiles = bfs({
            startTile: flagCoords,
            maxDepth: maxDistFromFlag,
            isAvailable: (tile: Point): boolean => {
                return !this.isTileOccupied(tile) && !tile.equals(flagCoords);
            },
            canGoThrough: (tile: Point): boolean => {
                // Can go through other players, just not obstacles.
                return !this.gameState.tileHasObstacle(tile);
            },
        });
        return availableTiles;
    }

    private getAvailableTilesForCharacterMovement(): Point[] {
        if (this.gameState.selectedCharacter == null) {
            throw new Error(
                `No character selected in getAvailableTilesForCharacterMovement`);
        }
        const ownFlagCoords =
            this.gameState.getActiveTeamFlag().tileCoords;
        const currentCoords =
            this.gameState.selectedCharacter.tileCoords;
        const maxMoves =
            this.gameState.selectedCharacter.settings.maxMovesPerTurn;
        const isAvailable = (tile: Point): boolean => {
            return !this.isTileOccupied(tile)
                && (!tile.equals(ownFlagCoords)
                    || this.gameState.selectedCharacter!.tileCoords
                        .equals(this.gameState.getEnemyFlag().tileCoords));
        };
        const canGoThrough = (tile: Point): boolean => {
            // Characters can go through tiles occupied by squad members.
            // but they can't stop there.
            return isAvailable(tile)
                || this.gameState.isSquadMemberAtTile(tile);
        };
        const availableTiles = bfs({
            startTile: currentCoords,
            maxDepth: maxMoves,
            isAvailable,
            canGoThrough,
        });
        return availableTiles;
    }

    private getAvailableTilesForThrowingGrenade(): Point[] {
        if (this.gameState.selectedCharacter == null) {
            throw new Error(
                `No character selected in getAvailableTilesForCharacterMovement`);
        }
        const ownFlagCoords = this.gameState.getActiveTeamFlag();
        const currentCoords = this.gameState.selectedCharacter.tileCoords;
        const maxDist = this.gameState.selectedCharacter.
            getGrenadeAbility().maxManhattanDistance;
        const isAvailable = (tile: Point): boolean => {
            return !this.gameState.tileHasObstacle(tile)
                && !tile.equals(currentCoords)
                && !this.gameState.isSquadMemberAtTile(tile);
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

    // MUTATE
    private setSelectedCharacter(index: number): void {
        const character = this.gameState.getActiveSquad()
            .find((character) => character.index === index)!;
        if (character.isTurnOver()) {
            this.hud.setText(
                `Unit ${index + 1}'s turn is over.`,
                TextType.TOAST, Duration.SHORT);
            return;
        }
        this.gameState.selectedCharacter = character;
        this.setSelectedCharacterState(SelectedCharacterState.AWAITING);
    }

    // MUTATE
    private setSelectedCharacterState(state: SelectedCharacterState) {
        if (this.gameState.selectedCharacter == null) {
            throw new Error(
                `There needs to be a selected character ` +
                `before calling setSelectedCharacterState`);
        }
        this.gameState.selectedCharacterState = state;
        this.controlMap.clear();
        this.clickHandler = null;
        this.addDefaultControls();
        this.addSwitchSquadMemberControls();

        this.controlMap.add({
            key: END_TURN_KEY,
            name: 'End character turn',
            func: () => {
                if (this.gameState.selectedCharacter == null) {
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
                this.gameState.selectableTiles = [];
                this.gameState.selectedCharacter.cancelAiming();
                if (!this.gameState.selectedCharacter.hasMoved) {
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
                if (this.gameState.selectedCharacter.canShoot()) {
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
                for (const extraAbility of
                    this.gameState.selectedCharacter.extraAbilities) {
                    switch (extraAbility.abilityType) {
                        case CharacterAbilityType.HEAL:
                            this.controlMap.add({
                                key: HEAL_KEY,
                                name: 'Heal',
                                func: () => {
                                    const healAction: HealAction = {
                                        type: ActionType.HEAL,
                                        healAmount: extraAbility.healAmount,
                                    };
                                    this.onAction(healAction);
                                },
                                eventType: EventType.KeyPress,
                            });
                            break;
                        case CharacterAbilityType.THROW_GRENADE:
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
                this.gameState.selectableTiles =
                    this.getAvailableTilesForCharacterMovement();
                this.clickHandler = {
                    onClick: (tile: Point) => {
                        this.tryMovingSelectedCharacter(tile);
                    },
                };
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
                this.gameState.selectedCharacter.startAiming();
                this.controlMap.add({
                    key: TOGGLE_AIM_KEY,
                    name: 'Stop Aiming',
                    func: () => {
                        if (this.gameState.selectedCharacter == null) {
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
                        if (this.gameState.selectedCharacter == null) {
                            throw new Error(
                                `There's no selected character when aiming CCW.`);
                        }
                        const newAim =
                            this.gameState.selectedCharacter.getAim()
                            - AIM_ANGLE_RADIANS_DELTA;
                        const aimAction: AimAction = {
                            type: ActionType.AIM,
                            aimAngleClockwiseRadians: newAim,
                        }
                        this.onAction(aimAction);
                    },
                    eventType: EventType.KeyDown,
                });
                this.controlMap.add({
                    key: AIM_CLOCKWISE_KEY,
                    name: 'Aim clockwise',
                    func: () => {
                        if (this.gameState.selectedCharacter == null) {
                            throw new Error(
                                `There's no selected character when aiming CC.`);
                        }
                        const newAim =
                            this.gameState.selectedCharacter.getAim()
                            + AIM_ANGLE_RADIANS_DELTA;
                        const aimAction: AimAction = {
                            type: ActionType.AIM,
                            aimAngleClockwiseRadians: newAim,
                        }
                        this.onAction(aimAction);
                    },
                    eventType: EventType.KeyDown,
                });
                this.controlMap.add({
                    key: SHOOT_KEY,
                    name: 'Fire',
                    func: () => {
                        if (this.gameState.selectedCharacter == null) {
                            throw new Error(
                                `There's no selected character when canceling shooting.`);
                        }
                        const fireAction: ShootAction = {
                            type: ActionType.SHOOT,
                        };
                        this.onAction(fireAction);
                    },
                    eventType: EventType.KeyPress,
                });
                break;
            case SelectedCharacterState.THROWING_GRENADE:
                this.gameState.selectableTiles =
                    this.getAvailableTilesForThrowingGrenade();
                this.clickHandler = {
                    onClick: (tile: Point) => {
                        this.tryThrowingGrenade(tile);
                    },
                };
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

        // TODO - very hackE.
        // should separate game state update from control update :O
        if (this.isAiTurn()) {
            this.controlMap.clear();
            this.addDefaultControls();
            this.clickHandler = null;
        }
    }

    /** 
     * Whether a tile contains an obstacle or character. 
     * Tiles with flags are NOT considered occupied. 
     */
    private isTileOccupied(tileCoords: Point): boolean {
        const potentialObstacle = this.gameState.obstacles.find(
            (obstacle: Obstacle) => obstacle.tileCoords.equals(tileCoords));
        const potentialCharacter =
            this.gameState.getAliveCharacters()
                .find((character) => {
                    return character.isAlive()
                        && character.tileCoords.equals(tileCoords);
                });
        const potentialSpawner = this.gameState.spawners
            .find((spawner) => spawner.tileCoords.equals(tileCoords));
        return potentialObstacle != null
            || potentialCharacter != null
            || potentialSpawner != null;
    }

    // MUTATE
    private resetGame = (): void => {
        this.destroy();
        this.gameState = new GameState(this.gameSettings);
        this.loadLevel();
        this.isGameOver = false;
        this.isPaused = false;
        this.winningTeamIndex = -1;
        this.gameState.gamePhase = GamePhase.CHARACTER_PLACEMENT;
        this.gameState.characters = [];
        this.projectiles = [];
        this.particleSystems = [];
        this.ais = [];
        this.teamIndexToIsAi = [];
        const matchType = this.gameSettings.matchType;
        for (let i = 0; i < this.gameSettings.numTeams; i++) {
            let isAi = i !== 0;
            if (matchType === MatchType.AI_VS_AI) {
                isAi = true;
            } else if (matchType === MatchType.PLAYER_VS_PLAYER_LOCAL) {
                isAi = false;
            }
            this.teamIndexToIsAi.push(isAi);
            if (isAi) {
                this.ais.push(new Ai({
                    teamIndex: i,
                    difficulty: this.gameState.settings.aiDifficulty,
                }));
            }
        }
        this.controlMap = new ControlMap();
        this.addDefaultControls();
        this.addCharacterClassControls();
        this.hud = new Hud(this.context);
        this.hud.setControlMap(this.controlMap);

        // 0th team goes first...
        this.gameState.currentTeamIndex = -1;
        this.nextTurn();
    }

    private loadLevel(): void {
        const level = LEVELS[this.levelIndex];
        const blueFlag = new Flag({
            tileCoords: pointFromSerialized(level.data.blueFlag),
            teamIndex: 0,
        });
        const redFlag = new Flag({
            tileCoords: pointFromSerialized(level.data.redFlag),
            teamIndex: 1,
        });
        this.gameState.flags = [blueFlag, redFlag];
        this.gameState.obstacles =
            level.data.obstacles.map((serializedPt) => {
                return new Obstacle(pointFromSerialized(serializedPt));
            });
        this.gameState.spawners = [];
        if (this.gameState.settings.hasSpawners) {
            const aiDifficultyToSpawnDelays = new Map([
                [AiDifficulty.WEAK, 8],
                [AiDifficulty.MEDIUM, 6],
                [AiDifficulty.STRONG, 5],
            ]);
            const params = {
                tileCoords: pointFromSerialized(level.aiSpawner),
                teamIndex: 1,
                turnsBetweenSpawns: aiDifficultyToSpawnDelays
                    .get(this.gameState.settings.aiDifficulty)!,
            };
            this.gameState.spawners.push(new Spawner(params));
        }
    }

    private addDefaultControls(): void {
        this.controlMap.add({
            key: PAUSE_KEY,
            name: 'Pause',
            func: () => { this.togglePause(); },
            eventType: EventType.KeyPress,
        });
        this.controlMap.add({
            key: Key.QUESTION_MARK,
            name: 'Show/Hide controls',
            func: () => { this.hud.toggleShowControlMap(); },
            eventType: EventType.KeyPress,
        });
    }

    private togglePause(): void {
        this.isPaused = !this.isPaused;
        if (this.isPaused) {
            this.addQuitAndRestartControls();
            this.hud.setText(
                'PAUSED',
                TextType.TITLE,
                Duration.SHORT
            );
            this.hud.setText(
                `Press ${CONTROLS.getStringForKey(QUIT_KEY)} to quit;` +
                ` ${CONTROLS.getStringForKey(RESTART_KEY)} to restart`,
                TextType.TOAST,
                Duration.SHORT,
            );
            this.hud.setControlMap(new ControlMap());
        } else {
            this.hud.clearText(TextType.TITLE);
            this.hud.clearText(TextType.TOAST);
            this.controlMap.remove(QUIT_KEY);
            this.controlMap.remove(RESTART_KEY);
            this.hud.setControlMap(this.controlMap);
        }
    }

    private addQuitAndRestartControls(): void {
        this.controlMap.add({
            key: QUIT_KEY,
            name: 'Quit',
            func: () => {
                this.onExitGameCallback(this.winningTeamIndex);
            },
            eventType: EventType.KeyPress,
        });
        this.controlMap.add({
            key: RESTART_KEY,
            name: 'Restart',
            func: this.resetGame,
            eventType: EventType.KeyPress,
        });
    }

    private addCharacterClassControls(): void {
        for (const key of keysToCharacterClassType.keys()) {
            const characterClassType = keysToCharacterClassType.get(key)!;
            this.controlMap.add({
                key,
                name: characterClassType,
                func: () => {
                    const selectCharacterClassAction:
                        SelectCharacterClassAction = {
                        type: ActionType.SELECT_CHARACTER_CLASS,
                        class: CHARACTER_CLASSES.find((settings) => {
                            return settings.type === characterClassType;
                        })!
                    };
                    this.onAction(selectCharacterClassAction);
                },
                eventType: EventType.KeyPress,
            });
        }

    }

    private addSwitchSquadMemberControls(): void {
        const squad = this.gameState.getActiveSquad();
        this.clickHandler = {
            onClick: (tile: Point) => {
                this.trySelectingCharacter(tile);
            },
        };
        // TODO - use tab instead of number for squad toggle controls.
        for (const character of squad) {
            if (character.index >= 9) {
                continue;
            }
            // Use 1-based numbers for UI.
            const characterNumber = character.index + 1;
            const key = numberToKey.get(characterNumber);
            if (key == null) {
                throw new Error(`Not enough keys for all character numbers!`);
            }
            this.controlMap.add({
                key,
                name: `Select ${numberToOrdinal.get(characterNumber)} character`,
                func: () => {
                    const selectCharacterAction: SelectCharacterAction = {
                        type: ActionType.SELECT_CHARACTER,
                        characterIndex: character.index,
                    };
                    this.onAction(selectCharacterAction);
                },
                eventType: EventType.KeyPress,
            });
        }
    }
}

function mapTilePathToTargetsPath(
    startTile: Point, tilePath: Point[]): Target[] {
    const targets: Target[] = [];
    let curTile = startTile;
    const tileToCanvas = (tile: Point) =>
        Grid.getCanvasFromTileCoords(tile).add(Grid.HALF_TILE);
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
import { Action, MoveCharacterAction, ActionType } from 'src/app/actions';
import { Point } from 'src/app/math/point';

export class Ai {

    getActionForGameState(): Action {
        const moveAction: MoveCharacterAction = {
            type: ActionType.MOVE_CHARACTER,
            tileCoords: new Point(0, 0),
        };
        return moveAction;
    }
}
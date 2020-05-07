import { Point } from 'src/app/math/point';

/** All points in canvas space. */
export interface AnimationState {
    readonly movementSpeedMs: number;
    isAnimating: boolean;
    /** Current center of animated object. */
    currentCenterCanvas: Point;
    /** Location the animated object is heading towards. */
    targetCoords?: Point;
    /** 
     * Upon reaching `targetCoords`, object will start 
     * moving towards next element in this list. 
     */
    remainingTargetCoords: Point[];
}
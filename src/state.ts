import {
    Action,
    Bit,
    Constants,
    State,
    FallingTarget,
    Target,
    RandomTargetData,
} from "./types";

import { RNG, scaleToRange } from "./util";
import { Viewport } from "./types";

export const initialState: State = {
    gameEnd: false,
    speed: Constants.INITIAL_SPEED,
    bits: Array.from({ length: Constants.DIGIT_COUNT }, (): Bit => 0),
    targets: [],
    exit: [],
    score: 0,
    nextId: 0,
};

const reachedCheckLine = (t: FallingTarget): boolean =>
    t.y + Target.HEIGHT >= Constants.CHECK_LINE;
/**
 * All tick-based movement comes through this function.
 */
const moveTarget =
    (speed: number) =>
    (t: FallingTarget): FallingTarget => ({
        ...t,
        y: t.y + speed,
    });

/*
Tick logic
*/
export class Tick implements Action {
    apply = (s: State): State => (s.gameEnd ? s : Tick.step(s));

    private static step = (s: State): State => {
        const speed = s.speed + Constants.SPEED_INC;
        const moved = s.targets.map(moveTarget(speed));
        const crossed = moved.filter(reachedCheckLine);

        return {
            ...s,
            speed,
            targets: moved,
            exit: [],
            gameEnd: crossed.length > 0,
        };
    };
}

const flip = (b: Bit): Bit => (b === 0 ? 1 : 0);

export class ToggleBitAt implements Action {
    constructor(public readonly index: number) {}

    apply(s: State): State {
        return s.gameEnd || this.index < 0 || this.index >= s.bits.length
            ? s
            : {
                  ...s,
                  bits: s.bits.map((b, i) => (i === this.index ? flip(b) : b)),
              };
    }
}

export const generateRandomTargetData = (seed: number): RandomTargetData => {
    const maxX = Viewport.CANVAS_WIDTH - Target.WIDTH;

    const seed1 = RNG.hash(seed);
    const x = Math.floor(scaleToRange(0, maxX)(RNG.scale(seed1)));

    const seed2 = RNG.hash(seed1);
    const value = Math.min(
        Constants.MAX_VALUE - 1,
        Math.floor(scaleToRange(0, Constants.MAX_VALUE)(RNG.scale(seed2))),
    );

    const seed3 = RNG.hash(seed2);
    const delay = Math.floor(scaleToRange(1000, 3000)(RNG.scale(seed3)));

    return { x, value, delay, nextSeed: seed3 };
};

export const reduceState = (s: State, action: Action): State => action.apply(s);

import {
    Action,
    Bit,
    Constants,
    State,
    FallingTarget,
    Target,
    RandomTargetData,
    DEFAULT_BASE,
    SUPPORTED_BASES,
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
    base: DEFAULT_BASE,
    multiplier: 1,
};

// Maps slider index to supported base, if out of bounds then falling back to default
export const baseFromIndex = (i: number): number =>
    SUPPORTED_BASES[i] ?? DEFAULT_BASE;

export class ChangeBase implements Action {
    constructor(public readonly base: number) {}
    apply = (s: State): State => ({ ...s, base: this.base });
}

// Checks if the bottom edge of a target has hit the check line
const reachedCheckLine = (t: FallingTarget): boolean =>
    t.y + Target.HEIGHT >= Constants.CHECK_LINE;

/**
 * curried helper to update target y position based on current speed.
 */
const moveTarget =
    (speed: number) =>
    (t: FallingTarget): FallingTarget => ({
        ...t,
        y: t.y + speed,
    });

/*
* Tick logic
* - Ramps up falling speed, updates target positions, and checks collisions/matches.

*/
export class Tick implements Action {
    apply = (s: State): State => (s.gameEnd ? s : Tick.step(s));

    private static step = (s: State): State => {
        const speed = s.speed + Constants.SPEED_INC;
        const moved = s.targets.map(moveTarget(speed));

        return handleResolution({
            ...s,
            speed,
            targets: moved,
        });
    };
}

const flip = (b: Bit): Bit => (b === 0 ? 1 : 0);

/*
 * flips bit at index and checks if value matches target
 * ignores input if out of bounds or game is over
 *
 * handleResolution is called here:
 * - Checks target match immediately once keypress without waiting for next Tick.
 */
export class ToggleBitAt implements Action {
    constructor(public readonly index: number) {}

    apply(s: State): State {
        return s.gameEnd || this.index < 0 || this.index >= s.bits.length
            ? s
            : handleResolution({
                  ...s,
                  bits: s.bits.map((b, i) => (i === this.index ? flip(b) : b)),
              });
    }
}

/**
 * Generates deterministic spawn parameters for a new target from a single seed.
 *
 * Hashes the seed step-by-step to get 3 independent random values.
 * x: Random horizontal position clamped within canvas bounds.
 * value: Random target number in range [0, 255].
 * delay: Random spawn interval between 1000ms - 3000ms.
 * nextSeed: Passes seed3 forward so the next target continues the RNG.
 */
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

/**
 * Action that spawns a new falling target at top of the screen.
 * Appends the new target with a unique incrementing string ID.
 */
export class SpawnTarget implements Action {
    constructor(public readonly data: RandomTargetData) {}

    apply = (s: State): State =>
        s.gameEnd ? s : SpawnTarget.step(s, this.data);

    private static step = (s: State, d: RandomTargetData): State => ({
        ...s,
        targets: [
            ...s.targets,
            { id: String(s.nextId), value: d.value, x: d.x, y: 0 },
        ],
        nextId: s.nextId + 1,
    });
}

/**
 * Converts an 8-bit array to decimal (0-255)
 */
export const bitsToValue = (bits: ReadonlyArray<Bit>): number =>
    bits.reduce<number>((acc, bit) => acc * 2 + bit, 0);

/**
 * Checks the if the lowest target touch the checkLine.
 *
 * - Match: Pops target, adds to exit queue, adds score, and resets bits to 0.
 * - Crossed line: Ends the game if the lowest target hits the check line.
 */
const handleResolution = (s: State): State => {
    if (s.targets.length === 0) return s;
    const lowest = s.targets[0];

    const matched = bitsToValue(s.bits) === lowest.value;
    const crossed = reachedCheckLine(lowest);

    return matched
        ? {
              ...s,
              targets: s.targets.slice(1),
              exit: s.exit.concat([lowest]),
              score: s.score + s.multiplier,
              bits: s.bits.map((): Bit => 0),
          }
        : crossed
          ? { ...s, gameEnd: true }
          : s;
};

// Updates current score multiplier from bonus stream (ignored if game is over)
export class setMultiplier implements Action {
    constructor(public readonly multiplier: number) {}
    apply(s: State): State {
        return s.gameEnd ? s : { ...s, multiplier: this.multiplier };
    }
}

/**
 * Root state reducer applying the given action to state.
 *
 * - Clears s.exit on each action so removed targets are only kept for one frame.
 */
export const reduceState = (s: State, action: Action): State =>
    action.apply({ ...s, exit: [] });

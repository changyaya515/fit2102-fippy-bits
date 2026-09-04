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
    VALUE_RANGE,
} from "./types";
import { RNG, scaleToRange } from "./util";
import { Viewport } from "./types";

/**
 * Initial game state and seed for `scan`.
 * `bonus` defaults to 1  because every match is worth at least one point.
 */
export const initialState: State = {
    gameEnd: false,
    speed: Constants.INITIAL_SPEED,
    bits: Array.from({ length: Constants.DIGIT_COUNT }, (): Bit => 0),
    targets: [],
    exit: [],
    score: 0,
    nextId: 0,
    base: DEFAULT_BASE,
    bonus: 1,
};

// Maps slider index to supported base, if out of bounds then falling back to default
export const baseFromIndex = (i: number): number =>
    SUPPORTED_BASES[i] ?? DEFAULT_BASE;

/**
 * Changes the display base.
 *
 * Has no `gameEnd` guard because it affects presentation only, so the player is
 * still allowed to switch base on the game over screen to inspect the value they missed.
 */
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
 * - Accelerates game speed, moves all targets down, and resolves the lowest one.
 * - Frozen once `gameEnd` is true, stopping game progress without tearing down streams.
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

/**
 * Flips the bit at `index` and immediately check for a match.
 *
 * - Ignores invalid indices and inputs after game over, so callers don't need
 *   to do bounds checking.
 * - Resolves directly on input instead of waiting next Tick, giving instant feedback.
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
 * Hashes the seed sequentially to derive 3 random values:
 * - x: Horizontal position within canvas bounds.
 * - value: Target number in range [0, 255].
 * - delay: Spawn delay between 1000ms - 3000ms.
 * - nextSeed: Advances RNG state using seed3 for the next spawn.
 */
export const generateRandomTargetData = (seed: number): RandomTargetData => {
    const maxX = Viewport.CANVAS_WIDTH - Target.WIDTH;

    const seed1 = RNG.hash(seed);
    const x = Math.floor(scaleToRange(0, maxX)(RNG.scale(seed1)));

    const seed2 = RNG.hash(seed1);
    const value = Math.min(
        VALUE_RANGE - 1,
        Math.floor(scaleToRange(0, VALUE_RANGE)(RNG.scale(seed2))),
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
 * Resolves the lowest target against current player input and check line.
 *
 * - Match: the target is dropped, queued in `exit` for the view to delete,
 *   the current bonus is added to the score, and the bit row resets to zero.
 * - Crossed line: the game ends.
 *
 * All targets share one global speed and are appended in spawn
 * order, so targets[0] is always the lowest (closest to the check line).
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
              score: s.score + s.bonus,
              bits: s.bits.map((): Bit => 0),
          }
        : crossed
          ? { ...s, gameEnd: true }
          : s;
};

/**
 * Sets the additive score bonus produced by the decay stream.
 * Ignored once the game is over, so a bonus window cannot outlive the run.
 */
export class SetBonus implements Action {
    constructor(public readonly bonus: number) {}
    apply(s: State): State {
        return s.gameEnd ? s : { ...s, bonus: this.bonus };
    }
}

/**
 * Root state reducer applying the given action to state.
 *
 * - Clears s.exit on each action so removed targets are only kept for one frame.
 */
export const reduceState = (s: State, action: Action): State =>
    action.apply({ ...s, exit: [] });

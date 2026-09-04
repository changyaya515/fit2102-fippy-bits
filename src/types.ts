export type Bit = 0 | 1;

export const Constants = {
    DIGIT_COUNT: 8,
    TICK_RATE_MS: 16, // One Tick per frame; drives all falling motion
    SEED: 1234,
    SPEED_INC: 0.0005, // Added to speed each tick (acceleration)
    INITIAL_SPEED: 0.005,
    CHECK_LINE: 300, // Y coordinate a target must be matched before
    DEFAULT_BASE_INDEX: 3, // Index 3 points to Base 16 (Hexadecimal)
    BONUS_DURATION: 4, // Countdown length in seconds
    INITIAL_BONUS: 4, // Starting bonus points when Space is triggered
} as const;

/** Available number bases for game targets (Binary, Octal, Decimal, Hex). */
export const SUPPORTED_BASES = [2, 8, 10, 16] as const;
export const DEFAULT_BASE = SUPPORTED_BASES[Constants.DEFAULT_BASE_INDEX];

/**
 * Total possible values representable by the bit row (2^DIGIT_COUNT = 256).
 * Design Choice: Derived from DIGIT_COUNT so changing bit length updates the range automatically.
 */
export const VALUE_RANGE = 2 ** Constants.DIGIT_COUNT;

/** Canvas dimensions for SVG viewport. */
export const Viewport = {
    CANVAS_WIDTH: 600,
    CANVAS_HEIGHT: 400,
} as const;

/** Dimensions for target cards rendered on screen. */
export const Target = {
    WIDTH: 64,
    HEIGHT: 36,
} as const;

/**
 * Represents a live falling target currently active on screen.
 */
export type FallingTarget = Readonly<{
    id: string;
    value: number;
    x: number;
    y: number;
}>;

/**
 * All the generated data needed to create the next falling target.
 * Includes its starting position (x), value, how long to wait (delay),
 * and the next random seed to keep generating future targets.
 */
export type RandomTargetData = Readonly<{
    x: number;
    value: number;
    delay: number;
    nextSeed: number;
}>;

// State processing
export type State = Readonly<{
    gameEnd: boolean;
    speed: number;
    bits: ReadonlyArray<Bit>;
    targets: ReadonlyArray<FallingTarget>;
    exit: ReadonlyArray<FallingTarget>; // For target that need to remove
    score: number;
    nextId: number;
    base: number;
    bonus: number;
}>;

/**
 * Base interface for state mutations.
 * Every action (like clicking a bit, a timer tick, or spawning a target)
 * receives the current state and returns an updated state.
 */
export interface Action {
    apply(s: State): State;
}

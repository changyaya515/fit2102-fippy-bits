export type Bit = 0 | 1;

export const Constants = {
    DIGIT_COUNT: 8,
    TICK_RATE_MS: 16, // Might need to change this!
    SEED: 1234,
    SPEED_INC: 0.0015,
    INITIAL_SPEED: 0.015,
    MAX_VALUE: 256,
    CHECK_LINE: 300,
    DEFAULT_BASE_INDEX: 3,
    MAX_MULTIPLIER: 4,
    INITIAL_MULTIPLIER: 4,
} as const;

export const SUPPORTED_BASES = [2, 8, 10, 16] as const;
export const DEFAULT_BASE = SUPPORTED_BASES[Constants.DEFAULT_BASE_INDEX];

export const VALUE_RANGE = 2 ** Constants.DIGIT_COUNT;

export const Viewport = {
    CANVAS_WIDTH: 600,
    CANVAS_HEIGHT: 400,
} as const;

export const Target = {
    WIDTH: 64,
    HEIGHT: 36,
} as const;

export type FallingTarget = Readonly<{
    id: string;
    value: number;
    x: number;
    y: number;
}>;

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
    exit: ReadonlyArray<FallingTarget>; // For target that need to romove
    score: number;
    nextId: number;
    base: number;
    multiplier: number;
}>;

export interface Action {
    apply(s: State): State;
}

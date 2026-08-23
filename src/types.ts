export type Bit = 0 | 1;

export const Constants = {
    DIGIT_COUNT: 8,
    BASE: 16,
    TICK_RATE_MS: 16, // Might need to change this!
    SEED: 1234,
    SPEED_INC: 0.0015,
    INITIAL_SPEED: 1.2,
    MAX_VALUE: 256,
    CHECK_LINE: 300,
} as const;

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

// State processing
export type State = Readonly<{
    gameEnd: boolean;
    speed: number;
    bits: ReadonlyArray<Bit>;
    targets: ReadonlyArray<FallingTarget>;
    exit: ReadonlyArray<FallingTarget>; // For target that need to romove
    score: number;
    nextId: number;
}>;

export interface Action {
    apply(s: State): State;
}

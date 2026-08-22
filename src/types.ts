export type Bit = 0 | 1;

export const Constants = {
    DIGIT_COUNT: 8,
    BASE: 16,
    TICK_RATE_MS: 16, // Might need to change this!
    INITIAL_SEED: 1234,
    BASE_FALL_SPEED: 1,
    SPEED_STEP: 0.15,
    SPEED_RAMP_TICKS: 300,
    MAX_FALL_SPEED: 4,
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
    createTime: number;
    value: number;
    x: number;
    y: number;
}>;

// State processing
export type State = Readonly<{
    gameEnd: boolean;
    bits: ReadonlyArray<Bit>;
    targets: ReadonlyArray<FallingTarget>;
    exit: ReadonlyArray<FallingTarget>;
    score: number;
    tickCount: number;
    seed: number;
    nextId: number;
}>;

export interface Action {
    apply(s: State): State;
}

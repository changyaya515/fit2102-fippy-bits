export type Bit = 0 | 1;

export const Constants = {
    DIGIT_COUNT: 8,
    TICK_RATE_MS: 500, // Might need to change this!
    INITIAL_SEED: 1234,
} as const;

export const Viewport = {
    CANVAS_WIDTH: 600,
    CANVAS_HEIGHT: 400,
} as const;

export const Target = {
    WIDTH: 64,
    HEIGHT: 36,
} as const;

export type FallingTarget = Readonly<{
  id: string
  value: number
  x: number
  y: number
  createTime: number
}>

// State processing
export type State = Readonly<{
    gameEnd: boolean;
    bits: ReadonlyArray<Bit>;
    targets: ReadonlyArray<FallingTarget>;
    exit: ReadonlyArray<FallingTarget>;
    score: number;
    time: number;
    seed: number;
    nextId: number;
    tickCount: number
}>;

export interface Action {
    apply(s: State): State;
}


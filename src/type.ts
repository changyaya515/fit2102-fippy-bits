type Bit = 0 | 1;

export const Constants = {
    DIGIT_COUNT: 8,
    TICK_RATE_MS: 500, // Might need to change this!
    INITIAL_SEED: 1234,
} as const;


export type Target = Readonly<{
    id: string;
    value: number;
    x: number;
    y: number;
    createTime: number;
}>;

// State processing
export type State = Readonly<{
    gameEnd: boolean;
    bits: ReadonlyArray<Bit>;
    targets: ReadonlyArray<Target>;
    exit: ReadonlyArray<Target>;
    score: number;
    time: number;
    seed: number;
    nextId: number;
}>;

const initialState: State = {
    bits: Array.from({ length: Constants.DIGIT_COUNT }, (): Bit => 0),
    targets: [],
    exit: [],
    score: 0,
    time: 0,
    seed: Constants.INITIAL_SEED,
    nextId: 0,
    gameEnd: false,
};


export interface Action {
    apply(s: State): State;
}

class ToggleBitAt implements Action {
  constructor(public readonly index: number) {}

  apply(s: State): State {
    return s.gameEnd
      ? s
      : {
          ...s,
          bits: s.bits.map((bit, idx) =>
            idx === this.index ? ((1 - bit) as Bit) : bit
          ),
        };
  }
}
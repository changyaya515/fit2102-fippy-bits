import { Action, Bit, Constants, State, FallingTarget } from "./types";

export const createTarget = (
    idNum: number,
    createTime: number,
    value: number,
    x: number,
): FallingTarget => ({
    id: `target${idNum}`,
    createTime,
    value,
    x,
    y: 0,
});

/*
Tick logic
*/
export class Tick implements Action {
    constructor(public readonly step: number) {}
    apply = (s: State): State => ({
        ...s,
        tickCount: s.tickCount + 1,
    });
}

export const initialState: State = {
    gameEnd: false,
    bits: Array.from({ length: Constants.DIGIT_COUNT }, (): Bit => 0),
    targets: [createTarget(0, 0, 13, 100)],
    exit: [],
    score: 0,
    seed: Constants.INITIAL_SEED,
    nextId: 0,
    tickCount: 0,
};

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

export const reduceState = (s: State, action: Action): State => action.apply(s);

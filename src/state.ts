import { Action, Bit, Constants, State } from "./type";

/*
Cite from workshop 4
*/
export abstract class RNG {
    private static m = 0x80000000; 
    private static a = 1103515245;
    private static c = 12345;

    /**
     * Call `hash` repeatedly to generate the sequence of hashes.
     * @param seed 
     * @returns a hash of the seed
     */
    public static hash = (seed: number) => (RNG.a * seed + RNG.c) % RNG.m;

    /**
     * Takes hash value and scales it to the range [-1, 1]
     */
    public static scale = (hash: number) => (2 * hash) / (RNG.m - 1) - 1;
}


export const initialState: State = {
    gameEnd: false,
    bits: Array.from({ length: Constants.DIGIT_COUNT }, (): Bit => 0),
    targets: [],
    exit: [],
    score: 0,
    time: 0,
    seed: Constants.INITIAL_SEED,
    nextId: 0,
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
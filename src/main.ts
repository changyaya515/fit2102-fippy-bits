/**
 * Inside this file you will use the classes and functions from rx.js
 * to add visuals to the svg element in index.html, animate them, and make them interactive.
 *
 * Study and complete the tasks in observable exercises first to get ideas.
 *
 * Course Notes showing Asteroids in FRP: https://tgdwyer.github.io/asteroids/
 *
 * You will be marked on your functional programming style
 * as well as the functionality that you implement.
 *
 * Document your code!
 */

import "./style.css";

import {
    Observable,
    catchError,
    filter,
    exhaustMap,
    fromEvent,
    interval,
    map,
    expand,
    timer,
    merge,
    startWith,
    scan,
    switchMap,
    take,
} from "rxjs";

import { Action, Constants, State } from "./types";
import {
    initialState,
    reduceState,
    ToggleBitAt,
    Tick,
    generateRandomTargetData,
    SpawnTarget,
    baseFromIndex,
    ChangeBase,
    setMultiplier,
} from "./state";
import { render } from "./view";

/**
 * Recursively generates target spawn actions using a deterministic RNG seed.
 *
 * Design Choice:
 * - Uses `expand` instead of `interval` so each target can dynamically
 *   schedules the next timer based on its own calculated `delay`.
 * - Same seed gives the same targets, and it restarts cleanly on a new game.
 */

const spawn$ = (seed: number): Observable<Action> => {
    const first = generateRandomTargetData(seed);
    return timer(first.delay).pipe(
        map(() => first),
        expand(row => {
            const next = generateRandomTargetData(row.nextSeed);
            return timer(next.delay).pipe(map(() => next));
        }),
        map(row => new SpawnTarget(row)),
    );
};

const key$ = fromEvent<KeyboardEvent>(document, "keydown");

const fromKey = (keyCode: string, action: Action): Observable<Action> =>
    key$.pipe(
        filter(({ code }) => code === keyCode),
        map(() => action),
    );

const flipByKey$ = merge(
    ...Array.from({ length: Constants.DIGIT_COUNT }, (_, i) =>
        fromKey(`Digit${i + 1}`, new ToggleBitAt(i)),
    ),
);

// Listens for clicks on bit elements using the "data-index" HTML attribute
const flipByMouse$: Observable<Action> = fromEvent<MouseEvent>(
    document,
    "mousedown",
).pipe(
    map(e => (e.target as Element).getAttribute("data-index")),
    filter(index => index !== null),
    map(index => new ToggleBitAt(Number(index))),
);

// Updates the number base (2, 8, 10, 16) whenever the slider value changes
const slider = document.querySelector("#baseSlider") as HTMLInputElement;

const swapBase$: Observable<Action> = fromEvent<Event>(slider, "input").pipe(
    map(event => Number((event.target as HTMLInputElement).value)),
    map(baseFromIndex),
    map(b => new ChangeBase(b)),
);

/**
 * 4-second decaying score multiplier triggered by Spacebar (4x -> 3x -> 2x -> 1x).
 */
const decayingBonus$: Observable<Action> = fromEvent<KeyboardEvent>(
    document,
    "keydown",
).pipe(
    filter(event => event.code === "Space" && !event.repeat),
    switchMap(() =>
        timer(0, 1000).pipe(
            take(Constants.MAX_MULTIPLIER),
            map(
                decay =>
                    new setMultiplier(Constants.INITIAL_MULTIPLIER - decay),
            ),
        ),
    ),
);

/**
 * Main game loop.
 *
 * - switchMap cancels the active run on 'KeyR' and restarts from initialState.
 * - merge combines all user inputs and game timers into a single Action stream.
 * - scan runs reduceState on every Action to keep the game State continuously up to date.
 */
export const state$ = (): Observable<State> => {
    const restart$ = fromEvent<KeyboardEvent>(document, "keydown").pipe(
        filter((e: KeyboardEvent) => e.code === "KeyR"),
        startWith(null),
    );

    return restart$.pipe(
        switchMap(() => {
            const tick$: Observable<Action> = interval(
                Constants.TICK_RATE_MS,
            ).pipe(map(() => new Tick()));

            const targetSpawn$: Observable<Action> = spawn$(Constants.SEED);

            return merge(
                tick$,
                flipByKey$,
                flipByMouse$,
                targetSpawn$,
                swapBase$,
                decayingBonus$,
            ).pipe(scan(reduceState, initialState));
        }),
    );
};

// The following simply runs your main function on window load.  Make sure to leave it in place.
// You should not need to change this, beware if you are.
if (typeof window !== "undefined") {
    // Observable: wait for first user click
    const click$ = fromEvent(document.body, "mousedown").pipe(take(1));

    click$.pipe(switchMap(() => state$())).subscribe(render());
}

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

import {
    Action,
    Constants,
    State,
    Viewport,
    Target,
    FallingTarget,
} from "./types";
import { attr, isNotNullOrUndefined } from "./util";
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
    bitsToValue,
} from "./state";

/**
 * Updates the state by proceeding with one time step.
 *
 * @param s Current state
 * @returns Updated state
 */
const tick = (s: State) => s;

// Rendering (side effects)

/**
 * Brings an SVG element to the foreground.
 * @param elem SVG element to bring to the foreground
 */
const bringToForeground = (elem: SVGElement): void => {
    elem.parentNode?.appendChild(elem);
};

/**
 * Displays a SVG element on the canvas. Brings to foreground.
 * @param elem SVG element to display
 */
const show = (elem: SVGElement): void => {
    elem.setAttribute("visibility", "visible");
    bringToForeground(elem);
};

/**
 * Hides a SVG element on the canvas.
 * @param elem SVG element to hide
 */
const hide = (elem: SVGElement): void => {
    elem.setAttribute("visibility", "hidden");
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

export const flipByMouse$: Observable<Action> = fromEvent<MouseEvent>(
    document,
    "mousedown",
).pipe(
    map(e => (e.target as Element).getAttribute("data-index")),
    filter(index => index !== null),
    map(index => new ToggleBitAt(Number(index))),
);

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

const targetSpawn$: Observable<Action> = spawn$(Constants.SEED);

const slider = document.querySelector("#baseSlider") as HTMLInputElement;

const swapBase$: Observable<Action> = fromEvent<Event>(slider, "input").pipe(
    map(event => Number((event.target as HTMLInputElement).value)),
    map(baseFromIndex),
    map(b => new ChangeBase(b)),
);

const decayingBonus$: Observable<Action> = fromEvent<KeyboardEvent>(
    document,
    "keydown",
).pipe(
    filter(event => event.code === "Space" && !event.repeat),
    exhaustMap(() =>
        timer(0, 1000).pipe(
            take(Constants.MAX_MULTIPLIER),
            map(step => new setMultiplier(Constants.INITIAL_MULTIPLIER - step)),
        ),
    ),
);

/**
 * Creates an SVG element with the given properties.
 *
 * See https://developer.mozilla.org/en-US/docs/Web/SVG/Element for valid
 * element names and properties.
 *
 * @param namespace Namespace of the SVG element
 * @param name SVGElement name
 * @param props Properties to set on the SVG element
 * @returns SVG element
 */
const createSvgElement = (
    namespace: string | null,
    name: string,
    props: Record<string, string> = {},
): SVGElement => {
    const elem = document.createElementNS(namespace, name) as SVGElement;
    Object.entries(props).forEach(([k, v]) => elem.setAttribute(k, v));
    return elem;
};

const toBaseText =
    (base: number) =>
    (value: number): string =>
        value.toString(base).toUpperCase().padStart(2, "0");

const updateTargetView =
    (rootSVG: SVGSVGElement, base: number) => (t: FallingTarget) => {
        function createTargetView() {
            const parent = createSvgElement(rootSVG.namespaceURI, "svg", {
                id: t.id,
                width: `${Target.WIDTH}`,
                height: `${Target.HEIGHT}`,
            });
            parent.classList.add("target");

            const rect = createSvgElement(rootSVG.namespaceURI, "rect", {
                x: "0",
                y: "0",
                width: `${Target.WIDTH}`,
                height: `${Target.HEIGHT}`,
                rx: "6",
            });

            const text = createSvgElement(rootSVG.namespaceURI, "text", {
                x: `${Target.WIDTH / 2}`,
                y: `${Target.HEIGHT / 2 + 8}`,
            });

            parent.appendChild(rect);
            parent.appendChild(text);
            rootSVG.appendChild(parent);
            return parent;
        }

        const parent = document.getElementById(t.id) || createTargetView();

        attr(parent, { x: t.x, y: t.y });

        const text = parent.querySelector("text");
        if (text) {
            text.textContent = toBaseText(base)(t.value);
        }
    };

const removeTargets = (exit: ReadonlyArray<FallingTarget>): void => {
    exit.map(t => document.getElementById(t.id))
        .filter(isNotNullOrUndefined)
        .forEach(element => element.remove());
};

const syncTargets = (rootSVG: SVGSVGElement, s: State): void =>
    Array.from(rootSVG.querySelectorAll(".target"))
        .filter(element => s.targets.every(t => t.id !== element.id))
        .forEach(element => element.remove());

const render = (): ((s: State) => void) => {
    const svg = document.querySelector("#svgCanvas") as SVGSVGElement | null;
    const baseText = document.querySelector("#baseText") as HTMLElement;
    const currentValueText = document.querySelector(
        "#currentValueText",
    ) as HTMLElement | null;
    const scoreText = document.querySelector(
        "#scoreText",
    ) as HTMLElement | null;

    if (!svg) return () => {};

    svg.setAttribute(
        "viewBox",
        `0 0 ${Viewport.CANVAS_WIDTH} ${Viewport.CANVAS_HEIGHT}`,
    );

    const checkLine = createSvgElement(svg.namespaceURI, "line", {
        x1: "0",
        y1: String(Constants.CHECK_LINE),
        x2: String(Viewport.CANVAS_WIDTH),
        y2: String(Constants.CHECK_LINE),
        stroke: "rgba(255, 0, 0, 0.5)",
        "stroke-dasharray": "4",
    });
    checkLine.classList.add("check-line");
    svg.appendChild(checkLine);

    /*
    Debug message
    */
    const hud = createSvgElement(svg.namespaceURI, "text", {
        x: "10",
        y: "24",
        "text-anchor": "start",
        "font-family": "monospace",
        fill: "white",
    });
    hud.classList.add("hud");
    svg.appendChild(hud);

    const digitWidth = Viewport.CANVAS_WIDTH / Constants.DIGIT_COUNT;

    const bitViews = Array.from({ length: Constants.DIGIT_COUNT }, (_, i) => {
        const rect = createSvgElement(svg.namespaceURI, "rect", {
            x: `${i * digitWidth + 4}`,
            y: `${Viewport.CANVAS_HEIGHT - 50}`,
            width: `${digitWidth - 8}`,
            height: "40",
            rx: "4",
            "data-index": String(i),
        });
        rect.classList.add("bit");

        const bitText = createSvgElement(svg.namespaceURI, "text", {
            x: `${i * digitWidth + digitWidth / 2}`,
            y: `${Viewport.CANVAS_HEIGHT - 22}`,
        });
        bitText.classList.add("bit-label");
        bitText.textContent = "0";

        svg.appendChild(rect);
        svg.appendChild(bitText);

        return { rect, bitText };
    });

    const gameOverText = createSvgElement(svg.namespaceURI, "text", {
        id: "gameOver",
        x: String(Viewport.CANVAS_WIDTH / 2),
        y: String(Viewport.CANVAS_HEIGHT / 2),
        "text-anchor": "middle",
        "dominant-baseline": "central",
    });
    gameOverText.textContent = "Game Over";
    hide(gameOverText);
    svg.appendChild(gameOverText);

    return (s: State): void => {
        removeTargets(s.exit);
        syncTargets(svg, s);

        if (scoreText) {
            scoreText.textContent = String(s.score);
        }

        if (currentValueText) {
            currentValueText.textContent = toBaseText(s.base)(
                bitsToValue(s.bits),
            );
        }

        if (baseText) {
            baseText.textContent = String(s.base);
        }

        s.bits.forEach((val, i) => {
            const view = bitViews[i];
            view.bitText.textContent = String(val);
            val === 1
                ? view.rect.classList.add("on")
                : view.rect.classList.remove("on");
        });

        s.targets.forEach(updateTargetView(svg, s.base));

        hud.textContent =
            ` targets: ${s.targets.length}` +
            `  exit: ${s.exit.length}  y: ${(s.targets[0]?.y ?? -1).toFixed(1)}`;

        s.gameEnd ? show(gameOverText) : hide(gameOverText);
    };
};

export const state$ = (): Observable<State> => {
    const restart$ = fromEvent<KeyboardEvent>(document, "keydown").pipe(
        filter((e: KeyboardEvent) => e.code === "KeyR"),
        startWith(null),
    );

    return restart$.pipe(
        switchMap(() => {
            const tick$: Observable<Action> = interval(
                Constants.TICK_RATE_MS,
            ).pipe(map(elapsed => new Tick(elapsed)));

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

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

import { Action, Constants, State, Viewport, Target } from "./types";
import { attr, isNotNullOrUndefined } from "./util";
import {
    initialState,
    reduceState,
    ToggleBitAt,
    Tick,
    generateRandomTargetData,
    SpawnTarget,
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

const render = (onFinish: () => void = () => {}): ((s: State) => void) => {
    const svg = document.querySelector("#svgCanvas") as SVGSVGElement | null;
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

    return (s: State): void => {
        s.bits.forEach((val, i) => {
            const view = bitViews[i];
            view.bitText.textContent = String(val);
            view.rect.classList.toggle("on", val === 1);
        });

        hud.textContent =
            ` targets: ${s.targets.length}` +
            `  exit: ${s.exit.length}  y: ${(s.targets[0]?.y ?? -1).toFixed(1)}`;

        if (s.gameEnd) {
            onFinish();
        }
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
            return merge(tick$, flipByKey$, flipByMouse$).pipe(
                scan(reduceState, initialState),
            );
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

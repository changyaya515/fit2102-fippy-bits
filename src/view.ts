import { Constants, State, Viewport, Target, FallingTarget } from "./types";
import { attr } from "./util";
import { baseFromIndex } from "./state";

/**
 * Brings an SVG element to the foreground.
 * @param elem SVG element to bring to the foreground
 */
export const bringToForeground = (elem: SVGElement): void => {
    elem.parentNode?.appendChild(elem);
};

/**
 * Displays a SVG element on the canvas. Brings to foreground.
 * @param elem SVG element to display
 */
export const show = (elem: SVGElement): void => {
    elem.setAttribute("visibility", "visible");
    bringToForeground(elem);
};

/**
 * Hides a SVG element on the canvas.
 * @param elem SVG element to hide
 */
export const hide = (elem: SVGElement): void => {
    elem.setAttribute("visibility", "hidden");
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
export const createSvgElement = (
    namespace: string | null,
    name: string,
    props: Record<string, string> = {},
): SVGElement => {
    const elem = document.createElementNS(namespace, name) as SVGElement;
    Object.entries(props).forEach(([k, v]) => elem.setAttribute(k, v));
    return elem;
};

/**
 * Updates a target's position and displays its value in the selected number base.
 *
 * Design Choice:
 * - Extracted from render because other UI elements are static, but targets
 *   are dynamic and need to be created, moved, and updated individually.
 * - Curried so it can be passed cleanly into `s.targets.forEach(...)`.
 */
export const updateTargetView =
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
        text ? (text.textContent = t.value.toString(base).toUpperCase()) : null;
    };

/**
 * Removes targets destroyed during the current frame.
 * Deletes matching SVG elements for all targets present in the exit queue.
 */
export const removeTargets = (
    rootSVG: SVGSVGElement,
    exit: ReadonlyArray<FallingTarget>,
): void => {
    exit.forEach(o => {
        const targetNode = document.getElementById(o.id);
        targetNode && rootSVG.removeChild(targetNode);
    });
};

/**
 * Cleans up leftover target SVGs on game restart.
 *
 * When restarting, the state resets directly to empty without passing old targets
 * through exit[]. This removes any leftover elements to prevent ID collisions.
 */
export const syncTargets = (rootSVG: SVGSVGElement, s: State): void => {
    Array.from(rootSVG.querySelectorAll(".target"))
        .filter(element => s.targets.every(t => t.id !== element.id))
        .forEach(element => element.remove());
};

/**
 * Handles all visual updates for the game.
 *
 * Builds static elements (bit row, text)once and returns a closure to render each State.
 * This avoids re-creating layout elements on every tick and isolates all side-effects.
 */
export const render = (): ((s: State) => void) => {
    // Type assertions match static index.html elements for typed property access
    const svg = document.querySelector("#svgCanvas") as SVGSVGElement | null;
    const baseText = document.querySelector("#baseText") as HTMLElement | null;
    const scoreText = document.querySelector(
        "#scoreText",
    ) as HTMLElement | null;
    const baseSlider = document.querySelector(
        "#baseSlider",
    ) as HTMLInputElement | null;

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
        x: String(Viewport.CANVAS_WIDTH / 2),
        y: String(Viewport.CANVAS_HEIGHT / 2),
        "text-anchor": "middle",
        "dominant-baseline": "central",
    });
    gameOverText.textContent = "Game Over";
    hide(gameOverText);
    svg.appendChild(gameOverText);

    return (s: State): void => {
        removeTargets(svg, s.exit);
        syncTargets(svg, s);

        scoreText ? (scoreText.textContent = String(s.score)) : null;
        baseText ? (baseText.textContent = String(s.base)) : null;

        // A restart resets State.base to the default, so the slider is pulled
        // back into sync rather than being left showing a stale base.
        if (
            baseSlider &&
            String(baseFromIndex(+baseSlider.value)) !== String(s.base)
        ) {
            baseSlider.value = String(Constants.DEFAULT_BASE_INDEX);
        }

        s.bits.forEach((val, i) => {
            const view = bitViews[i];
            view.bitText.textContent = String(val);
            val === 1
                ? view.rect.classList.add("on")
                : view.rect.classList.remove("on");
        });

        s.targets.forEach(updateTargetView(svg, s.base));

        s.gameEnd ? show(gameOverText) : hide(gameOverText);
    };
};

/*
Adapted from FIT2102 Workshop 4 materials.
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

// Maps a normalized [-1, 1] value to a custom target range [min, max]
export const scaleToRange =
    (min: number, max: number) =>
    (scaledRng: number): number =>
        min + ((scaledRng + 1) / 2) * (max - min);

/**
 * Type guard utility to filter out null and undefined values.
 * Adapted from FIT2102 Workshop 4.
 */
export const isNotNullOrUndefined = <T extends object>(
    input: null | undefined | T,
): input is T => {
    return input != null;
};

/**
 * Helper to batch set SVG/DOM element attributes immutably in intent.
 * Adapted from FIT2102 Workshop 4.
 */
export const attr = (e: Element, o: { [p: string]: unknown }) => {
    for (const k in o) e.setAttribute(k, String(o[k]));
};

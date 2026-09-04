# Assignment 1

## Usage

Setup (requires node.js):

```bash
> npm install
```

Start tests:

```bash
> npm test
```

Serve up the App (and ctrl-click the URL that appears in the console)

```bash
> npm run dev
```

To format your code, for the assignment specifications:

```bash
npx prettier . --write
```

The configuration for this is set in `.prettierrc.json`. Feel free to change this to your heart's desire, but try to ensure it still fits the assignment guidelines.

If you are using VS Code, you can also install the [Prettier extension](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode). This skeleton code is set up to automatically format your code on save. You can disable this in `.vscode/settings.json` by changing `"editor.formatOnSave": true` to `"editor.formatOnSave": false`.

## Implementing features

There are a few files you may wish to modify. The rest should **not** be modified as they are used for configuring the build.

`src/main.ts`

- Code file used as the entry point
- Most of your game logic should go here
- Contains main function that is called on page load

`src/style.css`

- Stylesheet
- You may edit this if you wish

`index.html`

- Main html file
- Contains scaffold of game window and some sample shapes
- Feel free to add to this, but avoid changing the existing code, especially the `id` fields

`test/*.test.ts`

- If you want to add tests, these go here
- Uses [`vitest`](https://vitest.dev/api/)

We expect the core logic of your game to be in `src/main.ts`, however, you may elect to spread your code over multiple files. In this case, please use [TS Modules](https://www.typescriptlang.org/docs/handbook/modules.html).

Avoid separating code into too many files as it makes it hard to mark. The maximum recommended code file structure would be something like

```
src/
  main.ts     -- core game loop: all Observable streams and the single subscribe
  types.ts    -- common types, type aliases and constants
  util.ts     -- pure utility functions (RNG, scaling, DOM attribute helper)
  state.ts    -- state processing and transformation (Action classes, reduceState)
  view.ts     -- rendering (all DOM/SVG side effects)
  style.css   -- stylesheet
```

## Implementation Features

### Deterministic PRNG

`Math.random()` isn't referentially transparent, so target `x`, `value`, and `delay` all come from the pure PRNG hash in `util.ts`. `generateRandomTargetData` hashes a seed three times and returns nextSeed, which `expand` feeds into the next target. The same `Constants.SEED` always produces the exact same targets.

### Continuous Speed Ramp

The game scales difficulty smoothly rather than through stepped stages. Each `Tick` increments global falling speed, updating active target positions uniformly without mutating existing target objects.

## Interpretation of Ambiguous Requirements

1. Targets resolve immediately on keypress rather than waiting for the next Tick.
   To prevent double-scoring, matching pops the target, awards score, and resets
   all bits to zero in the same state transition.

2. Values are dynamically clamped to [0, 2 ** DIGIT_COUNT - 1] instead of a hard-coded 256.
   This ensures targets are always winnable even if DIGIT_COUNT changes.

3. I chose to accelerate only vertical falling speed (`s.speed`), leaving spawn intervals
   strictly tied to the deterministic PRNG to preserve test reproducibility.

## Advanced Features Implementation

### 1. Number base switching (2 / 8 / 10 / 16)

Slider input events pipe through a stream, map via baseFromIndex, and dispatch a ChangeBase action.

Design Choices:

- Only State.base updates. Game matching logic always checks raw binary values, keeping
  number representation purely as a display concern in the view.

- Changing the base never touches active targets, speeds, or scores,
  making state transitions isolated and safe to toggle at any time (even after game over).

### 2. Decaying bonus

Pressing Space triggers a temporary 4-second bonus window (+4, +3, +2, +1 points per match) driven by `timer(0, 1000).pipe(take(Constants.BONUS_DURATION))` emitting pure SetBonus actions.

Design Choices:

- Uses `switchMap` so pressing Space again cleanly cancels the previous timer and restarts
  the bonus countdown immediately.
- Holding down Space won't repeatedly trigger new bonus windows.

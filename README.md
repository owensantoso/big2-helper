# Big Two Helper

Big Two Helper is a mobile-friendly static web app for quick in-person reference. It includes:

- a beginner cheat sheet for core Big Two rankings
- a round settlement calculator with pairwise payouts
- lightweight local persistence for recent calculator inputs

This app is designed for teaching and table-side use. It is not a full online Big Two game.

## Stack

- React
- Vite
- TypeScript
- plain CSS

## Local development

```bash
npm install
npm run dev
```

The Vite dev server will print a local URL in the terminal.

## Production build

```bash
npm run build
```

The static output is generated in `dist/`.

## GitHub Pages deployment

This repo includes [`.github/workflows/deploy.yml`](/Users/macintoso/Documents/VSCode/big2-helper/.github/workflows/deploy.yml), which builds the app and deploys it with GitHub Pages Actions whenever `main` is updated.

Recommended setup:

1. Push the repository to GitHub.
2. Enable GitHub Pages for this repository with the GitHub Actions build source.
3. Push to `main` again, or rerun the workflow manually.

The Vite config uses `base: './'` so the build works well as a static site, including GitHub Pages project sites.

## Features

### Cheat sheet

- suit order summary
- rank order summary
- 5-card combo ranking
- expandable combo cards with valid and invalid examples
- compact round-flow rules card

### Settlement calculator

- supports 2 to 4 players
- infers the winner as the one player with `0` cards left
- configurable value per card, unit label, penalty threshold, and penalty multiplier
- pairwise settlement output
- net totals output
- copy-to-clipboard results button
- localStorage persistence for recent players, settings, and last tab

## Ruleset assumptions

This app documents one explicit Big Two ruleset. House rules vary by region, so these assumptions are intentionally spelled out in the UI and code:

1. Suit order is `♦ < ♣ < ♥ < ♠`.
2. Rank order is `3 < 4 < 5 < 6 < 7 < 8 < 9 < 10 < J < Q < K < A < 2`.
3. `2` is the highest rank.
4. Straights compare by highest card, then the suit of that highest card.
5. In this app's ruleset, `2` is not used in straights.
6. Flushes compare by suit first; if the suit matches, compare the highest card.
7. Full houses compare by the triple.
8. Four of a kinds compare by the rank of the four matching cards.
9. Straight flushes compare by highest card.
10. The penalty multiplier applies to all pairwise payments made by a player whose cards left are greater than or equal to the threshold.
11. The default penalty threshold is `10`, but it can be changed.

## Settlement example

Example inputs:

- Alice: `0`
- Bob: `2`
- Carol: `5`
- Dave: `10`
- value per card: `1`
- threshold: `10`
- multiplier: `2`

Expected pairwise results:

- Bob owes Alice `2`
- Carol owes Alice `5`
- Carol owes Bob `3`
- Dave owes Alice `20`
- Dave owes Bob `16`
- Dave owes Carol `10`

Expected net totals:

- Alice: `+27`
- Bob: `+17`
- Carol: `+2`
- Dave: `-46`

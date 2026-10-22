# Chess Simulator

A 3D chess game that runs entirely in the browser. You play against Stockfish at strengths from beginner to superhuman, on a wooden board you can rotate and zoom, with a small animated companion (Arya) who reacts to the game as it goes.

**Play it here:** https://minhhoang2007.github.io/chess-simulator/

There's no backend. The chess engine runs in your browser through WebAssembly, so once the page has loaded it works offline.

## Features

**Opponents**

There are twelve bots, each one a Stockfish setting with its own name and playing style:

| Bot | Rating |
| --- | --- |
| Maria | 1000 |
| Sven | 1100 |
| Emir | 1200 |
| Nelson | 1300 |
| Antonio | 1500 |
| Isabel | 1600 |
| Wally | 1800 |
| Li | 2000 |
| Noam | 2200 |
| GothamChess | 2500 |
| Magnus Carlsen | 2882 |
| Ayanokouji | 3500 |

**The board**

- Staunton-style pieces built in Three.js, with wood-grain textures for both sides
- Piece themes: Classic Wood, Liquid Glass, Emerald Jade and Neon Glass
- Board themes: Wood, Slate and Blue
- A free 3D camera (rotate and zoom), plus a top-down 2D view and fixed white/black views
- Highlights for the selected piece, legal moves and the last move

**During a game**

- Full rules via chess.js: castling, en passant, promotion, check and checkmate, and every kind of draw (stalemate, threefold repetition, the 50-move rule, insufficient material)
- An evaluation bar showing who's ahead, in pawns or as moves to mate
- Hints (Stockfish draws an arrow for the best move), undo, flip board and resign
- Move list in standard notation, plus the captured pieces and material difference
- Sound effects for moves, captures, checks, castling and the end of the game
- Arya, the companion, waves at the start, thinks while you play, waits while the bot moves and reacts when the game ends

**Language**

The whole interface switches between English and Vietnamese.

## Running it locally

You need [Node.js](https://nodejs.org/) 18 or newer.

```bash
git clone https://github.com/minhhoang2007/chess-simulator.git
cd chess-simulator
npm install
npm run dev
```

Then open http://localhost:5173.

To make a production build, run `npm run build`. The output goes to `dist/`.

## Deployment

Every push to `main` builds the site and publishes it to GitHub Pages through `.github/workflows/deploy.yml`. Production builds are served from `/chess-simulator/` (set in `vite.config.ts`), while `npm run dev` still runs at the root.

## Project structure

```
chess-simulator/
├── public/
│   ├── stockfish.js, stockfish.wasm, stockfish.wasm.js   Stockfish engine
│   ├── arya/          companion animation frames
│   ├── bots/          bot avatars
│   ├── sounds/        sound effects
│   └── textures/      board, table and piece textures
├── src/
│   ├── App.tsx        game flow and state
│   ├── audio/         sound playback
│   ├── components/    UI: bot picker, eval bar, move list, settings, Arya, modals
│   ├── engine/        talks to Stockfish over UCI
│   ├── locales/       English and Vietnamese text, bot profiles
│   ├── three/         3D scene, piece geometry and textures
│   └── types/         shared TypeScript types
├── index.html
├── vite.config.ts
└── package.json
```

## Built with

React 19, TypeScript, Three.js, Stockfish (WebAssembly), chess.js, Tailwind CSS 4, Lucide icons and Vite.

## Author

Made by [minhhoang2007](https://github.com/minhhoang2007). Released under the MIT License.

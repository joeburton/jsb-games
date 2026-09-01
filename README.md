# 🕹️ JSB Games

> A tiny arcade cabinet that lives in your browser. Pixel sprites, chiptune vibes,
> and three certified classics rebuilt from scratch in React + TypeScript.

Insert coin. No coin? That's fine, it's free. 🪙

---

## 🎮 What's in the cabinet

| Game | The pitch | Controls |
| --- | --- | --- |
| 👾 **Space Invaders** | Rows of wiggling aliens march toward Earth and it's just you and a laser cannon. Clear a wave, the next one comes faster and shoots meaner. | `←` `→` move · `Space` shoot |
| 🍄 **Retro Platformer** | Run, jump, stomp, collect coins, reach the flag. Coyote-time and jump-buffering included so the platforming actually feels good. | `←` `→` / `A` `D` move · `Space` / `↑` / `W` jump |
| 🟡 **Pac-Man** | Eat every pellet, dodge four ghosts with real scatter/chase personalities, and munch a power pellet to turn the tables. | Arrow keys / `WASD` move |

Every game keeps a **level counter** that ratchets up the difficulty, gives you
**3 lives**, and drops a big **restart button** on the game-over screen. Pixel art
and animation frames are hand-coded strings of `0`s and `1`s, because of course
they are.

---

## 🖥️ The cabinet

The games live inside a small designed site shell (all in `src/site/`):

- **Mobile-first, fully responsive** — one column on a phone, two up on a tablet,
  three across on desktop, with a sticky neon nav bar.
- **Arcade / synthwave theme** — CRT scanlines, an aurora glow, a perspective
  grid floor, `Press Start 2P` marquees and a `Chakra Petch` body face. Each game
  gets its own accent colour (Invaders green, Platformer cyan, Pac-Man yellow)
  that flows through its cabinet, buttons and nav pill.
- **Hash routing** — `#/` is the arcade, `#/game/<id>` is a game. No router
  dependency; see [src/site/useHashRoute.ts](src/site/useHashRoute.ts).
- **On-screen touch pad** — the games are keyboard-built, so
  [src/site/TouchControls.tsx](src/site/TouchControls.tsx) renders a D-pad that
  synthesises the same `keydown` / `keyup` events, making every game playable by
  thumb. Toggle it under the screen.
- **Game metadata** (pitch, controls, field notes, specs) is one registry in
  [src/site/games.ts](src/site/games.ts).

---

## 🚀 Quick start

```bash
npm install
npm run dev
```

Open the URL Vite prints, mash the keyboard, have fun.

---

## 🛠️ Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the Vite dev server with HMR |
| `npm run build` | Type-check with `tsc` and build for production |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run ESLint over the project |
| `npm test` | Run the Vitest suite once |
| `npm run test:watch` | Run Vitest in watch mode |

---

## 🧰 Built with

- **React 19** + **TypeScript** + **Vite** — the app shell and tooling
- **`<canvas>` + `requestAnimationFrame`** — every game is its own little render loop
- **Redux Toolkit** + **react-redux** — wired up and ready (see the easter egg below)
- **Vitest** + **Testing Library** — the tests that keep the maze walls standing

---

## 🥚 Easter egg

There's a fully working little **task manager** hiding in `src/components`
(`TaskList`, `AddTask`, `TaskFilter`, `TaskSummary`) backed by a Redux store. It's
commented out in [src/App.tsx](src/App.tsx) — swap the imports back in if you'd
rather organize your day than save the galaxy. We won't judge. Much.

---

## 📁 Project layout

```
src/
├── App.tsx                 # routes: arcade home vs. a single game
├── site/                   # the designed cabinet shell
│   ├── NavBar / Home / GameScreen
│   ├── TouchControls.tsx   # on-screen D-pad → synthetic key events
│   ├── games.ts            # game registry (pitch, controls, accent…)
│   └── useHashRoute.ts     # dependency-free hash router
├── components/
│   ├── SpaceInvaders/      # 👾
│   ├── RetroPlatformer/    # 🍄
│   ├── PacMan/             # 🟡
│   └── TaskList, AddTask…  # 🥚 the hidden productivity app
├── store/                  # Redux Toolkit slices + selectors
└── data/                   # seed data
```

Now go get a high score. 🏆

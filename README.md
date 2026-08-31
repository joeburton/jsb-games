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
├── App.tsx                 # picks which games to mount
├── components/
│   ├── SpaceInvaders/      # 👾
│   ├── RetroPlatformer/    # 🍄
│   ├── PacMan/             # 🟡
│   └── TaskList, AddTask…  # 🥚 the hidden productivity app
├── store/                  # Redux Toolkit slices + selectors
└── data/                   # seed data
```

Now go get a high score. 🏆

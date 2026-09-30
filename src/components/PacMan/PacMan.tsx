import { useCallback, useEffect, useRef, useState } from "react";
import GameFrame from "../shared/GameFrame";
import { startLoop } from "../shared/loop";
import styles from "./PacMan.module.css";

const W = 21;
const H = 21;
const TILE = 18;
const CANVAS_W = W * TILE;
const CANVAS_H = H * TILE;
const TUNNEL_ROW = 10;
const START_LIVES = 3;

// Speeds in tiles per second.
const PAC_SPEED = 6.2;
const GHOST_SPEED = 5.6;
const FRIGHT_SPEED = 3.4;
const EYES_SPEED = 13;
const TUNNEL_SPEED = 3.4;
const SPEED_PER_LEVEL = 0.35;
const MAX_SPEED_BONUS = 2.5;

// Frightened timing in milliseconds.
const FRIGHT_TIME = 7000;
const FRIGHT_FLASH = 2000;
const FRIGHT_TIME_PER_LEVEL = 900;
const MIN_FRIGHT_TIME = 1200;

const READY_TIME = 1400;

const MODE_SCHEDULE: [Mode, number][] = [
  ["scatter", 7000],
  ["chase", 20000],
  ["scatter", 7000],
  ["chase", 20000],
  ["scatter", 5000],
  ["chase", 20000],
  ["scatter", 5000],
  ["chase", Number.POSITIVE_INFINITY],
];

// Legend: # wall  . pellet  o power pellet  - ghost door  P pac
//         B/K/I/C blinky / pinky / inky / clyde spawns   (space) empty
const MAZE = [
  "#####################",
  "#o.................o#",
  "#.##.##.##.##.##.##.#",
  "#.##.##.##.##.##.##.#",
  "#...................#",
  "#.##.##.##.##.##.##.#",
  "#.##.##.##.##.##.##.#",
  "#.........B.........#",
  "#.##.#####-#####.##.#",
  "#.##.###     ###.##.#",
  " ....### KIC ###.... ",
  "#.##.###     ###.##.#",
  "#.##.###########.##.#",
  "#...................#",
  "#.##.##.##.##.##.##.#",
  "#.##.##.##.##.##.##.#",
  "#.........P.........#",
  "#.##.##.##.##.##.##.#",
  "#.##.##.##.##.##.##.#",
  "#o.................o#",
  "#####################",
];

const BLINKY_COLOR = "#ff2d15";
const PINKY_COLOR = "#ffb0e0";
const INKY_COLOR = "#24d7f7";
const CLYDE_COLOR = "#ff9f2e";

type Mode = "scatter" | "chase";
type GhostState = "house" | "leaving" | "scatter" | "chase" | "frightened" | "eyes";
type GhostName = "blinky" | "pinky" | "inky" | "clyde";
type GameStatus = "idle" | "playing" | "lost";

interface Vec {
  x: number;
  y: number;
}

const UP: Vec = { x: 0, y: -1 };
const DOWN: Vec = { x: 0, y: 1 };
const LEFT: Vec = { x: -1, y: 0 };
const RIGHT: Vec = { x: 1, y: 0 };
const NONE: Vec = { x: 0, y: 0 };
const TURN_ORDER: Vec[] = [UP, LEFT, DOWN, RIGHT];

interface Pac {
  x: number;
  y: number;
  dir: Vec;
  want: Vec;
  facing: Vec;
}

interface Ghost {
  name: GhostName;
  x: number;
  y: number;
  dir: Vec;
  state: GhostState;
  spawn: Vec;
  scatter: Vec;
  target: Vec;
  releaseAt: number;
  color: string;
}

interface GameState {
  pac: Pac;
  ghosts: Ghost[];
  pellets: Set<string>;
  power: Set<string>;
  score: number;
  lives: number;
  level: number;
  modeIndex: number;
  modeElapsed: number;
  frightTimer: number;
  comboIndex: number;
  levelTime: number;
  readyTimer: number;
}

const WALL: boolean[][] = [];
const DOOR: boolean[][] = [];
const PELLET_TILES: [number, number][] = [];
const POWER_TILES: [number, number][] = [];
const SPAWN = {
  pac: { x: 10, y: 16 },
  blinky: { x: 10, y: 7 },
  pinky: { x: 9, y: 10 },
  inky: { x: 10, y: 10 },
  clyde: { x: 11, y: 10 },
};

MAZE.forEach((row, r) => {
  WALL[r] = [];
  DOOR[r] = [];
  for (let c = 0; c < W; c++) {
    const ch = row[c] ?? " ";
    WALL[r][c] = ch === "#";
    DOOR[r][c] = ch === "-";
    if (ch === ".") PELLET_TILES.push([r, c]);
    else if (ch === "o") POWER_TILES.push([r, c]);
    else if (ch === "P") SPAWN.pac = { x: c, y: r };
    else if (ch === "B") SPAWN.blinky = { x: c, y: r };
    else if (ch === "K") SPAWN.pinky = { x: c, y: r };
    else if (ch === "I") SPAWN.inky = { x: c, y: r };
    else if (ch === "C") SPAWN.clyde = { x: c, y: r };
  }
});

const speedBonus = (level: number) =>
  Math.min(MAX_SPEED_BONUS, (level - 1) * SPEED_PER_LEVEL);

const frightDuration = (level: number) =>
  Math.max(MIN_FRIGHT_TIME, FRIGHT_TIME - (level - 1) * FRIGHT_TIME_PER_LEVEL);

const scheduledMode = (game: GameState): Mode => MODE_SCHEDULE[game.modeIndex][0];

const isReverse = (a: Vec, b: Vec) =>
  a.x === -b.x && a.y === -b.y && (a.x !== 0 || a.y !== 0);

const blocked = (c: number, r: number, allowDoor: boolean) => {
  let cc = c;
  if (r === TUNNEL_ROW) cc = ((c % W) + W) % W;
  if (r < 0 || r >= H || cc < 0 || cc >= W) return true;
  if (WALL[r][cc]) return true;
  if (DOOR[r][cc] && !allowDoor) return true;
  return false;
};

const canGo = (x: number, y: number, d: Vec, allowDoor: boolean) =>
  !blocked(Math.round(x) + d.x, Math.round(y) + d.y, allowDoor);

const createGhosts = (): Ghost[] =>
  (
    [
      { name: "blinky", spawn: SPAWN.blinky, scatter: { x: W - 2, y: 1 }, releaseAt: 0, color: BLINKY_COLOR },
      { name: "pinky", spawn: SPAWN.pinky, scatter: { x: 1, y: 1 }, releaseAt: 2000, color: PINKY_COLOR },
      { name: "inky", spawn: SPAWN.inky, scatter: { x: W - 2, y: H - 2 }, releaseAt: 5000, color: INKY_COLOR },
      { name: "clyde", spawn: SPAWN.clyde, scatter: { x: 1, y: H - 2 }, releaseAt: 8000, color: CLYDE_COLOR },
    ] as const
  ).map((g) => ({
    ...g,
    x: g.spawn.x,
    y: g.spawn.y,
    dir: g.name === "blinky" ? LEFT : UP,
    state: (g.name === "blinky" ? "scatter" : "house") as GhostState,
    target: { x: g.scatter.x, y: g.scatter.y },
  }));

const freshPellets = () => new Set(PELLET_TILES.map(([r, c]) => `${r},${c}`));
const freshPower = () => new Set(POWER_TILES.map(([r, c]) => `${r},${c}`));

const resetPositions = (game: GameState) => {
  game.pac = {
    x: SPAWN.pac.x,
    y: SPAWN.pac.y,
    dir: NONE,
    want: NONE,
    facing: LEFT,
  };
  game.ghosts = createGhosts();
  game.modeIndex = 0;
  game.modeElapsed = 0;
  game.frightTimer = 0;
  game.comboIndex = 0;
  game.levelTime = 0;
  game.readyTimer = READY_TIME;
};

const createGameState = (): GameState => {
  const game: GameState = {
    pac: { x: SPAWN.pac.x, y: SPAWN.pac.y, dir: NONE, want: NONE, facing: LEFT },
    ghosts: createGhosts(),
    pellets: freshPellets(),
    power: freshPower(),
    score: 0,
    lives: START_LIVES,
    level: 1,
    modeIndex: 0,
    modeElapsed: 0,
    frightTimer: 0,
    comboIndex: 0,
    levelTime: 0,
    readyTimer: READY_TIME,
  };
  return game;
};

const chooseLeaving = (game: GameState, g: Ghost) => {
  const yr = Math.round(g.y);
  if (yr >= 9) {
    if (Math.abs(g.x - 10) > 1e-6) g.dir = g.x < 10 ? RIGHT : LEFT;
    else g.dir = UP;
  } else if (yr <= 7) {
    g.state = game.frightTimer > 0 ? "frightened" : scheduledMode(game);
    g.dir = LEFT;
  } else {
    g.dir = UP;
  }
};

const chooseGhostDir = (game: GameState, g: Ghost) => {
  if (g.state === "leaving") {
    chooseLeaving(game, g);
    return;
  }
  const allowDoor = g.state === "eyes";
  const opts: Vec[] = [];
  for (const d of TURN_ORDER) {
    if (d.x === -g.dir.x && d.y === -g.dir.y) continue;
    if (!canGo(g.x, g.y, d, allowDoor)) continue;
    opts.push(d);
  }
  if (opts.length === 0) {
    g.dir = { x: -g.dir.x, y: -g.dir.y };
    return;
  }
  if (g.state === "frightened") {
    g.dir = opts[Math.floor(Math.random() * opts.length)];
    return;
  }
  let best = opts[0];
  let bestDist = Number.POSITIVE_INFINITY;
  for (const d of opts) {
    const tx = g.x + d.x;
    const ty = g.y + d.y;
    const dist = (tx - g.target.x) ** 2 + (ty - g.target.y) ** 2;
    if (dist < bestDist - 1e-9) {
      bestDist = dist;
      best = d;
    }
  }
  g.dir = best;
};

const choosePacDir = (pac: Pac) => {
  if ((pac.want.x !== 0 || pac.want.y !== 0) && canGo(pac.x, pac.y, pac.want, false)) {
    pac.dir = pac.want;
    return;
  }
  if ((pac.dir.x !== 0 || pac.dir.y !== 0) && canGo(pac.x, pac.y, pac.dir, false)) return;
  pac.dir = NONE;
};

// Grid-locked stepping: entities pause and re-decide on every tile centre.
const stepEntity = (
  e: { x: number; y: number; dir: Vec },
  budgetTiles: number,
  onCentre: () => void,
) => {
  let budget = budgetTiles;
  for (let iter = 0; iter < 12 && budget > 1e-6; iter++) {
    const atCentre =
      Math.abs(e.x - Math.round(e.x)) < 1e-6 && Math.abs(e.y - Math.round(e.y)) < 1e-6;
    if (atCentre) {
      e.x = Math.round(e.x);
      e.y = Math.round(e.y);
      onCentre();
      if (e.dir.x === 0 && e.dir.y === 0) return;
    }

    let ncx = e.x;
    let ncy = e.y;
    if (e.dir.x > 0) ncx = Math.floor(e.x + 1e-9) + 1;
    else if (e.dir.x < 0) ncx = Math.ceil(e.x - 1e-9) - 1;
    if (e.dir.y > 0) ncy = Math.floor(e.y + 1e-9) + 1;
    else if (e.dir.y < 0) ncy = Math.ceil(e.y - 1e-9) - 1;

    const distToNext = Math.abs(ncx - e.x) + Math.abs(ncy - e.y);
    const actual = Math.min(budget, distToNext || 1);
    e.x += e.dir.x * actual;
    e.y += e.dir.y * actual;
    budget -= actual;

    if (Math.abs(e.x - Math.round(e.x)) < 1e-6) e.x = Math.round(e.x);
    if (Math.abs(e.y - Math.round(e.y)) < 1e-6) e.y = Math.round(e.y);

    if (Math.round(e.y) === TUNNEL_ROW) {
      if (e.x < 0) e.x += W;
      else if (e.x > W - 1) e.x -= W;
    }
  }
};

const updateGhostTarget = (game: GameState, g: Ghost) => {
  if (g.state === "eyes") {
    g.target = Math.round(g.y) <= 7 ? { x: 10, y: 8 } : { x: 10, y: 10 };
    return;
  }
  if (g.state === "frightened") {
    g.target = { x: g.x, y: g.y };
    return;
  }
  if (g.state === "scatter") {
    g.target = g.scatter;
    return;
  }
  const pac = game.pac;
  const px = Math.round(pac.x);
  const py = Math.round(pac.y);
  const pd = pac.facing;
  if (g.name === "blinky") {
    g.target = { x: px, y: py };
  } else if (g.name === "pinky") {
    g.target = { x: px + 4 * pd.x, y: py + 4 * pd.y };
  } else if (g.name === "inky") {
    const blinky = game.ghosts[0];
    const ax = px + 2 * pd.x;
    const ay = py + 2 * pd.y;
    g.target = { x: ax + (ax - blinky.x), y: ay + (ay - blinky.y) };
  } else {
    const dist = Math.hypot(g.x - pac.x, g.y - pac.y);
    g.target = dist > 8 ? { x: px, y: py } : g.scatter;
  }
};

const inTunnel = (g: Ghost) => {
  const cx = Math.round(g.x);
  return Math.round(g.y) === TUNNEL_ROW && (cx <= 5 || cx >= W - 6);
};

const dirAngle = (v: Vec) => {
  if (v.x > 0) return 0;
  if (v.x < 0) return Math.PI;
  if (v.y > 0) return Math.PI / 2;
  return -Math.PI / 2;
};

const drawPac = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  facing: Vec,
  time: number,
  frozen: boolean,
) => {
  const open = (frozen ? 0.18 : 0.5 + 0.5 * Math.sin(time / 45)) * 0.33 * Math.PI;
  const angle = dirAngle(facing);
  ctx.fillStyle = "#ffe100";
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, r, angle + open, angle + Math.PI * 2 - open);
  ctx.closePath();
  ctx.fill();
};

const drawGhost = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  g: Ghost,
  game: GameState,
  time: number,
) => {
  const fright = g.state === "frightened";
  const flash =
    fright && game.frightTimer <= FRIGHT_FLASH && Math.floor(time / 130) % 2 === 0;

  if (g.state !== "eyes") {
    ctx.fillStyle = fright ? (flash ? "#f7f7ff" : "#2530ff") : g.color;
    ctx.beginPath();
    ctx.arc(cx, cy - r * 0.1, r, Math.PI, 0);
    ctx.lineTo(cx + r, cy + r * 0.85);
    ctx.lineTo(cx + r * 0.55, cy + r * 0.5);
    ctx.lineTo(cx + r * 0.15, cy + r * 0.9);
    ctx.lineTo(cx - r * 0.15, cy + r * 0.5);
    ctx.lineTo(cx - r * 0.55, cy + r * 0.9);
    ctx.lineTo(cx - r, cy + r * 0.5);
    ctx.lineTo(cx - r, cy + r * 0.85);
    ctx.closePath();
    ctx.fill();
  }

  if (fright) {
    const ink = flash ? "#ff3030" : "#f7f7ff";
    ctx.fillStyle = ink;
    ctx.fillRect(cx - r * 0.45, cy - r * 0.22, r * 0.26, r * 0.26);
    ctx.fillRect(cx + r * 0.19, cy - r * 0.22, r * 0.26, r * 0.26);
    ctx.strokeStyle = ink;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.5, cy + r * 0.4);
    ctx.lineTo(cx - r * 0.2, cy + r * 0.22);
    ctx.lineTo(cx + r * 0.1, cy + r * 0.4);
    ctx.lineTo(cx + r * 0.4, cy + r * 0.22);
    ctx.lineTo(cx + r * 0.6, cy + r * 0.4);
    ctx.stroke();
    return;
  }

  for (const s of [-1, 1]) {
    const ex = cx + s * r * 0.34;
    const ey = cy - r * 0.12;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(ex, ey, r * 0.3, r * 0.38, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1b2ad0";
    ctx.beginPath();
    ctx.arc(ex + g.dir.x * r * 0.16, ey + g.dir.y * r * 0.2, r * 0.17, 0, Math.PI * 2);
    ctx.fill();
  }
};

const PacMan = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<GameState>(createGameState());

  const [status, setStatus] = useState<GameStatus>("idle");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(START_LIVES);
  const [level, setLevel] = useState(1);

  const startGame = useCallback(() => {
    gameRef.current = createGameState();
    setScore(0);
    setLives(START_LIVES);
    setLevel(1);
    setStatus("playing");
  }, []);

  useEffect(() => {
    if (status !== "playing") return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const game = gameRef.current;

    const KEY_DIRS: Record<string, Vec> = {
      ArrowUp: UP,
      ArrowDown: DOWN,
      ArrowLeft: LEFT,
      ArrowRight: RIGHT,
      KeyW: UP,
      KeyS: DOWN,
      KeyA: LEFT,
      KeyD: RIGHT,
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const dir = KEY_DIRS[event.code];
      if (!dir) return;
      event.preventDefault();
      game.pac.want = dir;
    };

    window.addEventListener("keydown", handleKeyDown);

    const render = (time: number) => {
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      for (let r = 0; r < H; r++) {
        for (let c = 0; c < W; c++) {
          if (WALL[r][c]) {
            ctx.fillStyle = "#1b1bd1";
            ctx.fillRect(c * TILE + 1, r * TILE + 1, TILE - 2, TILE - 2);
          } else if (DOOR[r][c]) {
            ctx.fillStyle = "#ff9ccb";
            ctx.fillRect(c * TILE, r * TILE + TILE / 2 - 2, TILE, 4);
          }
        }
      }

      ctx.fillStyle = "#ffdfae";
      game.pellets.forEach((key) => {
        const [r, c] = key.split(",").map(Number);
        ctx.beginPath();
        ctx.arc(c * TILE + TILE / 2, r * TILE + TILE / 2, 1.8, 0, Math.PI * 2);
        ctx.fill();
      });

      if (Math.floor(time / 200) % 2 === 0) {
        ctx.fillStyle = "#ffe9c4";
        game.power.forEach((key) => {
          const [r, c] = key.split(",").map(Number);
          ctx.beginPath();
          ctx.arc(c * TILE + TILE / 2, r * TILE + TILE / 2, 4.5, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      const frozen = game.readyTimer > 0;
      drawPac(
        ctx,
        game.pac.x * TILE + TILE / 2,
        game.pac.y * TILE + TILE / 2,
        TILE * 0.48,
        game.pac.facing,
        time,
        frozen,
      );

      for (const g of game.ghosts) {
        drawGhost(
          ctx,
          g.x * TILE + TILE / 2,
          g.y * TILE + TILE / 2,
          TILE * 0.5,
          g,
          game,
          time,
        );
      }

      if (frozen) {
        ctx.fillStyle = "#ffd000";
        ctx.font = "bold 15px ui-monospace, monospace";
        ctx.textAlign = "center";
        ctx.fillText("READY!", CANVAS_W / 2, CANVAS_H * 0.615);
      }
    };

    const stopLoop = startLoop((time, deltaMs) => {
      const dt = Math.min(50, deltaMs);

      if (game.readyTimer > 0) {
        game.readyTimer -= dt;
        render(time);
        return;
      }

      game.levelTime += dt;
      const dtSec = dt / 1000;

      // Global scatter / chase schedule (frozen while ghosts are frightened).
      if (game.frightTimer <= 0) {
        game.modeElapsed += dt;
        const duration = MODE_SCHEDULE[game.modeIndex][1];
        if (
          game.modeElapsed >= duration &&
          game.modeIndex < MODE_SCHEDULE.length - 1
        ) {
          game.modeIndex += 1;
          game.modeElapsed = 0;
          for (const g of game.ghosts) {
            if (g.state === "scatter" || g.state === "chase") {
              g.state = scheduledMode(game);
              g.dir = { x: -g.dir.x, y: -g.dir.y };
            }
          }
        }
      }

      // Frightened countdown.
      if (game.frightTimer > 0) {
        game.frightTimer -= dt;
        if (game.frightTimer <= 0) {
          game.frightTimer = 0;
          for (const g of game.ghosts) {
            if (g.state === "frightened") g.state = scheduledMode(game);
          }
        }
      }

      // Release ghosts from the house.
      for (const g of game.ghosts) {
        if (g.state === "house" && game.levelTime >= g.releaseAt) {
          g.state = "leaving";
          g.x = g.spawn.x;
          g.y = g.spawn.y;
        }
      }

      // Pac-Man.
      if (isReverse(game.pac.want, game.pac.dir)) game.pac.dir = game.pac.want;
      stepEntity(game.pac, (PAC_SPEED + speedBonus(game.level)) * dtSec, () =>
        choosePacDir(game.pac),
      );
      if (game.pac.dir.x !== 0 || game.pac.dir.y !== 0) game.pac.facing = game.pac.dir;

      const pc = Math.round(game.pac.x);
      const pr = Math.round(game.pac.y);
      const key = `${pr},${pc}`;
      if (game.pellets.has(key)) {
        game.pellets.delete(key);
        game.score += 10;
      } else if (game.power.has(key)) {
        game.power.delete(key);
        game.score += 50;
        game.frightTimer = frightDuration(game.level);
        game.comboIndex = 0;
        for (const g of game.ghosts) {
          if (g.state === "scatter" || g.state === "chase") {
            g.state = "frightened";
            g.dir = { x: -g.dir.x, y: -g.dir.y };
          }
        }
      }

      // Ghosts.
      for (const g of game.ghosts) {
        if (g.state === "house") {
          g.x = g.spawn.x;
          g.y = g.spawn.y + Math.sin(game.levelTime / 180) * 0.3;
          continue;
        }
        if (
          (g.state === "scatter" || g.state === "chase") &&
          g.state !== scheduledMode(game)
        ) {
          g.state = scheduledMode(game);
        }

        let speed: number;
        if (g.state === "eyes") speed = EYES_SPEED;
        else if (g.state === "frightened") speed = FRIGHT_SPEED;
        else if (inTunnel(g)) speed = TUNNEL_SPEED;
        else speed = GHOST_SPEED + speedBonus(game.level);

        updateGhostTarget(game, g);
        stepEntity(g, speed * dtSec, () => chooseGhostDir(game, g));

        if (
          g.state === "eyes" &&
          Math.abs(g.x - SPAWN.inky.x) < 0.4 &&
          Math.abs(g.y - SPAWN.inky.y) < 0.4
        ) {
          g.state = "leaving";
        }
      }

      // Collisions.
      let died = false;
      for (const g of game.ghosts) {
        if (g.state === "eyes" || g.state === "house") continue;
        if (Math.hypot(g.x - game.pac.x, g.y - game.pac.y) >= 0.6) continue;
        if (g.state === "frightened") {
          game.score += 200 * 2 ** game.comboIndex;
          game.comboIndex = Math.min(game.comboIndex + 1, 3);
          g.state = "eyes";
        } else {
          game.lives -= 1;
          died = true;
          break;
        }
      }

      if (died) {
        if (game.lives <= 0) {
          setLives(0);
          setScore(game.score);
          setStatus("lost");
          return false;
        }
        setLives(game.lives);
        resetPositions(game);
        render(time);
        return;
      }

      // Level cleared.
      if (game.pellets.size === 0 && game.power.size === 0) {
        game.level += 1;
        game.pellets = freshPellets();
        game.power = freshPower();
        resetPositions(game);
      }

      setScore(game.score);
      setLives(game.lives);
      setLevel(game.level);

      render(time);
    });

    return () => {
      stopLoop();
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [status]);

  return (
    <GameFrame
      title="Pac-Man"
      className={styles.theme}
      hud={[`Level: ${level}`, `Score: ${score}`, `Lives: ${lives}`]}
      canvasRef={canvasRef}
      width={CANVAS_W}
      height={CANVAS_H}
      overlay={
        status === "playing"
          ? null
          : {
              message:
                status === "lost" ? "Game over" : "Clear the maze, dodge the ghosts",
              buttonLabel: status === "idle" ? "Start Game" : "Play Again",
              onClick: startGame,
            }
      }
      instructions="Arrow keys / WASD to move · eat a power pellet to chase the ghosts"
    />
  );
};

export default PacMan;

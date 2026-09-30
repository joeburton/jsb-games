import { useCallback, useEffect, useRef, useState } from "react";
import GameFrame from "../shared/GameFrame";
import { drawSprite, intersects } from "../shared/canvas";
import { startLoop } from "../shared/loop";
import styles from "./RetroPlatformer.module.css";

const TILE = 16;
const CANVAS_WIDTH = 480;
const CANVAS_HEIGHT = 320;

const GRAVITY = 1100; // px per second^2
const MOVE_SPEED = 132; // px per second
const JUMP_VELOCITY = -360; // px per second
const MAX_FALL_SPEED = 460; // px per second
const STOMP_BOUNCE = -260; // px per second
const ENEMY_SPEED = 42; // px per second

const COYOTE_MS = 90; // grace period to jump after leaving a ledge
const JUMP_BUFFER_MS = 110; // grace period for an early jump press
const SUBSTEP = 0.008; // fixed physics step in seconds

const PLAYER_W = 12;
const PLAYER_H = 16;
const ENEMY_W = 14;
const ENEMY_H = 12;
const COIN_SIZE = 10;

const START_LIVES = 3;

// Tile legend: # ground  = platform  ^ spikes  o coin  E enemy  P player  F flag
interface LevelConfig {
  name: string;
  enemySpeedMul: number;
  rows: string[];
}

const LEVEL_CONFIGS: LevelConfig[] = [
  {
    name: "1-1",
    enemySpeedMul: 1,
    rows: [
      "                                                          ",
      "                                                          ",
      "                               ooo                        ",
      "                              =====                       ",
      "               ooo                                        ",
      "             =====             ^^^          ooo           ",
      "                          ===========     =======         ",
      "      ooo                                          F      ",
      "    =====          E             ooo          ========    ",
      "                =========      =======                    ",
      "         ooo                              E               ",
      "       =====         ^^^            ===========           ",
      "   P              =========                               ",
      "======                          ooo        E             ",
      "               ooo          ======================        ",
      "             =====                                        ",
      "########      ##################       ###################",
      "########      ##################       ###################",
      "########      ##################       ###################",
      "########      ##################       ###################",
    ],
  },
  {
    name: "1-2",
    enemySpeedMul: 1.25,
    rows: [
      "                                                                        ",
      "                                                                        ",
      "                                                                        ",
      "                                                                        ",
      "                                                                        ",
      "                                                                        ",
      "                                                                        ",
      "                                                         ooo      F     ",
      "                              ^^^                       ===== =====   ",
      "                            =======                 ====                ",
      "                   ooo                  E     ooo        E              ",
      "                  =======             ============= =========          ",
      "          ooo                            ooo                            ",
      "         =======                      ===========                       ",
      "   P                    ooo                E                 ooo        ",
      " ======           E     ====            =======        E    ======      ",
      "##########      ##############      ############      ##################",
      "##########      ##############      ############      ##################",
      "##########      ##############      ############      ##################",
      "##########      ##############      ############      ##################",
    ],
  },
  {
    name: "1-3",
    enemySpeedMul: 1.5,
    rows: [
      "                                                                                    ",
      "                                                                                    ",
      "                                                                                    ",
      "                                                                                    ",
      "                                                                                    ",
      "                                                                                    ",
      "                                                                                    ",
      "                             ooo                               ooo                  ",
      "                             ^^^              E                  F                  ",
      "                            ======          =====             ======                ",
      "                   ooo                 ooo             ^^^                           ",
      "                  =======           ======          =======                         ",
      "          ooo                 E                 E            ooo                     ",
      "         =======          =======           =======       ========                  ",
      "   P               ooo                E                             ooo         ooo  ",
      " ======         E =====           =====           E               ====== ===== ",
      "########      ##########        ########      ##########        ##########    ######",
      "########      ##########        ########      ##########        ##########    ######",
      "########      ##########        ########      ##########        ##########    ######",
      "########      ##########        ########      ##########        ##########    ######",
    ],
  },
];

// 6x8 pixel-art hero, a few frames for idle / run / jump.
const PLAYER_IDLE = [
  "011110",
  "011110",
  "001100",
  "111111",
  "011110",
  "011110",
  "010010",
  "011011",
];
const PLAYER_RUN_A = [
  "011110",
  "011110",
  "001100",
  "111110",
  "011110",
  "011110",
  "011100",
  "001010",
];
const PLAYER_RUN_B = [
  "011110",
  "011110",
  "001100",
  "011111",
  "011110",
  "011110",
  "001110",
  "010100",
];
const PLAYER_JUMP = [
  "011110",
  "011110",
  "001100",
  "111111",
  "011110",
  "011110",
  "110011",
  "100001",
];

// 7x6 pixel-art critter, two frames for a shuffling walk.
const ENEMY_A = [
  "0011100",
  "0111110",
  "1111111",
  "1101011",
  "1111111",
  "0110110",
];
const ENEMY_B = [
  "0011100",
  "0111110",
  "1111111",
  "1101011",
  "1111111",
  "1011011",
];

const PLAYER_COLOR = "#4ad9ff";
const ENEMY_COLOR = "#ff7a3b";
const COIN_COLOR = "#ffd24a";
const COIN_SHINE = "#fff1b8";
const FLAG_POLE_COLOR = "#d9d9e6";
const FLAG_CLOTH_COLOR = "#ff3b6b";

type GameStatus = "idle" | "playing" | "levelComplete" | "won" | "lost";

interface Body {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  onGround: boolean;
}

interface Enemy extends Body {
  dir: 1 | -1;
  alive: boolean;
}

interface Player extends Body {
  facing: 1 | -1;
}

interface Coin {
  x: number;
  y: number;
  taken: boolean;
}

interface GameState {
  player: Player;
  enemies: Enemy[];
  coins: Coin[];
  camX: number;
  score: number;
  lives: number;
  coinsCollected: number;
  lastGroundTime: number;
  lastJumpPressTime: number;
  jumpPressed: boolean;
}

interface Level {
  grid: string[];
  width: number;
  height: number;
  coinSpawns: { x: number; y: number }[];
  enemySpawns: { x: number; y: number }[];
  playerSpawn: { x: number; y: number };
  flag: { x: number; y: number };
}

const parseLevel = (raw: string[]): Level => {
  const height = raw.length;
  const width = raw.reduce((max, row) => Math.max(max, row.length), 0);
  const grid = raw.map((row) => row.padEnd(width, " "));

  const coinSpawns: { x: number; y: number }[] = [];
  const enemySpawns: { x: number; y: number }[] = [];
  let playerSpawn = { x: TILE, y: TILE };
  let flag = { x: (width - 3) * TILE, y: TILE };

  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      const char = grid[r][c];
      const x = c * TILE;
      const y = r * TILE;
      if (char === "o") {
        coinSpawns.push({
          x: x + (TILE - COIN_SIZE) / 2,
          y: y + (TILE - COIN_SIZE) / 2,
        });
      } else if (char === "E") {
        enemySpawns.push({
          x: x + (TILE - ENEMY_W) / 2,
          y: y + (TILE - ENEMY_H),
        });
      } else if (char === "P") {
        playerSpawn = { x: x + (TILE - PLAYER_W) / 2, y: y + (TILE - PLAYER_H) };
      } else if (char === "F") {
        flag = { x, y };
      }
    }
  }

  return { grid, width, height, coinSpawns, enemySpawns, playerSpawn, flag };
};

const LEVELS: Level[] = LEVEL_CONFIGS.map((config) => parseLevel(config.rows));
const MAX_WORLD_WIDTH = Math.max(...LEVELS.map((level) => level.width * TILE));

// Twinkling starfield, laid out once across the widest world.
const STARS = Array.from({ length: 70 }, (_, i) => ({
  x: (i * 137.5) % MAX_WORLD_WIDTH,
  y: (i * 83.7) % (CANVAS_HEIGHT * 0.72),
  big: i % 4 === 0,
}));

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const isSolid = (level: Level, col: number, row: number) => {
  if (col < 0 || col >= level.width) return true;
  if (row < 0 || row >= level.height) return false;
  const char = level.grid[row][col];
  return char === "#" || char === "=";
};

// Move a body along X by its current velocity and stop it at solid tiles.
const collideX = (level: Level, body: Body): boolean => {
  const rowStart = Math.floor(body.y / TILE);
  const rowEnd = Math.floor((body.y + body.h - 1) / TILE);
  if (body.vx > 0) {
    const col = Math.floor((body.x + body.w - 1) / TILE);
    for (let r = rowStart; r <= rowEnd; r++) {
      if (isSolid(level, col, r)) {
        body.x = col * TILE - body.w;
        body.vx = 0;
        return true;
      }
    }
  } else if (body.vx < 0) {
    const col = Math.floor(body.x / TILE);
    for (let r = rowStart; r <= rowEnd; r++) {
      if (isSolid(level, col, r)) {
        body.x = (col + 1) * TILE;
        body.vx = 0;
        return true;
      }
    }
  }
  return false;
};

// Move a body along Y by its current velocity and land it on solid tiles.
const collideY = (level: Level, body: Body): void => {
  const colStart = Math.floor(body.x / TILE);
  const colEnd = Math.floor((body.x + body.w - 1) / TILE);
  if (body.vy > 0) {
    const row = Math.floor((body.y + body.h - 1) / TILE);
    for (let c = colStart; c <= colEnd; c++) {
      if (isSolid(level, c, row)) {
        body.y = row * TILE - body.h;
        body.vy = 0;
        body.onGround = true;
        return;
      }
    }
  } else if (body.vy < 0) {
    const row = Math.floor(body.y / TILE);
    for (let c = colStart; c <= colEnd; c++) {
      if (isSolid(level, c, row)) {
        body.y = (row + 1) * TILE;
        body.vy = 0;
        return;
      }
    }
  }
};

const spawnEnemies = (level: Level): Enemy[] =>
  level.enemySpawns.map((spawn) => ({
    x: spawn.x,
    y: spawn.y,
    w: ENEMY_W,
    h: ENEMY_H,
    vx: 0,
    vy: 0,
    onGround: false,
    dir: -1,
    alive: true,
  }));

const createGameState = (level: Level): GameState => ({
  player: {
    x: level.playerSpawn.x,
    y: level.playerSpawn.y,
    w: PLAYER_W,
    h: PLAYER_H,
    vx: 0,
    vy: 0,
    onGround: false,
    facing: 1,
  },
  enemies: spawnEnemies(level),
  coins: level.coinSpawns.map((coin) => ({ x: coin.x, y: coin.y, taken: false })),
  camX: 0,
  score: 0,
  lives: START_LIVES,
  coinsCollected: 0,
  lastGroundTime: -9999,
  lastJumpPressTime: -9999,
  jumpPressed: false,
});

const drawTiles = (ctx: CanvasRenderingContext2D, level: Level, camX: number) => {
  const startCol = Math.max(0, Math.floor(camX / TILE));
  const endCol = Math.min(
    level.width - 1,
    Math.ceil((camX + CANVAS_WIDTH) / TILE),
  );

  for (let c = startCol; c <= endCol; c++) {
    for (let r = 0; r < level.height; r++) {
      const char = level.grid[r][c];
      if (char !== "#" && char !== "=" && char !== "^") continue;
      const x = Math.round(c * TILE - camX);
      const y = r * TILE;

      if (char === "#") {
        ctx.fillStyle = "#6b4a2b";
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = "#5a3d24";
        ctx.fillRect(x + 2, y + 8, 4, 4);
        ctx.fillRect(x + 9, y + 11, 4, 3);
        if (!isSolid(level, c, r - 1)) {
          ctx.fillStyle = "#4caf6a";
          ctx.fillRect(x, y, TILE, 4);
          ctx.fillStyle = "#3c8f55";
          ctx.fillRect(x, y + 4, TILE, 2);
        } else {
          ctx.fillStyle = "#8a6440";
          ctx.fillRect(x, y, TILE, 2);
        }
      } else if (char === "=") {
        ctx.fillStyle = "#6c6c86";
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = "#8a8aa6";
        ctx.fillRect(x, y, TILE, 4);
        ctx.fillStyle = "#4a4a63";
        ctx.fillRect(x, y + TILE - 2, TILE, 2);
      } else {
        ctx.fillStyle = "#6b7290";
        ctx.fillRect(x, y + TILE - 4, TILE, 4);
        ctx.fillStyle = "#b9c0d8";
        ctx.beginPath();
        ctx.moveTo(x + 1, y + TILE);
        ctx.lineTo(x + TILE / 2, y + 2);
        ctx.lineTo(x + TILE - 1, y + TILE);
        ctx.closePath();
        ctx.fill();
      }
    }
  }
};

const drawBackground = (
  ctx: CanvasRenderingContext2D,
  camX: number,
  time: number,
) => {
  const sky = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
  sky.addColorStop(0, "#0b1026");
  sky.addColorStop(1, "#241a3d");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  for (const star of STARS) {
    let sx = (star.x - camX * 0.3) % MAX_WORLD_WIDTH;
    if (sx < 0) sx += MAX_WORLD_WIDTH;
    if (sx > CANVAS_WIDTH) continue;
    const twinkle = 0.45 + 0.45 * Math.sin(time / 400 + star.x);
    ctx.globalAlpha = twinkle;
    ctx.fillStyle = "#dfe6ff";
    const size = star.big ? 2 : 1;
    ctx.fillRect(sx, star.y, size, size);
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = "#2a2148";
  const hillSpan = 240;
  const offset = (camX * 0.5) % hillSpan;
  for (let i = -1; i * hillSpan - offset < CANVAS_WIDTH; i++) {
    const hx = i * hillSpan - offset + hillSpan / 2;
    ctx.beginPath();
    ctx.arc(hx, CANVAS_HEIGHT - 18, 96, Math.PI, 0);
    ctx.fill();
  }
};

const RetroPlatformer = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<GameState>(createGameState(LEVELS[0]));
  const keysRef = useRef<Set<string>>(new Set());

  const [status, setStatus] = useState<GameStatus>("idle");
  const [levelIndex, setLevelIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(START_LIVES);
  const [coins, setCoins] = useState(0);

  const startGame = useCallback(() => {
    gameRef.current = createGameState(LEVELS[0]);
    setLevelIndex(0);
    setScore(0);
    setLives(START_LIVES);
    setCoins(0);
    setStatus("playing");
  }, []);

  const nextLevel = useCallback(() => {
    const next = Math.min(levelIndex + 1, LEVELS.length - 1);
    const carried = gameRef.current;
    const fresh = createGameState(LEVELS[next]);
    fresh.score = carried.score;
    fresh.lives = carried.lives;
    gameRef.current = fresh;
    setLevelIndex(next);
    setScore(fresh.score);
    setLives(fresh.lives);
    setCoins(0);
    setStatus("playing");
  }, [levelIndex]);

  useEffect(() => {
    if (status !== "playing") return;

    // Drop any keys still held from the previous screen (e.g. running into the
    // flag) so a new level doesn't start auto-scrolling until you tap that key.
    const heldKeys = keysRef.current;
    heldKeys.clear();
    gameRef.current.jumpPressed = false;

    const level = LEVELS[levelIndex];
    const enemySpeedMul = LEVEL_CONFIGS[levelIndex].enemySpeedMul;
    const worldWidth = level.width * TILE;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const JUMP_KEYS = new Set(["Space", "ArrowUp", "KeyW"]);
    const HANDLED_KEYS = new Set([
      "Space",
      "ArrowUp",
      "ArrowLeft",
      "ArrowRight",
      "KeyW",
      "KeyA",
      "KeyD",
    ]);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (HANDLED_KEYS.has(event.code)) event.preventDefault();
      if (!keysRef.current.has(event.code)) {
        keysRef.current.add(event.code);
        if (JUMP_KEYS.has(event.code)) gameRef.current.jumpPressed = true;
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      keysRef.current.delete(event.code);
      if (JUMP_KEYS.has(event.code)) {
        const player = gameRef.current.player;
        if (player.vy < -140) player.vy = -140; // short hop on early release
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    const game = gameRef.current;

    const respawn = () => {
      game.player.x = level.playerSpawn.x;
      game.player.y = level.playerSpawn.y;
      game.player.vx = 0;
      game.player.vy = 0;
      game.player.onGround = false;
      game.player.facing = 1;
      game.enemies = spawnEnemies(level);
      game.camX = 0;
      game.lastGroundTime = -9999;
      game.lastJumpPressTime = -9999;
    };

    // Returns true when the run is over (no lives left).
    const die = () => {
      game.lives -= 1;
      setLives(game.lives);
      if (game.lives <= 0) {
        setStatus("lost");
        return true;
      }
      respawn();
      return false;
    };

    const step = (dt: number, time: number) => {
      const player = game.player;

      player.vy = Math.min(MAX_FALL_SPEED, player.vy + GRAVITY * dt);
      player.x += player.vx * dt;
      player.x = clamp(player.x, 0, worldWidth - player.w);
      collideX(level, player);
      player.y += player.vy * dt;
      player.onGround = false;
      collideY(level, player);
      if (player.onGround) game.lastGroundTime = time;

      for (const enemy of game.enemies) {
        if (!enemy.alive) continue;
        enemy.vx = enemy.dir * ENEMY_SPEED * enemySpeedMul;
        enemy.vy = Math.min(MAX_FALL_SPEED, enemy.vy + GRAVITY * dt);
        enemy.x += enemy.vx * dt;
        const hitWall = collideX(level, enemy);
        enemy.y += enemy.vy * dt;
        enemy.onGround = false;
        collideY(level, enemy);
        if (enemy.onGround) {
          const aheadX = enemy.dir > 0 ? enemy.x + enemy.w + 1 : enemy.x - 1;
          const footCol = Math.floor(aheadX / TILE);
          const belowRow = Math.floor((enemy.y + enemy.h + 1) / TILE);
          if (hitWall || !isSolid(level, footCol, belowRow)) {
            enemy.dir = (enemy.dir * -1) as 1 | -1;
          }
        }
      }
    };

    const stopLoop = startLoop((time, deltaMs) => {
      const frameDt = Math.min(0.05, deltaMs / 1000);

      const keys = keysRef.current;
      const player = game.player;

      const left = keys.has("ArrowLeft") || keys.has("KeyA");
      const right = keys.has("ArrowRight") || keys.has("KeyD");
      const dir = (right ? 1 : 0) - (left ? 1 : 0);
      player.vx = dir * MOVE_SPEED;
      if (dir !== 0) player.facing = dir as 1 | -1;

      if (game.jumpPressed) {
        game.lastJumpPressTime = time;
        game.jumpPressed = false;
      }
      const withinCoyote = time - game.lastGroundTime <= COYOTE_MS;
      const withinBuffer = time - game.lastJumpPressTime <= JUMP_BUFFER_MS;
      if (withinCoyote && withinBuffer) {
        player.vy = JUMP_VELOCITY;
        player.onGround = false;
        game.lastGroundTime = -9999;
        game.lastJumpPressTime = -9999;
      }

      let remaining = frameDt;
      while (remaining > 1e-4) {
        const dt = Math.min(SUBSTEP, remaining);
        step(dt, time);
        remaining -= dt;
      }

      for (const coin of game.coins) {
        if (coin.taken) continue;
        if (
          intersects(
            player.x,
            player.y,
            player.w,
            player.h,
            coin.x,
            coin.y,
            COIN_SIZE,
            COIN_SIZE,
          )
        ) {
          coin.taken = true;
          game.coinsCollected += 1;
          game.score += 100;
        }
      }

      for (const enemy of game.enemies) {
        if (!enemy.alive) continue;
        if (
          !intersects(
            player.x,
            player.y,
            player.w,
            player.h,
            enemy.x,
            enemy.y,
            enemy.w,
            enemy.h,
          )
        ) {
          continue;
        }
        const falling = player.vy > 20;
        const fromAbove = player.y + player.h - enemy.y < 12;
        if (falling && fromAbove) {
          enemy.alive = false;
          player.vy = STOMP_BOUNCE;
          game.score += 200;
        } else if (die()) {
          return false;
        } else {
          break;
        }
      }

      let hazard = player.y > level.height * TILE + 32;
      if (!hazard) {
        const c0 = Math.floor(player.x / TILE);
        const c1 = Math.floor((player.x + player.w - 1) / TILE);
        const r0 = Math.floor(player.y / TILE);
        const r1 = Math.floor((player.y + player.h - 1) / TILE);
        for (let c = c0; c <= c1 && !hazard; c++) {
          for (let r = r0; r <= r1 && !hazard; r++) {
            if (
              c >= 0 &&
              c < level.width &&
              r >= 0 &&
              r < level.height &&
              level.grid[r][c] === "^"
            ) {
              hazard = true;
            }
          }
        }
      }
      if (hazard && die()) return false;

      const flagHitbox = {
        x: level.flag.x + TILE / 2 - 4,
        y: level.flag.y - TILE,
        w: 12,
        h: TILE * 3,
      };
      if (
        intersects(
          player.x,
          player.y,
          player.w,
          player.h,
          flagHitbox.x,
          flagHitbox.y,
          flagHitbox.w,
          flagHitbox.h,
        )
      ) {
        game.score += 400 + game.lives * 150;
        setScore(game.score);
        setLives(game.lives);
        setStatus(levelIndex < LEVELS.length - 1 ? "levelComplete" : "won");
        return false;
      }

      game.camX = clamp(
        player.x + player.w / 2 - CANVAS_WIDTH / 2,
        0,
        Math.max(0, worldWidth - CANVAS_WIDTH),
      );

      setScore(game.score);
      setLives(game.lives);
      setCoins(game.coinsCollected);

      const camX = game.camX;
      drawBackground(ctx, camX, time);
      drawTiles(ctx, level, camX);

      // Coins spin by squashing their width over time.
      for (const coin of game.coins) {
        if (coin.taken) continue;
        const cx = coin.x - camX + COIN_SIZE / 2;
        if (cx < -COIN_SIZE || cx > CANVAS_WIDTH + COIN_SIZE) continue;
        const cy = coin.y + COIN_SIZE / 2;
        const radiusX = Math.max(
          1.5,
          Math.abs(Math.sin(time / 200 + coin.x * 0.05)) * (COIN_SIZE / 2),
        );
        ctx.fillStyle = COIN_COLOR;
        ctx.beginPath();
        ctx.ellipse(cx, cy, radiusX, COIN_SIZE / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = COIN_SHINE;
        ctx.fillRect(cx - 1, cy - 3, 2, 6);
      }

      // Flag: pole, waving cloth, base block.
      const fx = level.flag.x - camX;
      if (fx > -TILE * 3 && fx < CANVAS_WIDTH + TILE * 3) {
        ctx.fillStyle = "#8a8aa0";
        ctx.fillRect(Math.round(fx + 2), level.flag.y, TILE - 4, TILE);
        ctx.fillStyle = FLAG_POLE_COLOR;
        ctx.fillRect(Math.round(fx + TILE / 2 - 1), level.flag.y - TILE * 2, 3, TILE * 2);
        const wave = Math.sin(time / 180) * 3;
        const px = fx + TILE / 2 + 2;
        const py = level.flag.y - TILE * 2;
        ctx.fillStyle = FLAG_CLOTH_COLOR;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + 16 + wave, py + 6);
        ctx.lineTo(px, py + 12);
        ctx.closePath();
        ctx.fill();
      }

      const enemyFrame = Math.floor(time / 140) % 2 === 0 ? ENEMY_A : ENEMY_B;
      for (const enemy of game.enemies) {
        if (!enemy.alive) continue;
        const ex = Math.round(enemy.x - camX);
        if (ex < -ENEMY_W * 2 || ex > CANVAS_WIDTH + ENEMY_W * 2) continue;
        drawSprite(ctx, enemyFrame, ex, Math.round(enemy.y), 2, ENEMY_COLOR, enemy.dir < 0);
      }

      let playerSprite = PLAYER_IDLE;
      if (!player.onGround) {
        playerSprite = PLAYER_JUMP;
      } else if (Math.abs(player.vx) > 1) {
        playerSprite = Math.floor(time / 90) % 2 === 0 ? PLAYER_RUN_A : PLAYER_RUN_B;
      }
      drawSprite(
        ctx,
        playerSprite,
        Math.round(player.x - camX),
        Math.round(player.y),
        2,
        PLAYER_COLOR,
        player.facing < 0,
      );
    });

    return () => {
      stopLoop();
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      // Listeners are gone now, so a keyup during the between-levels overlay
      // would never be recorded — forget everything that was held.
      heldKeys.clear();
    };
  }, [status, levelIndex]);

  const stageName = LEVEL_CONFIGS[levelIndex].name;
  const totalCoins = LEVELS[levelIndex].coinSpawns.length;

  let overlayMessage: string;
  if (status === "won") {
    overlayMessage = `All ${LEVELS.length} stages cleared! Final score ${score}`;
  } else if (status === "lost") {
    overlayMessage = "Game over";
  } else if (status === "levelComplete") {
    overlayMessage = `Stage ${stageName} cleared!`;
  } else {
    overlayMessage = "Grab the coins and reach the flag";
  }

  const buttonLabel =
    status === "idle"
      ? "Start Game"
      : status === "levelComplete"
        ? "Next Level"
        : "Play Again";

  const handlePrimary = status === "levelComplete" ? nextLevel : startGame;

  return (
    <GameFrame
      title="Retro Platformer"
      className={styles.theme}
      hud={[
        `Stage ${stageName}`,
        `Coins: ${coins}/${totalCoins}`,
        `Score: ${score}`,
        `Lives: ${lives}`,
      ]}
      canvasRef={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      overlay={
        status === "playing"
          ? null
          : { message: overlayMessage, buttonLabel, onClick: handlePrimary }
      }
      instructions="← / → to move, Space / ↑ to jump, stomp critters from above"
    />
  );
};

export default RetroPlatformer;

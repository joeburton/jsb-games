import { useCallback, useEffect, useRef, useState } from "react";
import GameFrame from "../shared/GameFrame";
import { drawSprite, intersects } from "../shared/canvas";
import { startLoop } from "../shared/loop";
import styles from "./SpaceInvaders.module.css";

const CANVAS_WIDTH = 480;
const CANVAS_HEIGHT = 360;

const PLAYER_WIDTH = 32;
const PLAYER_HEIGHT = 10;
const PLAYER_Y = CANVAS_HEIGHT - PLAYER_HEIGHT - 12;
const PLAYER_SPEED = 0.25; // px per ms

const BULLET_WIDTH = 3;
const BULLET_HEIGHT = 10;
const PLAYER_BULLET_SPEED = 0.4; // px per ms
const ENEMY_BULLET_SPEED = 0.18; // px per ms
const SHOT_COOLDOWN = 350; // ms

const INVADER_ROWS = 4;
const INVADER_COLS = 8;
const INVADER_WIDTH = 24;
const INVADER_HEIGHT = 16;
const INVADER_GAP_X = 14;
const INVADER_GAP_Y = 16;
const INVADER_START_X = 30;
const INVADER_START_Y = 40;
const INVADER_STEP_X = 10;
const INVADER_DROP_Y = 14;
const INVADER_FIRE_CHANCE = 0.25;
const INVADER_FIRE_CHANCE_PER_LEVEL = 0.03;
const MAX_INVADER_FIRE_CHANCE = 0.5;

const BASE_INVADER_STEP_INTERVAL = 600;
const MIN_BASE_INVADER_STEP_INTERVAL = 150;
const INVADER_STEP_INTERVAL_PER_LEVEL = 60;

const START_LIVES = 3;

// 12x8 pixel-art invader, two frames for a walking animation.
const INVADER_SPRITE_A = [
  "000010010000",
  "000110011000",
  "001111111100",
  "011011110110",
  "111111111111",
  "101111111101",
  "101000000101",
  "000101101000",
];
const INVADER_SPRITE_B = [
  "000010010000",
  "000110011000",
  "001111111100",
  "011011110110",
  "111111111111",
  "101111111101",
  "000101101000",
  "101000000101",
];
const INVADER_SPRITE_COLS = INVADER_SPRITE_A[0].length;
const INVADER_PIXEL_SIZE = INVADER_WIDTH / INVADER_SPRITE_COLS;
const INVADER_COLOR_FRONT = "#7cfc9e";
const INVADER_COLOR_BACK = "#ffd166";

// 16x5 pixel-art cannon.
const PLAYER_SPRITE = [
  "0000000110000000",
  "0000011111100000",
  "0001111111111000",
  "0111111111111110",
  "1111111111111111",
];
const PLAYER_SPRITE_COLS = PLAYER_SPRITE[0].length;
const PLAYER_PIXEL_SIZE = PLAYER_WIDTH / PLAYER_SPRITE_COLS;
const PLAYER_COLOR = "#aa3bff";
const PLAYER_HIGHLIGHT_COLOR = "#ffffff";

// Pixel-art missiles. Player round points up, invader bolt points down and
// alternates between two frames for a crackling, wiggling descent.
const PLAYER_BULLET_SPRITE = [
  "00100",
  "01110",
  "01110",
  "01110",
  "11111",
  "01110",
  "10101",
];
const ENEMY_BULLET_SPRITE_A = [
  "00100",
  "01100",
  "00110",
  "00100",
  "01100",
  "00110",
  "00100",
];
const ENEMY_BULLET_SPRITE_B = [
  "00100",
  "00110",
  "01100",
  "00100",
  "00110",
  "01100",
  "00100",
];
const BULLET_PIXEL_SIZE = 2;
const BULLET_SPRITE_COLS = PLAYER_BULLET_SPRITE[0].length;
const BULLET_SPRITE_WIDTH = BULLET_SPRITE_COLS * BULLET_PIXEL_SIZE;
const BULLET_ANIM_INTERVAL = 90; // ms between invader-bolt frames

const PLAYER_BULLET_LOOK = {
  core: "#e8fbff",
  glow: "#8f4bff",
  trail: "#5cd8ff",
};
const ENEMY_BULLET_LOOK = {
  core: "#ffe27a",
  glow: "#ff3b3b",
  trail: "#ff7a3b",
};

type GameStatus = "idle" | "playing" | "lost";

interface Invader {
  col: number;
  row: number;
  x: number;
  y: number;
  alive: boolean;
}

interface Bullet {
  x: number;
  y: number;
}

interface GameState {
  playerX: number;
  bullets: Bullet[];
  enemyBullets: Bullet[];
  invaders: Invader[];
  invaderDirection: 1 | -1;
  invaderStepAccumulator: number;
  invaderStepInterval: number;
  lastShotAt: number;
  score: number;
  lives: number;
  level: number;
  baseInvaderStepInterval: number;
  invaderFrame: 0 | 1;
}

const createInvaders = (): Invader[] => {
  const invaders: Invader[] = [];
  for (let row = 0; row < INVADER_ROWS; row++) {
    for (let col = 0; col < INVADER_COLS; col++) {
      invaders.push({
        col,
        row,
        x: INVADER_START_X + col * (INVADER_WIDTH + INVADER_GAP_X),
        y: INVADER_START_Y + row * (INVADER_HEIGHT + INVADER_GAP_Y),
        alive: true,
      });
    }
  }
  return invaders;
};

const drawBullet = (
  ctx: CanvasRenderingContext2D,
  bullet: Bullet,
  direction: 1 | -1,
  time: number,
  sprite: string[],
  look: { core: string; glow: string; trail: string },
) => {
  const originX = bullet.x + BULLET_WIDTH / 2 - BULLET_SPRITE_WIDTH / 2;

  // Fading exhaust trail streaming out behind the direction of travel.
  ctx.save();
  for (let i = 1; i <= 3; i++) {
    const flicker = (Math.floor(time / 40) + i) % 2;
    ctx.globalAlpha = 0.3 / i;
    ctx.fillStyle = look.trail;
    ctx.fillRect(
      bullet.x - flicker,
      bullet.y - direction * (BULLET_HEIGHT + i * 4),
      BULLET_WIDTH + flicker * 2,
      4,
    );
  }
  ctx.restore();

  // Glowing body.
  ctx.save();
  ctx.shadowColor = look.glow;
  ctx.shadowBlur = 8;
  drawSprite(ctx, sprite, originX, bullet.y, BULLET_PIXEL_SIZE, look.core);
  ctx.restore();
};

const getBaseInvaderStepInterval = (level: number) =>
  Math.max(
    MIN_BASE_INVADER_STEP_INTERVAL,
    BASE_INVADER_STEP_INTERVAL - (level - 1) * INVADER_STEP_INTERVAL_PER_LEVEL,
  );

const getInvaderFireChance = (level: number) =>
  Math.min(
    MAX_INVADER_FIRE_CHANCE,
    INVADER_FIRE_CHANCE + (level - 1) * INVADER_FIRE_CHANCE_PER_LEVEL,
  );

const createGameState = (): GameState => ({
  playerX: CANVAS_WIDTH / 2 - PLAYER_WIDTH / 2,
  bullets: [],
  enemyBullets: [],
  invaders: createInvaders(),
  invaderDirection: 1,
  invaderStepAccumulator: 0,
  invaderStepInterval: BASE_INVADER_STEP_INTERVAL,
  lastShotAt: 0,
  score: 0,
  lives: START_LIVES,
  level: 1,
  baseInvaderStepInterval: BASE_INVADER_STEP_INTERVAL,
  invaderFrame: 0,
});

const SpaceInvaders = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<GameState>(createGameState());
  const keysRef = useRef<Set<string>>(new Set());

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

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.code === "ArrowLeft" ||
        event.code === "ArrowRight" ||
        event.code === "Space"
      ) {
        event.preventDefault();
      }
      keysRef.current.add(event.code);
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      keysRef.current.delete(event.code);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    const stopLoop = startLoop((time, delta) => {
      const game = gameRef.current;
      const keys = keysRef.current;

      if (keys.has("ArrowLeft")) {
        game.playerX = Math.max(0, game.playerX - PLAYER_SPEED * delta);
      }
      if (keys.has("ArrowRight")) {
        game.playerX = Math.min(
          CANVAS_WIDTH - PLAYER_WIDTH,
          game.playerX + PLAYER_SPEED * delta,
        );
      }

      if (keys.has("Space") && time - game.lastShotAt > SHOT_COOLDOWN) {
        game.lastShotAt = time;
        game.bullets.push({
          x: game.playerX + PLAYER_WIDTH / 2 - BULLET_WIDTH / 2,
          y: PLAYER_Y,
        });
      }

      game.bullets = game.bullets
        .map((bullet) => ({
          ...bullet,
          y: bullet.y - PLAYER_BULLET_SPEED * delta,
        }))
        .filter((bullet) => bullet.y + BULLET_HEIGHT > 0);

      game.enemyBullets = game.enemyBullets
        .map((bullet) => ({
          ...bullet,
          y: bullet.y + ENEMY_BULLET_SPEED * delta,
        }))
        .filter((bullet) => bullet.y < CANVAS_HEIGHT);

      game.invaderStepAccumulator += delta;
      if (game.invaderStepAccumulator >= game.invaderStepInterval) {
        game.invaderStepAccumulator = 0;

        const aliveInvaders = game.invaders.filter((invader) => invader.alive);

        if (aliveInvaders.length > 0) {
          const leftMost = Math.min(...aliveInvaders.map((invader) => invader.x));
          const rightMost = Math.max(
            ...aliveInvaders.map((invader) => invader.x + INVADER_WIDTH),
          );

          let dropRow = false;
          let nextDirection = game.invaderDirection;
          if (
            (game.invaderDirection === 1 &&
              rightMost + INVADER_STEP_X > CANVAS_WIDTH) ||
            (game.invaderDirection === -1 && leftMost - INVADER_STEP_X < 0)
          ) {
            nextDirection = game.invaderDirection === 1 ? -1 : 1;
            dropRow = true;
          }

          game.invaders.forEach((invader) => {
            if (!invader.alive) return;
            if (dropRow) {
              invader.y += INVADER_DROP_Y;
            } else {
              invader.x += INVADER_STEP_X * game.invaderDirection;
            }
          });
          game.invaderDirection = nextDirection;
          game.invaderFrame = game.invaderFrame === 0 ? 1 : 0;

          game.invaderStepInterval = Math.max(
            120,
            game.baseInvaderStepInterval -
              (game.invaders.length - aliveInvaders.length) * 12,
          );

          if (Math.random() < getInvaderFireChance(game.level)) {
            const bottomByColumn = new Map<number, Invader>();
            aliveInvaders.forEach((invader) => {
              const current = bottomByColumn.get(invader.col);
              if (!current || invader.y > current.y) {
                bottomByColumn.set(invader.col, invader);
              }
            });
            const shooters = Array.from(bottomByColumn.values());
            const shooter = shooters[Math.floor(Math.random() * shooters.length)];
            if (shooter) {
              game.enemyBullets.push({
                x: shooter.x + INVADER_WIDTH / 2 - BULLET_WIDTH / 2,
                y: shooter.y + INVADER_HEIGHT,
              });
            }
          }
        }
      }

      game.bullets = game.bullets.filter((bullet) => {
        const hit = game.invaders.find(
          (invader) =>
            invader.alive &&
            intersects(
              bullet.x,
              bullet.y,
              BULLET_WIDTH,
              BULLET_HEIGHT,
              invader.x,
              invader.y,
              INVADER_WIDTH,
              INVADER_HEIGHT,
            ),
        );
        if (hit) {
          hit.alive = false;
          game.score += 10;
          return false;
        }
        return true;
      });

      game.enemyBullets = game.enemyBullets.filter((bullet) => {
        const hit = intersects(
          bullet.x,
          bullet.y,
          BULLET_WIDTH,
          BULLET_HEIGHT,
          game.playerX,
          PLAYER_Y,
          PLAYER_WIDTH,
          PLAYER_HEIGHT,
        );
        if (hit) {
          game.lives -= 1;
        }
        return !hit;
      });

      setScore(game.score);
      setLives(game.lives);
      setLevel(game.level);

      ctx.fillStyle = "#0a0a12";
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      const invaderSprite =
        game.invaderFrame === 0 ? INVADER_SPRITE_A : INVADER_SPRITE_B;
      game.invaders.forEach((invader) => {
        if (!invader.alive) return;
        const color =
          invader.row < INVADER_ROWS / 2
            ? INVADER_COLOR_FRONT
            : INVADER_COLOR_BACK;
        drawSprite(ctx, invaderSprite, invader.x, invader.y, INVADER_PIXEL_SIZE, color);
      });

      drawSprite(ctx, PLAYER_SPRITE, game.playerX, PLAYER_Y, PLAYER_PIXEL_SIZE, PLAYER_COLOR);
      ctx.fillStyle = PLAYER_HIGHLIGHT_COLOR;
      ctx.fillRect(
        game.playerX + 7 * PLAYER_PIXEL_SIZE,
        PLAYER_Y,
        2 * PLAYER_PIXEL_SIZE,
        PLAYER_PIXEL_SIZE,
      );

      game.bullets.forEach((bullet) => {
        drawBullet(ctx, bullet, -1, time, PLAYER_BULLET_SPRITE, PLAYER_BULLET_LOOK);
      });

      const enemyBulletFrame =
        Math.floor(time / BULLET_ANIM_INTERVAL) % 2 === 0
          ? ENEMY_BULLET_SPRITE_A
          : ENEMY_BULLET_SPRITE_B;
      game.enemyBullets.forEach((bullet) => {
        drawBullet(ctx, bullet, 1, time, enemyBulletFrame, ENEMY_BULLET_LOOK);
      });

      const allInvadersDestroyed = game.invaders.every(
        (invader) => !invader.alive,
      );
      const invadersReachedPlayer = game.invaders.some(
        (invader) => invader.alive && invader.y + INVADER_HEIGHT >= PLAYER_Y,
      );

      if (game.lives <= 0 || invadersReachedPlayer) {
        setStatus("lost");
        return false;
      }
      if (allInvadersDestroyed) {
        game.level += 1;
        game.invaders = createInvaders();
        game.invaderDirection = 1;
        game.invaderStepAccumulator = 0;
        game.baseInvaderStepInterval = getBaseInvaderStepInterval(game.level);
        game.invaderStepInterval = game.baseInvaderStepInterval;
        game.bullets = [];
        game.enemyBullets = [];
        setLevel(game.level);
      }
    });

    return () => {
      stopLoop();
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [status]);

  return (
    <GameFrame
      title="Space Invaders"
      className={styles.theme}
      hud={[`Level: ${level}`, `Score: ${score}`, `Lives: ${lives}`]}
      canvasRef={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      overlay={
        status === "playing"
          ? null
          : {
              message:
                status === "lost" ? "Game over" : "Defend Earth from the invasion",
              buttonLabel: status === "idle" ? "Start Game" : "Play Again",
              onClick: startGame,
            }
      }
      instructions="Use ← / → to move, Space to shoot"
    />
  );
};

export default SpaceInvaders;

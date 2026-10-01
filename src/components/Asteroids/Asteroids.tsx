import { useCallback, useEffect, useRef, useState } from "react";
import GameFrame from "../shared/GameFrame";
import { startLoop } from "../shared/loop";
import styles from "./Asteroids.module.css";

const CANVAS_WIDTH = 480;
const CANVAS_HEIGHT = 360;

const SHIP_RADIUS = 10;
const TURN_SPEED = 4.2; // radians per second
const THRUST = 150; // px per second^2
const DRAG = 1.1; // exponential drag rate per second
const MAX_SHIP_SPEED = 190; // px per second
const INVULNERABLE_TIME = 2.2; // seconds after (re)spawning
const HYPERSPACE_COOLDOWN = 1.5; // seconds

const BULLET_SPEED = 420; // px per second, on top of the ship's own speed
const BULLET_LIFE = 0.85; // seconds
const MAX_BULLETS = 5;
const SHOT_COOLDOWN = 0.18; // seconds

const START_LIVES = 3;
const EXTRA_LIFE_EVERY = 10000;
const WAVE_DELAY = 1.6; // seconds between clearing a wave and the next one
const SAFE_SPAWN_DISTANCE = 130;

type RockSize = 0 | 1 | 2; // large, medium, small
const ROCK_RADIUS = [34, 19, 10];
const ROCK_SPEED = [38, 66, 104]; // px per second, before the wave bonus
const ROCK_POINTS = [20, 50, 100];
const ROCK_VERTICES = 11;

const SHIP_COLOR = "#e8fbff";
const SHIP_GLOW = "#ff3db0";
const FLAME_COLOR = "#ffb03d";
const ROCK_COLOR = "#b9c0d8";
const ROCK_GLOW = "#6b7290";
const BULLET_COLOR = "#ff8ad8";

type GameStatus = "idle" | "playing" | "lost";

interface Ship {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number; // 0 points up
  invulnerable: number;
  /** 1 thrusting forward, -1 in reverse, 0 coasting. */
  thrust: 1 | 0 | -1;
}

interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

interface Rock {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: RockSize;
  angle: number;
  spin: number;
  /** Per-vertex radius multipliers that give each rock its lumpy outline. */
  shape: number[];
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
}

interface GameState {
  ship: Ship | null; // null while waiting to respawn
  bullets: Bullet[];
  rocks: Rock[];
  particles: Particle[];
  score: number;
  lives: number;
  wave: number;
  nextExtraLife: number;
  shotCooldown: number;
  hyperspaceCooldown: number;
  /** Counts down between waves and while the ship is waiting to respawn. */
  waveTimer: number;
  respawnTimer: number;
}

// Faint fixed starfield.
const STARS = Array.from({ length: 60 }, (_, i) => ({
  x: (i * 197.3) % CANVAS_WIDTH,
  y: (i * 89.9) % CANVAS_HEIGHT,
  big: i % 5 === 0,
}));

const rand = (min: number, max: number) => min + Math.random() * (max - min);

const wrap = (value: number, max: number, margin: number) => {
  if (value < -margin) return value + max + margin * 2;
  if (value > max + margin) return value - max - margin * 2;
  return value;
};

const createShip = (): Ship => ({
  x: CANVAS_WIDTH / 2,
  y: CANVAS_HEIGHT / 2,
  vx: 0,
  vy: 0,
  angle: 0,
  invulnerable: INVULNERABLE_TIME,
  thrust: 0,
});

const createRock = (
  x: number,
  y: number,
  size: RockSize,
  wave: number,
): Rock => {
  const heading = rand(0, Math.PI * 2);
  const speed = ROCK_SPEED[size] * rand(0.7, 1.2) * (1 + (wave - 1) * 0.1);
  return {
    x,
    y,
    vx: Math.cos(heading) * speed,
    vy: Math.sin(heading) * speed,
    size,
    angle: rand(0, Math.PI * 2),
    spin: rand(-1.2, 1.2),
    shape: Array.from({ length: ROCK_VERTICES }, () => rand(0.72, 1.18)),
  };
};

// Large rocks enter from the edges, never on top of the player.
const createWave = (wave: number, avoidX: number, avoidY: number): Rock[] => {
  const count = Math.min(11, 3 + wave);
  const rocks: Rock[] = [];
  while (rocks.length < count) {
    const onVerticalEdge = Math.random() < 0.5;
    const x = onVerticalEdge ? (Math.random() < 0.5 ? 0 : CANVAS_WIDTH) : rand(0, CANVAS_WIDTH);
    const y = onVerticalEdge ? rand(0, CANVAS_HEIGHT) : Math.random() < 0.5 ? 0 : CANVAS_HEIGHT;
    if (Math.hypot(x - avoidX, y - avoidY) < SAFE_SPAWN_DISTANCE) continue;
    rocks.push(createRock(x, y, 0, wave));
  }
  return rocks;
};

const createGameState = (): GameState => ({
  ship: createShip(),
  bullets: [],
  rocks: createWave(1, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2),
  particles: [],
  score: 0,
  lives: START_LIVES,
  wave: 1,
  nextExtraLife: EXTRA_LIFE_EVERY,
  shotCooldown: 0,
  hyperspaceCooldown: 0,
  waveTimer: 0,
  respawnTimer: 0,
});

const burst = (
  game: GameState,
  x: number,
  y: number,
  count: number,
  speed: number,
  color: string,
) => {
  for (let i = 0; i < count; i++) {
    const heading = rand(0, Math.PI * 2);
    const v = rand(speed * 0.3, speed);
    const life = rand(0.35, 0.9);
    game.particles.push({
      x,
      y,
      vx: Math.cos(heading) * v,
      vy: Math.sin(heading) * v,
      life,
      maxLife: life,
      color,
    });
  }
};

// The respawn point is only safe once no rock is drifting through it.
const centreIsClear = (game: GameState) =>
  game.rocks.every(
    (rock) =>
      Math.hypot(rock.x - CANVAS_WIDTH / 2, rock.y - CANVAS_HEIGHT / 2) >
      ROCK_RADIUS[rock.size] + SHIP_RADIUS * 4,
  );

const drawShip = (ctx: CanvasRenderingContext2D, ship: Ship, time: number) => {
  // Blink while invulnerable.
  if (ship.invulnerable > 0 && Math.floor(time / 110) % 2 === 0) return;

  ctx.save();
  ctx.translate(ship.x, ship.y);
  ctx.rotate(ship.angle);
  ctx.lineWidth = 1.6;
  ctx.lineJoin = "round";

  if (ship.thrust !== 0) {
    const flicker = rand(0.7, 1.25);
    ctx.strokeStyle = FLAME_COLOR;
    ctx.shadowColor = FLAME_COLOR;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    if (ship.thrust > 0) {
      // Main engine out of the tail.
      ctx.moveTo(-SHIP_RADIUS * 0.45, SHIP_RADIUS * 0.7);
      ctx.lineTo(0, SHIP_RADIUS * (0.8 + flicker));
      ctx.lineTo(SHIP_RADIUS * 0.45, SHIP_RADIUS * 0.7);
    } else {
      // Retro jets either side of the nose.
      for (const side of [-1, 1]) {
        ctx.moveTo(side * SHIP_RADIUS * 0.3, -SHIP_RADIUS * 0.6);
        ctx.lineTo(side * SHIP_RADIUS * 0.45, -SHIP_RADIUS * (0.9 + flicker * 0.6));
      }
    }
    ctx.stroke();
  }

  ctx.strokeStyle = SHIP_COLOR;
  ctx.shadowColor = SHIP_GLOW;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.moveTo(0, -SHIP_RADIUS * 1.25);
  ctx.lineTo(SHIP_RADIUS * 0.85, SHIP_RADIUS);
  ctx.lineTo(0, SHIP_RADIUS * 0.55);
  ctx.lineTo(-SHIP_RADIUS * 0.85, SHIP_RADIUS);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
};

const drawRock = (ctx: CanvasRenderingContext2D, rock: Rock) => {
  const radius = ROCK_RADIUS[rock.size];
  ctx.save();
  ctx.translate(rock.x, rock.y);
  ctx.rotate(rock.angle);
  ctx.strokeStyle = ROCK_COLOR;
  ctx.shadowColor = ROCK_GLOW;
  ctx.shadowBlur = 6;
  ctx.lineWidth = 1.5;
  ctx.lineJoin = "round";
  ctx.beginPath();
  rock.shape.forEach((mul, i) => {
    const a = (i / rock.shape.length) * Math.PI * 2;
    const px = Math.cos(a) * radius * mul;
    const py = Math.sin(a) * radius * mul;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
};

const Asteroids = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<GameState>(createGameState());
  const keysRef = useRef<Set<string>>(new Set());

  const [status, setStatus] = useState<GameStatus>("idle");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(START_LIVES);
  const [wave, setWave] = useState(1);

  const startGame = useCallback(() => {
    gameRef.current = createGameState();
    setScore(0);
    setLives(START_LIVES);
    setWave(1);
    setStatus("playing");
  }, []);

  useEffect(() => {
    if (status !== "playing") return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const heldKeys = keysRef.current;
    heldKeys.clear();

    const HANDLED_KEYS = new Set([
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "Space",
      "KeyW",
      "KeyA",
      "KeyS",
      "KeyD",
      "ShiftLeft",
      "ShiftRight",
    ]);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (HANDLED_KEYS.has(event.code)) event.preventDefault();
      heldKeys.add(event.code);
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      heldKeys.delete(event.code);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    const game = gameRef.current;

    const destroyShip = (ship: Ship) => {
      burst(game, ship.x, ship.y, 26, 150, SHIP_COLOR);
      burst(game, ship.x, ship.y, 12, 90, SHIP_GLOW);
      game.ship = null;
      game.lives -= 1;
      game.respawnTimer = 1.4;
      setLives(game.lives);
    };

    const splitRock = (rock: Rock) => {
      const radius = ROCK_RADIUS[rock.size];
      burst(game, rock.x, rock.y, 6 + (2 - rock.size) * 5, 110, ROCK_COLOR);
      game.score += ROCK_POINTS[rock.size];
      if (rock.size < 2) {
        const next = (rock.size + 1) as RockSize;
        for (let i = 0; i < 2; i++) {
          game.rocks.push(
            createRock(
              rock.x + rand(-radius, radius) * 0.4,
              rock.y + rand(-radius, radius) * 0.4,
              next,
              game.wave,
            ),
          );
        }
      }
    };

    const stopLoop = startLoop((time, deltaMs) => {
      const dt = Math.min(0.05, deltaMs / 1000);
      const keys = heldKeys;
      const ship = game.ship;

      game.shotCooldown = Math.max(0, game.shotCooldown - dt);
      game.hyperspaceCooldown = Math.max(0, game.hyperspaceCooldown - dt);

      if (ship) {
        const left = keys.has("ArrowLeft") || keys.has("KeyA");
        const right = keys.has("ArrowRight") || keys.has("KeyD");
        ship.angle += ((right ? 1 : 0) - (left ? 1 : 0)) * TURN_SPEED * dt;

        const forward = keys.has("ArrowUp") || keys.has("KeyW");
        const reverse = keys.has("ArrowDown") || keys.has("KeyS");
        ship.thrust = ((forward ? 1 : 0) - (reverse ? 1 : 0)) as 1 | 0 | -1;
        ship.vx += Math.sin(ship.angle) * THRUST * ship.thrust * dt;
        ship.vy -= Math.cos(ship.angle) * THRUST * ship.thrust * dt;
        const drag = Math.exp(-DRAG * dt);
        ship.vx *= drag;
        ship.vy *= drag;
        const speed = Math.hypot(ship.vx, ship.vy);
        if (speed > MAX_SHIP_SPEED) {
          ship.vx *= MAX_SHIP_SPEED / speed;
          ship.vy *= MAX_SHIP_SPEED / speed;
        }
        ship.x = wrap(ship.x + ship.vx * dt, CANVAS_WIDTH, SHIP_RADIUS);
        ship.y = wrap(ship.y + ship.vy * dt, CANVAS_HEIGHT, SHIP_RADIUS);
        ship.invulnerable = Math.max(0, ship.invulnerable - dt);

        if (
          keys.has("Space") &&
          game.shotCooldown === 0 &&
          game.bullets.length < MAX_BULLETS
        ) {
          game.shotCooldown = SHOT_COOLDOWN;
          const noseX = ship.x + Math.sin(ship.angle) * SHIP_RADIUS * 1.25;
          const noseY = ship.y - Math.cos(ship.angle) * SHIP_RADIUS * 1.25;
          game.bullets.push({
            x: noseX,
            y: noseY,
            vx: ship.vx + Math.sin(ship.angle) * BULLET_SPEED,
            vy: ship.vy - Math.cos(ship.angle) * BULLET_SPEED,
            life: BULLET_LIFE,
          });
        }

        if (
          (keys.has("ShiftLeft") || keys.has("ShiftRight")) &&
          game.hyperspaceCooldown === 0
        ) {
          game.hyperspaceCooldown = HYPERSPACE_COOLDOWN;
          burst(game, ship.x, ship.y, 10, 80, SHIP_GLOW);
          ship.x = rand(SHIP_RADIUS * 2, CANVAS_WIDTH - SHIP_RADIUS * 2);
          ship.y = rand(SHIP_RADIUS * 2, CANVAS_HEIGHT - SHIP_RADIUS * 2);
          ship.vx = 0;
          ship.vy = 0;
          burst(game, ship.x, ship.y, 10, 80, SHIP_GLOW);
        }
      } else if (game.lives > 0) {
        game.respawnTimer -= dt;
        if (game.respawnTimer <= 0 && centreIsClear(game)) {
          game.ship = createShip();
        }
      }

      for (const bullet of game.bullets) {
        bullet.x = wrap(bullet.x + bullet.vx * dt, CANVAS_WIDTH, 0);
        bullet.y = wrap(bullet.y + bullet.vy * dt, CANVAS_HEIGHT, 0);
        bullet.life -= dt;
      }
      game.bullets = game.bullets.filter((bullet) => bullet.life > 0);

      for (const rock of game.rocks) {
        const radius = ROCK_RADIUS[rock.size];
        rock.x = wrap(rock.x + rock.vx * dt, CANVAS_WIDTH, radius);
        rock.y = wrap(rock.y + rock.vy * dt, CANVAS_HEIGHT, radius);
        rock.angle += rock.spin * dt;
      }

      for (const particle of game.particles) {
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.life -= dt;
      }
      game.particles = game.particles.filter((particle) => particle.life > 0);

      // Bullets vs rocks. Iterate over a snapshot so fragments spawned this
      // frame can't be hit by the same bullet.
      for (const rock of [...game.rocks]) {
        const radius = ROCK_RADIUS[rock.size];
        const hitIndex = game.bullets.findIndex(
          (bullet) => Math.hypot(bullet.x - rock.x, bullet.y - rock.y) < radius,
        );
        if (hitIndex === -1) continue;
        game.bullets.splice(hitIndex, 1);
        game.rocks.splice(game.rocks.indexOf(rock), 1);
        splitRock(rock);
      }

      // Ship vs rocks.
      const liveShip = game.ship;
      if (liveShip && liveShip.invulnerable === 0) {
        const hit = game.rocks.find(
          (rock) =>
            Math.hypot(rock.x - liveShip.x, rock.y - liveShip.y) <
            ROCK_RADIUS[rock.size] + SHIP_RADIUS * 0.75,
        );
        if (hit) {
          game.rocks.splice(game.rocks.indexOf(hit), 1);
          splitRock(hit);
          destroyShip(liveShip);
        }
      }

      if (game.score >= game.nextExtraLife) {
        game.nextExtraLife += EXTRA_LIFE_EVERY;
        game.lives += 1;
        setLives(game.lives);
      }

      // Wave cleared: pause briefly, then send in the next one.
      if (game.rocks.length === 0) {
        if (game.waveTimer === 0) game.waveTimer = WAVE_DELAY;
        game.waveTimer -= dt;
        if (game.waveTimer <= 0) {
          game.waveTimer = 0;
          game.wave += 1;
          const avoid = game.ship ?? { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 };
          game.rocks = createWave(game.wave, avoid.x, avoid.y);
          setWave(game.wave);
        }
      }

      setScore(game.score);

      // Draw.
      ctx.fillStyle = "#07060d";
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      ctx.fillStyle = "#dfe6ff";
      for (const star of STARS) {
        ctx.globalAlpha = star.big ? 0.7 : 0.35;
        const size = star.big ? 2 : 1;
        ctx.fillRect(star.x, star.y, size, size);
      }
      ctx.globalAlpha = 1;

      for (const rock of game.rocks) drawRock(ctx, rock);

      ctx.save();
      ctx.fillStyle = BULLET_COLOR;
      ctx.shadowColor = SHIP_GLOW;
      ctx.shadowBlur = 8;
      for (const bullet of game.bullets) {
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      for (const particle of game.particles) {
        ctx.globalAlpha = particle.life / particle.maxLife;
        ctx.fillStyle = particle.color;
        ctx.fillRect(particle.x - 1, particle.y - 1, 2, 2);
      }
      ctx.globalAlpha = 1;

      if (game.ship) drawShip(ctx, game.ship, time);

      if (game.rocks.length === 0 && game.waveTimer > 0) {
        ctx.fillStyle = SHIP_COLOR;
        ctx.font = "bold 16px ui-monospace, monospace";
        ctx.textAlign = "center";
        ctx.fillText(`WAVE ${game.wave + 1}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      }

      // Let the final explosion play out before calling it.
      if (!game.ship && game.lives <= 0 && game.particles.length === 0) {
        setStatus("lost");
        return false;
      }
    });

    return () => {
      stopLoop();
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      heldKeys.clear();
    };
  }, [status]);

  return (
    <GameFrame
      title="Asteroids"
      className={styles.theme}
      hud={[`Wave: ${wave}`, `Score: ${score}`, `Lives: ${lives}`]}
      canvasRef={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      overlay={
        status === "playing"
          ? null
          : {
              message:
                status === "lost" ? "Game over" : "Clear the belt, rock by rock",
              buttonLabel: status === "idle" ? "Start Game" : "Play Again",
              onClick: startGame,
            }
      }
      instructions="← / → to rotate, ↑ / ↓ to thrust forward / back, Space to fire, Shift for hyperspace"
    />
  );
};

export default Asteroids;

import type { ComponentType } from "react";
import { SpaceInvaders, RetroPlatformer, PacMan, Asteroids } from "../components";

export interface ControlHint {
  keys: string;
  action: string;
}

/** Which on-screen buttons the touch gamepad should show for a game. */
export interface PadLayout {
  dpad: "horizontal" | "full";
  action?: { code: string; label: string };
}

export interface GameMeta {
  id: string;
  title: string;
  emoji: string;
  /** One-liner for the cabinet card. */
  tagline: string;
  /** Fuller pitch shown on the game page. */
  blurb: string;
  accent: string;
  glow: string;
  year: string;
  players: string;
  genre: string;
  difficulty: string;
  controls: ControlHint[];
  tips: string[];
  pad: PadLayout;
  Component: ComponentType;
}

export const GAMES: GameMeta[] = [
  {
    id: "space-invaders",
    title: "Space Invaders",
    emoji: "👾",
    tagline: "Rows of wiggling aliens march on Earth. Just you and a laser cannon.",
    blurb:
      "Clear a wave and the next one drops faster and shoots meaner. Every level ratchets up the fire rate and the march speed — see how many waves you can hold the line for.",
    accent: "#3dff9a",
    glow: "rgba(61, 255, 154, 0.55)",
    year: "1978",
    players: "1P",
    genre: "Fixed shooter",
    difficulty: "Ramps every wave",
    controls: [
      { keys: "← →", action: "Move cannon" },
      { keys: "Space", action: "Fire" },
    ],
    tips: [
      "Pick off the columns' edges so the swarm has less room to drop.",
      "Keep moving — a parked cannon is a dead cannon.",
      "The last alien is the fastest. Lead your shot.",
    ],
    pad: { dpad: "horizontal", action: { code: "Space", label: "Fire" } },
    Component: SpaceInvaders,
  },
  {
    id: "retro-platformer",
    title: "Retro Platformer",
    emoji: "🍄",
    tagline: "Run, jump, stomp, grab the coins, reach the flag across three stages.",
    blurb:
      "Coyote-time and jump-buffering are baked in, so the platforming actually feels good. Three hand-drawn stages, each with faster critters than the last. Stomp from above or don't touch them at all.",
    accent: "#38e8ff",
    glow: "rgba(56, 232, 255, 0.55)",
    year: "1985",
    players: "1P",
    genre: "Platformer",
    difficulty: "3 stages, rising",
    controls: [
      { keys: "← →  /  A D", action: "Run" },
      { keys: "Space / ↑ / W", action: "Jump" },
    ],
    tips: [
      "Tap jump for a hop, hold it for full height.",
      "Land on a critter's head — anything else costs a life.",
      "Full coin runs bank a big end-of-stage bonus.",
    ],
    pad: { dpad: "horizontal", action: { code: "Space", label: "Jump" } },
    Component: RetroPlatformer,
  },
  {
    id: "pac-man",
    title: "Pac-Man",
    emoji: "🟡",
    tagline: "Eat every pellet. Dodge four ghosts with real scatter/chase brains.",
    blurb:
      "Blinky chases, Pinky cuts you off, Inky flanks and Clyde does his own thing. Chomp a power pellet to flip the maze and hunt them down for a rising combo — 200, 400, 800, 1600.",
    accent: "#ffd23d",
    glow: "rgba(255, 210, 61, 0.55)",
    year: "1980",
    players: "1P",
    genre: "Maze chase",
    difficulty: "Faster each maze",
    controls: [
      { keys: "Arrows / WASD", action: "Steer" },
      { keys: "Power pellet", action: "Turn the tables" },
    ],
    tips: [
      "Queue your next turn early — Pac-Man banks it at the junction.",
      "Ghosts reverse direction when the mode flips. Use it to slip past.",
      "Save power pellets for when the ghosts have you boxed in.",
    ],
    pad: { dpad: "full" },
    Component: PacMan,
  },
  {
    id: "asteroids",
    title: "Asteroids",
    emoji: "☄️",
    tagline: "A lone ship, a drifting rock field and a very twitchy trigger finger.",
    blurb:
      "Big rocks split into medium ones, medium into small, small into dust. Momentum carries you, so feather the thrust and lean on the brake. Each wave brings more rocks and faster drift, and every 10,000 points earns a spare ship.",
    accent: "#ff3db0",
    glow: "rgba(255, 61, 176, 0.55)",
    year: "1979",
    players: "1P",
    genre: "Multidirectional shooter",
    difficulty: "More rocks every wave",
    controls: [
      { keys: "← →  /  A D", action: "Rotate" },
      { keys: "↑ / W", action: "Thrust" },
      { keys: "↓ / S", action: "Brake" },
      { keys: "Space", action: "Fire" },
      { keys: "Shift", action: "Hyperspace" },
    ],
    tips: [
      "Tap thrust in short bursts and brake before you drift into trouble.",
      "Shatter the big rocks early, before the fragments fill the sky.",
      "Hyperspace is a panic button. You might land somewhere worse.",
    ],
    pad: { dpad: "full", action: { code: "Space", label: "Fire" } },
    Component: Asteroids,
  },
];

export const getGame = (id: string | undefined) =>
  GAMES.find((game) => game.id === id);

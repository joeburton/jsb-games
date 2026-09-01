import { useState } from "react";
import type { GameMeta } from "./games";
import TouchControls from "./TouchControls";
import styles from "./GameScreen.module.css";

interface Props {
  game: GameMeta;
}

const GameScreen = ({ game }: Props) => {
  const { Component } = game;
  const [showPad, setShowPad] = useState(true);

  return (
    <main
      className={styles.wrap}
      style={
        {
          "--accent": game.accent,
          "--accent-bg": `color-mix(in srgb, ${game.accent} 14%, transparent)`,
          "--accent-border": `color-mix(in srgb, ${game.accent} 55%, transparent)`,
          "--game-glow": game.glow,
        } as React.CSSProperties
      }
    >
      <a href="#/" className={styles.back}>
        <span aria-hidden="true">◀</span> All games
      </a>

      <div className={styles.layout}>
        <section className={styles.cabinet}>
          <div className={styles.marquee}>
            <span className={styles.emoji} aria-hidden="true">
              {game.emoji}
            </span>
            <h1 className={styles.title}>{game.title}</h1>
            <span className={styles.year}>{game.year}</span>
          </div>

          <div className={styles.stage}>
            <Component />
          </div>

          <div className={styles.padZone}>
            <button
              type="button"
              className={styles.padToggle}
              onClick={() => setShowPad((v) => !v)}
            >
              {showPad ? "Hide" : "Show"} touch controls
            </button>
            {showPad && <TouchControls layout={game.pad} accent={game.accent} />}
          </div>
        </section>

        <aside className={styles.panel}>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>The pitch</h2>
            <p className={styles.blurb}>{game.blurb}</p>
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Controls</h2>
            <ul className={styles.controlList}>
              {game.controls.map((c) => (
                <li key={c.action}>
                  <span className={styles.keys}>{c.keys}</span>
                  <span>{c.action}</span>
                </li>
              ))}
            </ul>
            <p className={styles.padNote}>
              On a phone? Use the on-screen pad under the screen.
            </p>
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Field notes</h2>
            <ul className={styles.tips}>
              {game.tips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </div>

          <dl className={styles.specs}>
            <div>
              <dt>Genre</dt>
              <dd>{game.genre}</dd>
            </div>
            <div>
              <dt>Players</dt>
              <dd>{game.players}</dd>
            </div>
            <div>
              <dt>Difficulty</dt>
              <dd>{game.difficulty}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </main>
  );
};

export default GameScreen;

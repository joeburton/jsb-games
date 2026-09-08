import { GAMES } from "./games";
import styles from "./Home.module.css";

const Home = () => {
  return (
    <main className={styles.home}>
      <section className={styles.hero}>
        <p className={styles.kicker}>
          <span className={styles.dot} /> Now playing · est. no year in
          particular
        </p>
        <h1 className={styles.title}>
          JSB<span className={styles.title2}>GAMES</span>
        </h1>
        <p className={styles.subtitle}>
          A tiny arcade cabinet that lives in your browser
        </p>
        <p className={styles.lede}>
          Three certified classics, rebuilt from scratch in React + TypeScript.
          Pixel sprites hand-coded as strings of <code>0</code>s and{" "}
          <code>1</code>s. Chiptune vibes sold separately.
        </p>
        <p className={styles.coinline}>
          <span className={styles.blink}>▸</span> Insert coin. No coin? That's
          fine, it's free. 🪙
        </p>
        <div className={styles.stats}>
          <div>
            <b>3</b>
            <span>games</span>
          </div>
          <div>
            <b>3</b>
            <span>lives each</span>
          </div>
          <div>
            <b>∞</b>
            <span>difficulty</span>
          </div>
          <div>
            <b>0</b>
            <span>cost</span>
          </div>
        </div>
      </section>

      <section className={styles.grid} aria-label="Choose a game">
        {GAMES.map((game, i) => (
          <a
            key={game.id}
            href={`#/game/${game.id}`}
            className={styles.cab}
            style={
              {
                "--cab-accent": game.accent,
                "--cab-glow": game.glow,
              } as React.CSSProperties
            }
          >
            <div className={styles.marquee}>
              <span className={styles.slot}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className={styles.marqueeName}>{game.title}</span>
            </div>

            <div className={styles.screen}>
              <span className={styles.bigEmoji} aria-hidden="true">
                {game.emoji}
              </span>
              <span className={styles.scan} />
            </div>

            <div className={styles.cabBody}>
              <p className={styles.tagline}>{game.tagline}</p>
              <div className={styles.meta}>
                <span>{game.genre}</span>
                <span>·</span>
                <span>{game.year}</span>
                <span>·</span>
                <span>{game.players}</span>
              </div>
              <div className={styles.controls}>
                {game.controls.map((c) => (
                  <span key={c.action} className={styles.chip}>
                    <b>{c.keys}</b> {c.action}
                  </span>
                ))}
              </div>
              <span className={styles.play}>
                Play <span aria-hidden="true">▶</span>
              </span>
            </div>
          </a>
        ))}
      </section>

      <footer className={styles.footer}>
        <p>
          Built with React 19, <code>&lt;canvas&gt;</code> +{" "}
          <code>requestAnimationFrame</code>, and no external game engine.
        </p>
        <p className={styles.egg}>
          🥚 There's a working task manager hiding in{" "}
          <code>src/components</code>. Swap the imports if you'd rather organise
          your day than save the galaxy.
        </p>
      </footer>
    </main>
  );
};

export default Home;

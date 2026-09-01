import { GAMES } from "./games";
import type { Route } from "./useHashRoute";
import styles from "./NavBar.module.css";

interface Props {
  route: Route;
}

const NavBar = ({ route }: Props) => {
  const activeId = route.name === "game" ? route.id : null;

  return (
    <header className={styles.bar}>
      <a href="#/" className={styles.brand} aria-label="JSB Games home">
        <span className={styles.coin}>🕹️</span>
        <span className={styles.wordmark}>
          JSB<span className={styles.word2}>GAMES</span>
        </span>
      </a>

      <nav className={styles.links} aria-label="Games">
        {GAMES.map((game) => (
          <a
            key={game.id}
            href={`#/game/${game.id}`}
            className={styles.link}
            data-active={activeId === game.id}
            style={{ "--tab-accent": game.accent } as React.CSSProperties}
          >
            <span className={styles.linkEmoji} aria-hidden="true">
              {game.emoji}
            </span>
            <span className={styles.linkText}>{game.title}</span>
          </a>
        ))}
      </nav>
    </header>
  );
};

export default NavBar;

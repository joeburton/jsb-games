import NavBar from "./site/NavBar";
import Home from "./site/Home";
import GameScreen from "./site/GameScreen";
import { getGame } from "./site/games";
import { useHashRoute } from "./site/useHashRoute";
import styles from "./App.module.css";

function App() {
  const route = useHashRoute();
  const game = route.name === "game" ? getGame(route.id) : undefined;

  return (
    <>
      <NavBar route={route} />

      {route.name === "home" && <Home />}
      {route.name === "game" && game && <GameScreen game={game} />}

      {((route.name === "game" && !game) || route.name === "not-found") && (
        <main className={styles.missing}>
          <p className={styles.glitch}>404</p>
          <h1>Cabinet out of order</h1>
          <p>That game isn't plugged in. Try one that is.</p>
          <a href="#/" className={styles.home}>
            ◀ Back to the arcade
          </a>
        </main>
      )}

      <div className="crt" />
    </>
  );
}

export default App;

import type { ReactNode, Ref } from "react";
import styles from "./GameFrame.module.css";

interface Overlay {
  message: string;
  buttonLabel: string;
  onClick: () => void;
}

interface Props {
  title: string;
  /** Theme class from the game's own CSS module (sets the frame's custom properties). */
  className: string;
  /** HUD readouts, rendered left to right. */
  hud: ReactNode[];
  canvasRef: Ref<HTMLCanvasElement>;
  width: number;
  height: number;
  /** Shown over the canvas when the game isn't running. */
  overlay: Overlay | null;
  instructions: string;
}

/** HUD, canvas and start / game-over overlay shared by every canvas game. */
const GameFrame = ({
  title,
  className,
  hud,
  canvasRef,
  width,
  height,
  overlay,
  instructions,
}: Props) => (
  <div className={`${styles.frame} ${className}`}>
    <h2>{title}</h2>
    <div className={styles.hud}>
      {hud.map((item, i) => (
        <span key={i}>{item}</span>
      ))}
    </div>
    <div
      className={styles.canvasWrapper}
      style={{ aspectRatio: `${width} / ${height}` }}
    >
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className={styles.canvas}
      />
      {overlay && (
        <div className={styles.overlay}>
          <p>{overlay.message}</p>
          <button
            type="button"
            className={styles.button}
            onClick={overlay.onClick}
          >
            {overlay.buttonLabel}
          </button>
        </div>
      )}
    </div>
    <p className={styles.instructions}>{instructions}</p>
  </div>
);

export default GameFrame;

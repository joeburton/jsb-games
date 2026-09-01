import { useCallback, useEffect, useRef } from "react";
import type { PadLayout } from "./games";
import styles from "./TouchControls.module.css";

interface Props {
  layout: PadLayout;
  accent: string;
}

const KEY_NAME: Record<string, string> = {
  ArrowUp: "ArrowUp",
  ArrowDown: "ArrowDown",
  ArrowLeft: "ArrowLeft",
  ArrowRight: "ArrowRight",
  Space: " ",
};

/**
 * On-screen D-pad that lets the keyboard-only games be played by thumb.
 * Each button synthesises the same `keydown` / `keyup` events on `window`
 * that the games already listen for, keyed by `event.code`.
 */
const TouchControls = ({ layout, accent }: Props) => {
  const held = useRef<Set<string>>(new Set());

  const send = useCallback((type: "keydown" | "keyup", code: string) => {
    window.dispatchEvent(
      new KeyboardEvent(type, {
        code,
        key: KEY_NAME[code] ?? code,
        bubbles: true,
        cancelable: true,
      }),
    );
  }, []);

  const press = useCallback(
    (code: string) => {
      if (held.current.has(code)) return;
      held.current.add(code);
      send("keydown", code);
    },
    [send],
  );

  const release = useCallback(
    (code: string) => {
      if (!held.current.has(code)) return;
      held.current.delete(code);
      send("keyup", code);
    },
    [send],
  );

  // Never leave a key stuck down if the component unmounts mid-press.
  useEffect(() => {
    const heldSet = held.current;
    return () => {
      heldSet.forEach((code) =>
        window.dispatchEvent(new KeyboardEvent("keyup", { code })),
      );
      heldSet.clear();
    };
  }, []);

  const bind = (code: string) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture?.(e.pointerId);
      press(code);
    },
    onPointerUp: (e: React.PointerEvent) => {
      e.preventDefault();
      release(code);
    },
    onPointerCancel: () => release(code),
    onPointerLeave: () => release(code),
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  });

  const full = layout.dpad === "full";

  return (
    <div
      className={styles.pad}
      style={{ "--pad-accent": accent } as React.CSSProperties}
      aria-hidden="true"
    >
      <div className={full ? styles.dpadFull : styles.dpadRow}>
        {full && (
          <button
            type="button"
            className={`${styles.key} ${styles.up}`}
            {...bind("ArrowUp")}
          >
            ▲
          </button>
        )}
        <button
          type="button"
          className={`${styles.key} ${styles.left}`}
          {...bind("ArrowLeft")}
        >
          ◀
        </button>
        {full && (
          <button
            type="button"
            className={`${styles.key} ${styles.down}`}
            {...bind("ArrowDown")}
          >
            ▼
          </button>
        )}
        <button
          type="button"
          className={`${styles.key} ${styles.right}`}
          {...bind("ArrowRight")}
        >
          ▶
        </button>
      </div>

      {layout.action && (
        <button
          type="button"
          className={`${styles.key} ${styles.action}`}
          {...bind(layout.action.code)}
        >
          {layout.action.label}
        </button>
      )}
    </div>
  );
};

export default TouchControls;

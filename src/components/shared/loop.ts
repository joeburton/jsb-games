/**
 * Runs `tick` once per animation frame until it returns `false` or the
 * returned cancel function is called. `deltaMs` is 0 on the first frame.
 */
export const startLoop = (
  tick: (time: number, deltaMs: number) => boolean | void,
): (() => void) => {
  let frame = 0;
  let lastTime = 0;

  const run = (time: number) => {
    const deltaMs = lastTime ? time - lastTime : 0;
    lastTime = time;
    if (tick(time, deltaMs) === false) return;
    frame = requestAnimationFrame(run);
  };

  frame = requestAnimationFrame(run);
  return () => cancelAnimationFrame(frame);
};

const DELAYS = [1_000, 3_000, 10_000];

/** One bounded retry cycle shared by startup, online and foreground events. */
export function createPreferenceRetry(
  sync: () => Promise<boolean>,
  online: () => boolean,
) {
  let disposed = false;
  let running = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const pause = () => {
    clearTimeout(timer);
    timer = undefined;
  };

  const run = async (attempt: number) => {
    if (disposed || running || !online()) return;
    running = true;
    let succeeded = false;
    try {
      succeeded = await sync();
    } catch {
      // Treat unexpected request failures like other unsuccessful attempts.
    } finally {
      running = false;
    }
    if (disposed || succeeded || !online() || attempt >= DELAYS.length) return;
    timer = setTimeout(() => {
      timer = undefined;
      void run(attempt + 1);
    }, DELAYS[attempt]);
  };

  return {
    start: () => {
      if (disposed || running || timer !== undefined) return;
      void run(0);
    },
    pause,
    dispose: () => {
      disposed = true;
      pause();
    },
  };
}

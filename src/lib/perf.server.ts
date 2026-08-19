/** Fire-and-forget + latency instrumentation helpers for the Telegram pipeline. */

type WaitUntil = (p: Promise<unknown>) => void;

function findWaitUntil(): WaitUntil | null {
  const g = globalThis as unknown as Record<string, any>;
  const candidates = [
    g["__lovableExecutionCtx"],
    g["executionCtx"],
    g["ctx"],
  ];
  for (const c of candidates) {
    if (c && typeof c.waitUntil === "function") return c.waitUntil.bind(c);
  }
  return null;
}

/**
 * Runs work after the HTTP response is returned.
 * Uses the platform waitUntil when available; otherwise lets the promise run detached.
 */
export function runBackground(work: () => Promise<unknown>, label: string): void {
  const promise = (async () => {
    try {
      await work();
    } catch (error) {
      console.error(`[background:${label}]`, error);
    }
  })();
  const waitUntil = findWaitUntil();
  if (waitUntil) waitUntil(promise);
  else void promise;
}

export type Timings = Record<string, number>;

export function createTimer() {
  const start = Date.now();
  let last = start;
  const marks: Timings = {};
  return {
    mark(name: string) {
      const now = Date.now();
      marks[name] = now - last;
      last = now;
    },
    set(name: string, ms: number) {
      marks[name] = ms;
    },
    total() {
      return Date.now() - start;
    },
    result(): Timings {
      return { ...marks, total_processing_ms: Date.now() - start };
    },
  };
}

/** Races a promise against a timeout so the customer never waits indefinitely. */
export async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

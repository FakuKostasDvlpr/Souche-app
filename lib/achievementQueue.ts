export type AchievementVariant = "champion" | "milestone" | "default";

export interface AchievementPayload {
  title: string;
  subtitle?: string;
  icon?: unknown;
  variant?: AchievementVariant;
  ctaLabel?: string;
  onCta?: () => void;
  dedupeKey?: string;
}

export type QueueState = "idle" | "playing";

export interface QueueHandle {
  enqueue(payload: AchievementPayload): void;
  finish(): void;
  clear(): void;
  state(): QueueState;
  pending(): number;
}

interface QueueOptions {
  onPlay: (payload: AchievementPayload) => void;
  pauseMs: number;
}

export function createAchievementQueue(opts: QueueOptions): QueueHandle {
  const buffer: AchievementPayload[] = [];
  let state: QueueState = "idle";
  let pauseTimer: ReturnType<typeof setTimeout> | null = null;

  function playNext() {
    const next = buffer.shift();
    if (!next) {
      state = "idle";
      return;
    }
    state = "playing";
    opts.onPlay(next);
  }

  return {
    enqueue(payload) {
      buffer.push(payload);
      if (state === "idle" && pauseTimer === null) playNext();
    },
    finish() {
      if (state !== "playing") return;
      if (opts.pauseMs > 0) {
        pauseTimer = setTimeout(() => {
          pauseTimer = null;
          playNext();
        }, opts.pauseMs);
      } else {
        playNext();
      }
    },
    clear() {
      buffer.length = 0;
      if (pauseTimer) {
        clearTimeout(pauseTimer);
        pauseTimer = null;
      }
      state = "idle";
    },
    state: () => state,
    pending: () => buffer.length,
  };
}

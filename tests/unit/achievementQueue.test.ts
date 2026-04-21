import {
  createAchievementQueue,
  type AchievementPayload,
} from "@/lib/achievementQueue";

const p = (title: string): AchievementPayload => ({ title });

describe("achievementQueue", () => {
  it("starts idle", () => {
    const q = createAchievementQueue({ onPlay: () => {}, pauseMs: 0 });
    expect(q.state()).toBe("idle");
    expect(q.pending()).toBe(0);
  });

  it("plays first enqueued payload immediately", () => {
    const played: AchievementPayload[] = [];
    const q = createAchievementQueue({
      onPlay: (payload) => played.push(payload),
      pauseMs: 0,
    });
    q.enqueue(p("first"));
    expect(q.state()).toBe("playing");
    expect(played).toEqual([p("first")]);
  });

  it("queues subsequent payloads while playing", () => {
    const played: AchievementPayload[] = [];
    const q = createAchievementQueue({
      onPlay: (payload) => played.push(payload),
      pauseMs: 0,
    });
    q.enqueue(p("a"));
    q.enqueue(p("b"));
    q.enqueue(p("c"));
    expect(played).toEqual([p("a")]);
    expect(q.pending()).toBe(2);
  });

  it("plays next after finish + pause", () => {
    jest.useFakeTimers();
    const played: AchievementPayload[] = [];
    const q = createAchievementQueue({
      onPlay: (payload) => played.push(payload),
      pauseMs: 300,
    });
    q.enqueue(p("a"));
    q.enqueue(p("b"));
    q.finish();
    expect(played).toEqual([p("a")]);
    jest.advanceTimersByTime(300);
    expect(played).toEqual([p("a"), p("b")]);
    jest.useRealTimers();
  });

  it("returns to idle when queue drains", () => {
    jest.useFakeTimers();
    const q = createAchievementQueue({ onPlay: () => {}, pauseMs: 0 });
    q.enqueue(p("a"));
    q.finish();
    jest.advanceTimersByTime(0);
    expect(q.state()).toBe("idle");
    jest.useRealTimers();
  });

  it("clear() empties pending and resets state", () => {
    const q = createAchievementQueue({ onPlay: () => {}, pauseMs: 0 });
    q.enqueue(p("a"));
    q.enqueue(p("b"));
    q.clear();
    expect(q.pending()).toBe(0);
    expect(q.state()).toBe("idle");
  });
});

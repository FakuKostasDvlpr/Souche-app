# Plan 1: Achievement Component System

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir un componente de "logro desbloqueado" estilo Minecraft que dispara cuando el superadmin elige ganador de un torneo. Full-screen takeover con trofeo → colapsa a banner top con header VT323 "LOGRO DESBLOQUEADO".

**Architecture:** `AchievementProvider` (context + cola FIFO) + `AchievementOverlay` (FSM de 5 fases con Reanimated 4) + `useGanadorListener` (onSnapshot Firestore con dedupe AsyncStorage). Trigger desde admin escribe `users/{uid}.ganador` → listener dispara `showAchievement` imperativo. Push notification (Cloud Function, siguiente plan) solo despierta la app; single source of truth = Firestore.

**Tech Stack:** Expo 54, React Native 0.81, React 19, Reanimated 4.1, expo-haptics, expo-blur, expo-linear-gradient, react-native-svg, Firebase client SDK v12, AsyncStorage. Tests con jest + jest-expo + ts-jest.

**Spec ref:** `docs/superpowers/specs/2026-04-20-achievement-and-live-data-design.md` (secciones "Achievement component" y parcialmente "Tournament winner flow" → solo la función `elegirGanadorDeTorneo` + schema `puntosCampeon` de Torneo).

**Fuera de scope (otros planes):**
- Plan 2: UI admin (DateTimePicker, detalle de torneo, `fechaInicio`, countdown) + Cloud Functions (push).
- Plan 3: Live data wiring (home, menu, anuncios, `BurgerImage`).

---

## File Structure

**Nuevos:**

- `jest.config.js` — config root para jest.
- `tests/setup.ts` — mocks globales (AsyncStorage, etc.).
- `tests/unit/achievementQueue.test.ts` — unit tests de cola FIFO.
- `lib/achievementQueue.ts` — lógica pura cola FIFO (sin React).
- `contexts/AchievementContext.tsx` — React Context + Provider + `useAchievement` hook.
- `components/ui/achievement/AchievementParticles.tsx` — confetti SVG.
- `components/ui/achievement/AchievementShimmer.tsx` — diagonal sweep.
- `components/ui/achievement/AchievementOverlay.tsx` — FSM + composición.
- `hooks/useGanadorListener.ts` — listener Firestore + dedupe.

**Modificados:**

- `lib/firestore.ts` — agregar `puntosCampeon` al tipo `Torneo` + default en `normalizeTorneo` + función `elegirGanadorDeTorneo`.
- `app/_layout.tsx` — montar `<AchievementProvider>` entre `<Slot/>` y `<ToastProvider />` + montar `useGanadorListener` dentro.
- `package.json` — devDeps: jest, jest-expo, ts-jest, @types/jest, react-test-renderer.

---

## Task 1: Setup jest testing infrastructure

**Files:**
- Create: `jest.config.js`
- Create: `tests/setup.ts`
- Modify: `package.json`

- [ ] **Step 1: Agregar devDependencies**

Correr:
```bash
cd /Users/facuu/Desktop/souche-app
npm install --save-dev jest jest-expo ts-jest @types/jest react-test-renderer@19.1.0
```

Expected: install OK, `package.json` actualizado.

- [ ] **Step 2: Crear `jest.config.js`**

```javascript
/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",
  setupFiles: ["./tests/setup.ts"],
  testMatch: ["**/tests/**/*.test.ts", "**/tests/**/*.test.tsx"],
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@rn-primitives|nativewind|react-native-reanimated|react-native-worklets)/)",
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
};
```

- [ ] **Step 3: Crear `tests/setup.ts`**

```typescript
import "@testing-library/jest-native/extend-expect";
```

Nota: el archivo queda mínimo ahora; se extiende cuando sea necesario.

Actualizar a (versión sin RTL, pure logic only):

```typescript
// Mock AsyncStorage for hooks tests
jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async () => null),
    setItem: jest.fn(async () => {}),
    removeItem: jest.fn(async () => {}),
    clear: jest.fn(async () => {}),
  },
}));
```

- [ ] **Step 4: Agregar npm script**

En `package.json`, dentro de `"scripts"`, agregar:

```json
"test": "jest",
"test:watch": "jest --watch"
```

- [ ] **Step 5: Smoke test**

Crear temporalmente `tests/unit/smoke.test.ts`:
```typescript
describe("jest setup", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2);
  });
});
```

Run: `npm test -- --testPathPattern=smoke`
Expected: 1 test passed. Borrar `tests/unit/smoke.test.ts`.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json jest.config.js tests/setup.ts
git commit -m "chore: setup jest + jest-expo for unit testing"
```

---

## Task 2: `achievementQueue` pure logic (TDD)

**Files:**
- Create: `tests/unit/achievementQueue.test.ts`
- Create: `lib/achievementQueue.ts`

La cola es pura TS, sin React. Gestiona estado `idle` → `playing` → (pause 300ms) → `playing next` → `idle`.

- [ ] **Step 1: Escribir tests failing**

`tests/unit/achievementQueue.test.ts`:

```typescript
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

  it("plays next after finish + pause", async () => {
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
```

- [ ] **Step 2: Run — debe fallar "module not found"**

Run: `npm test -- --testPathPattern=achievementQueue`
Expected: FAIL, "Cannot find module '@/lib/achievementQueue'".

- [ ] **Step 3: Implementar `lib/achievementQueue.ts`**

```typescript
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
```

- [ ] **Step 4: Run — tests pass**

Run: `npm test -- --testPathPattern=achievementQueue`
Expected: 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add tests/unit/achievementQueue.test.ts lib/achievementQueue.ts
git commit -m "feat: AchievementQueue pure FIFO logic with pause between items"
```

---

## Task 3: `AchievementContext` + `useAchievement` hook

**Files:**
- Create: `contexts/AchievementContext.tsx`

El Provider expone `showAchievement(payload)`. Envuelve la cola + mantiene `current` payload como state para el Overlay renderizar. Overlay se construye en Task 6 — acá solo dejamos placeholder visual minimo.

- [ ] **Step 1: Crear `contexts/AchievementContext.tsx`**

```tsx
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  createAchievementQueue,
  type AchievementPayload,
  type QueueHandle,
} from "@/lib/achievementQueue";

interface AchievementContextValue {
  showAchievement: (payload: AchievementPayload) => void;
}

const Ctx = createContext<AchievementContextValue | null>(null);

interface ProviderProps {
  children: React.ReactNode;
  /** For testing: override default 300ms pause between items */
  pauseMs?: number;
  /** Overlay component; renders when a payload is active */
  OverlayComponent?: React.ComponentType<{
    payload: AchievementPayload;
    onFinish: () => void;
  }>;
}

export function AchievementProvider({
  children,
  pauseMs = 300,
  OverlayComponent,
}: ProviderProps) {
  const [current, setCurrent] = useState<AchievementPayload | null>(null);
  const queueRef = useRef<QueueHandle | null>(null);

  if (queueRef.current === null) {
    queueRef.current = createAchievementQueue({
      pauseMs,
      onPlay: (payload) => setCurrent(payload),
    });
  }

  const handleFinish = useCallback(() => {
    setCurrent(null);
    queueRef.current?.finish();
  }, []);

  const showAchievement = useCallback((payload: AchievementPayload) => {
    queueRef.current?.enqueue(payload);
  }, []);

  useEffect(() => {
    return () => {
      queueRef.current?.clear();
    };
  }, []);

  const value = useMemo(() => ({ showAchievement }), [showAchievement]);

  return (
    <Ctx.Provider value={value}>
      {children}
      {current && OverlayComponent && (
        <OverlayComponent payload={current} onFinish={handleFinish} />
      )}
    </Ctx.Provider>
  );
}

export function useAchievement(): AchievementContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error("useAchievement must be used inside <AchievementProvider>");
  }
  return ctx;
}
```

- [ ] **Step 2: Smoke test manual (sin test automatizado por simplicidad)**

No creamos test unitario aquí; el comportamiento de queue ya se testeó en Task 2 y el rendering se verifica manualmente en Task 10 (integración).

- [ ] **Step 3: Commit**

```bash
git add contexts/AchievementContext.tsx
git commit -m "feat: AchievementProvider context with imperative showAchievement API"
```

---

## Task 4: `AchievementParticles` sub-component (confetti)

**Files:**
- Create: `components/ui/achievement/AchievementParticles.tsx`

24 partículas SVG cayendo con rotación random. Reanimated. No confia en lifecycle de React para cada partícula — usa `useDerivedValue`.

- [ ] **Step 1: Crear archivo**

```tsx
import React, { useEffect } from "react";
import { StyleSheet, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import Svg, { Rect } from "react-native-svg";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const COUNT = 24;
const COLORS = ["#00F068", "#F7AE00", "#EDEFEA"];

interface Particle {
  id: number;
  startX: number;
  targetY: number;
  delay: number;
  rotation: number;
  color: string;
  size: number;
}

function buildParticles(): Particle[] {
  return Array.from({ length: COUNT }).map((_, i) => ({
    id: i,
    startX: Math.random() * SCREEN_W,
    targetY: SCREEN_H + 40,
    delay: Math.random() * 600,
    rotation: (Math.random() - 0.5) * 720,
    color: COLORS[i % COLORS.length],
    size: 4 + Math.random() * 4,
  }));
}

function ParticleDot({ p }: { p: Particle }) {
  const ty = useSharedValue(-30);
  const rot = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(p.delay, withTiming(1, { duration: 120 }));
    ty.value = withDelay(
      p.delay,
      withTiming(p.targetY, {
        duration: 1800 + Math.random() * 600,
        easing: Easing.in(Easing.quad),
      }),
    );
    rot.value = withDelay(
      p.delay,
      withTiming(p.rotation, { duration: 2000, easing: Easing.linear }),
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: ty.value },
      { rotateZ: `${rot.value}deg` },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          left: p.startX,
          top: 0,
          width: p.size,
          height: p.size * 2,
        },
        style,
      ]}
    >
      <Svg width={p.size} height={p.size * 2}>
        <Rect width={p.size} height={p.size * 2} fill={p.color} rx={1} />
      </Svg>
    </Animated.View>
  );
}

export function AchievementParticles() {
  const particles = React.useMemo(buildParticles, []);
  return (
    <Animated.View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {particles.map((p) => (
        <ParticleDot key={p.id} p={p} />
      ))}
    </Animated.View>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/ui/achievement/AchievementParticles.tsx
git commit -m "feat: AchievementParticles confetti with Reanimated"
```

---

## Task 5: `AchievementShimmer` sub-component

**Files:**
- Create: `components/ui/achievement/AchievementShimmer.tsx`

Sweep diagonal que se dispara una sola vez. Prop `trigger: number` para re-lanzar desde parent.

- [ ] **Step 1: Crear archivo**

```tsx
import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

interface Props {
  trigger: number;
  widthPct?: number;
}

export function AchievementShimmer({ trigger, widthPct = 40 }: Props) {
  const tx = useSharedValue(-150);

  useEffect(() => {
    tx.value = -150;
    tx.value = withTiming(300, {
      duration: 900,
      easing: Easing.out(Easing.cubic),
    });
  }, [trigger]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: `${tx.value}%` }, { skewX: "-18deg" }],
  }));

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: "hidden" }]}>
      <Animated.View
        style={[
          { position: "absolute", top: 0, bottom: 0, width: `${widthPct}%` },
          style,
        ]}
      >
        <LinearGradient
          colors={["transparent", "rgba(0,240,104,0.35)", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/ui/achievement/AchievementShimmer.tsx
git commit -m "feat: AchievementShimmer diagonal sweep"
```

---

## Task 6: `AchievementOverlay` — FSM completo

**Files:**
- Create: `components/ui/achievement/AchievementOverlay.tsx`

FSM 5 fases: Enter (400) → HoldFull (2100) → Collapse (400) → Banner (2000) → Exit (300). Total ~5.2s. Tap backdrop → skip a Collapse.

- [ ] **Step 1: Crear archivo**

```tsx
import React, { useEffect, useState, useRef } from "react";
import {
  AccessibilityInfo,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  Dimensions,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { AchievementParticles } from "./AchievementParticles";
import { AchievementShimmer } from "./AchievementShimmer";
import type { AchievementPayload } from "@/lib/achievementQueue";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

type Phase = "enter" | "holdFull" | "collapse" | "banner" | "exit" | "done";

const TIMINGS = {
  enter: 400,
  holdFull: 2100,
  collapse: 400,
  banner: 2000,
  exit: 300,
};

interface Props {
  payload: AchievementPayload;
  onFinish: () => void;
}

const DEFAULT_ICON = require("@/public/cupwin.png");

export function AchievementOverlay({ payload, onFinish }: Props) {
  const [phase, setPhase] = useState<Phase>("enter");
  const [reduceMotion, setReduceMotion] = useState(false);
  const skipRequested = useRef(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
  }, []);

  const backdropOpacity = useSharedValue(0);
  const trophyScale = useSharedValue(0.3);
  const trophyY = useSharedValue(0);
  const trophyX = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleY = useSharedValue(20);
  const titleScale = useSharedValue(1);
  const subtitleOpacity = useSharedValue(0);
  const subtitleY = useSharedValue(16);
  const bannerOpacity = useSharedValue(0);
  const bannerY = useSharedValue(-100);
  const shimmerTrigger = useSharedValue(0);

  const [shimmerKey, setShimmerKey] = useState(0);

  useEffect(() => {
    if (reduceMotion) {
      runPhaseReducedMotion();
      return;
    }
    runEnter();
  }, [reduceMotion]);

  function runEnter() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    backdropOpacity.value = withTiming(1, { duration: TIMINGS.enter });
    trophyScale.value = withSpring(1, { damping: 10, stiffness: 140 });
    titleOpacity.value = withDelay(200, withTiming(1, { duration: 300 }));
    titleY.value = withDelay(200, withTiming(0, { duration: 300 }));
    setTimeout(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setShimmerKey((k) => k + 1);
      setPhase("holdFull");
    }, TIMINGS.enter);
  }

  useEffect(() => {
    if (phase !== "holdFull") return;
    subtitleOpacity.value = withDelay(400, withTiming(1, { duration: 300 }));
    subtitleY.value = withDelay(400, withTiming(0, { duration: 300 }));
    const t = setTimeout(() => startCollapse(), TIMINGS.holdFull);
    return () => clearTimeout(t);
  }, [phase]);

  function startCollapse() {
    if (phase === "collapse" || phase === "banner" || phase === "exit") return;
    setPhase("collapse");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    backdropOpacity.value = withTiming(0, { duration: TIMINGS.collapse });
    trophyScale.value = withTiming(0.35, { duration: TIMINGS.collapse });
    trophyY.value = withTiming(-(SCREEN_H / 2 - 70), { duration: TIMINGS.collapse });
    trophyX.value = withTiming(-(SCREEN_W / 2 - 44), { duration: TIMINGS.collapse });
    titleScale.value = withTiming(0.38, { duration: TIMINGS.collapse });
    titleY.value = withTiming(-(SCREEN_H / 2 - 72), { duration: TIMINGS.collapse });
    subtitleY.value = withTiming(-(SCREEN_H / 2 - 52), { duration: TIMINGS.collapse });
    bannerOpacity.value = withDelay(
      TIMINGS.collapse - 100,
      withTiming(1, { duration: 200 }),
    );
    bannerY.value = withDelay(
      TIMINGS.collapse - 100,
      withTiming(0, { duration: 200 }),
    );
    setTimeout(() => {
      setPhase("banner");
      setShimmerKey((k) => k + 1);
    }, TIMINGS.collapse);
  }

  useEffect(() => {
    if (phase !== "banner") return;
    const t = setTimeout(() => runExit(), TIMINGS.banner);
    return () => clearTimeout(t);
  }, [phase]);

  function runExit() {
    setPhase("exit");
    bannerY.value = withTiming(-100, { duration: TIMINGS.exit });
    bannerOpacity.value = withTiming(0, { duration: TIMINGS.exit }, (done) => {
      if (done) runOnJS(finalize)();
    });
  }

  function finalize() {
    setPhase("done");
    onFinish();
  }

  function runPhaseReducedMotion() {
    backdropOpacity.value = withTiming(1, { duration: 200 });
    titleOpacity.value = withTiming(1, { duration: 200 });
    subtitleOpacity.value = withTiming(1, { duration: 200 });
    trophyScale.value = 1;
    setTimeout(() => {
      backdropOpacity.value = withTiming(0, { duration: 200 }, (done) => {
        if (done) runOnJS(finalize)();
      });
    }, 2200);
  }

  const handleSkip = () => {
    if (skipRequested.current) return;
    skipRequested.current = true;
    if (phase === "enter" || phase === "holdFull") startCollapse();
  };

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }));
  const trophyStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: trophyX.value },
      { translateY: trophyY.value },
      { scale: trophyScale.value },
    ],
  }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleY.value }, { scale: titleScale.value }],
  }));
  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
    transform: [{ translateY: subtitleY.value }],
  }));
  const bannerStyle = useAnimatedStyle(() => ({
    opacity: bannerOpacity.value,
    transform: [{ translateY: bannerY.value }],
  }));

  const showFullScreen = phase === "enter" || phase === "holdFull" || phase === "collapse";
  const showBanner = phase === "collapse" || phase === "banner" || phase === "exit";
  const showParticles = !reduceMotion && (phase === "enter" || phase === "holdFull");

  return (
    <View
      pointerEvents="box-none"
      style={StyleSheet.absoluteFill}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      {/* Full-screen backdrop */}
      {showFullScreen && (
        <Animated.View
          pointerEvents={phase === "collapse" ? "none" : "auto"}
          style={[StyleSheet.absoluteFill, backdropStyle]}
        >
          <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
          <LinearGradient
            colors={["rgba(0,240,104,0.18)", "rgba(0,0,0,0.85)"]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={handleSkip}
          >
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
              <Animated.View style={[{ marginBottom: 20 }, trophyStyle]}>
                <Image
                  source={payload.icon ?? DEFAULT_ICON}
                  style={{ width: 140, height: 140 }}
                  resizeMode="contain"
                />
              </Animated.View>
              <Animated.Text
                style={[
                  {
                    color: "#EDEFEA",
                    fontFamily: "SpaceGrotesk_700Bold",
                    fontSize: 44,
                    letterSpacing: -1,
                    textTransform: "uppercase",
                    textAlign: "center",
                  },
                  titleStyle,
                ]}
              >
                {payload.title}
              </Animated.Text>
              {payload.subtitle && (
                <Animated.Text
                  style={[
                    {
                      color: "#00F068",
                      fontFamily: "Inter_600SemiBold",
                      fontSize: 15,
                      marginTop: 10,
                      textAlign: "center",
                      letterSpacing: 1,
                    },
                    subtitleStyle,
                  ]}
                >
                  {payload.subtitle}
                </Animated.Text>
              )}
            </View>
          </Pressable>
          <AchievementShimmer trigger={shimmerKey} />
          {showParticles && <AchievementParticles />}
        </Animated.View>
      )}

      {/* Banner */}
      {showBanner && (
        <Animated.View
          pointerEvents="box-none"
          style={[
            {
              position: "absolute",
              top: 48,
              left: 16,
              right: 16,
            },
            bannerStyle,
          ]}
        >
          <Pressable
            onPress={() => {
              payload.onCta?.();
              runExit();
            }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 14,
              paddingVertical: 12,
              paddingHorizontal: 16,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: "rgba(0,240,104,0.4)",
              backgroundColor: "rgba(18,26,20,0.92)",
              overflow: "hidden",
            }}
          >
            <Image
              source={payload.icon ?? DEFAULT_ICON}
              style={{ width: 42, height: 42 }}
              resizeMode="contain"
            />
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: "#00F068",
                  fontFamily: "VT323_400Regular",
                  fontSize: 14,
                  letterSpacing: 2,
                }}
              >
                LOGRO DESBLOQUEADO
              </Text>
              <Text
                style={{
                  color: "#EDEFEA",
                  fontFamily: "SpaceGrotesk_700Bold",
                  fontSize: 18,
                  letterSpacing: -0.3,
                }}
                numberOfLines={1}
              >
                {payload.title}
              </Text>
              {payload.subtitle && (
                <Text
                  style={{
                    color: "rgba(255,255,255,0.65)",
                    fontFamily: "Inter_400Regular",
                    fontSize: 12,
                    marginTop: 2,
                  }}
                  numberOfLines={1}
                >
                  {payload.subtitle}
                </Text>
              )}
            </View>
            <AchievementShimmer trigger={shimmerKey} />
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}
```

Notas:
- Archivo grande pero concentrado en una sola responsabilidad (FSM del overlay). Dividir aún más complicaría; mantener.
- `trophyY/X` target se calcula para "viajar" al centro del banner; no es exacto pero funcional.
- `DEFAULT_ICON` apunta a asset existente (`public/cupwin.png`).

- [ ] **Step 2: Commit**

```bash
git add components/ui/achievement/AchievementOverlay.tsx
git commit -m "feat: AchievementOverlay with 5-phase FSM and reduce-motion fallback"
```

---

## Task 7: `useGanadorListener` hook

**Files:**
- Create: `hooks/useGanadorListener.ts`

Escucha `users/{uid}`. Detecta transición a `ganador: true` o cambio de `torneoGanado`. Dedupe via AsyncStorage key `souche.lastSeenTorneoGanado`.

- [ ] **Step 1: Crear archivo**

```typescript
import { useEffect, useRef } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { db } from "@/lib/firebase";
import { useAchievement } from "@/contexts/AchievementContext";

const STORAGE_KEY = "souche.lastSeenTorneoGanado";

interface UserDocShape {
  ganador?: boolean;
  torneoGanado?: string | null;
  puntos?: number;
}

export function useGanadorListener(uid: string | null | undefined) {
  const { showAchievement } = useAchievement();
  const lastSeenRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (!uid) {
      lastSeenRef.current = undefined;
      return;
    }

    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (!cancelled) lastSeenRef.current = v;
      })
      .catch(() => {
        if (!cancelled) lastSeenRef.current = null;
      });

    const unsub = onSnapshot(
      doc(db, "users", uid),
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data() as UserDocShape;
        if (!data.ganador) return;
        const torneo = data.torneoGanado ?? null;
        if (!torneo) return;
        if (lastSeenRef.current === undefined) return; // still loading
        if (lastSeenRef.current === torneo) return;

        lastSeenRef.current = torneo;
        AsyncStorage.setItem(STORAGE_KEY, torneo).catch(() => {});

        showAchievement({
          title: "¡CAMPEÓN!",
          subtitle: `${torneo} · ganaste`,
          variant: "champion",
          dedupeKey: `ganador:${torneo}`,
        });
      },
      (err) => {
        console.warn("useGanadorListener error:", err);
      },
    );

    return () => {
      cancelled = true;
      unsub();
    };
  }, [uid, showAchievement]);
}
```

- [ ] **Step 2: Commit**

```bash
git add hooks/useGanadorListener.ts
git commit -m "feat: useGanadorListener with AsyncStorage dedupe"
```

---

## Task 8: `lib/firestore.ts` — schema Torneo + `elegirGanadorDeTorneo`

**Files:**
- Modify: `lib/firestore.ts`

Agregar campo `puntosCampeon` al tipo `Torneo`, default en `normalizeTorneo`, y la función atómica `elegirGanadorDeTorneo`.

- [ ] **Step 1: Agregar import `writeBatch`**

En `lib/firestore.ts`, modificar el import de firebase/firestore — agregar `writeBatch`:

Buscar la línea que empieza con `import {` y termina con `} from "firebase/firestore";`. Agregar `writeBatch,` antes de `type Unsubscribe,`.

Resultado esperado (extracto):
```typescript
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  increment,
  Timestamp,
  writeBatch,
  type Unsubscribe,
  type DocumentData,
} from "firebase/firestore";
```

- [ ] **Step 2: Agregar campo `puntosCampeon` al tipo `Torneo`**

Buscar la interfaz `Torneo` (línea ~32). Agregar campo antes de `cerrado`:

```typescript
  puntosCampeon: number;
```

Resultado esperado:
```typescript
export interface Torneo {
  id: string;
  nombre: string;
  fecha: string;
  fechaTimestamp: Timestamp | null;
  lugar: string;
  precio: string;
  precioNum: number;
  cuposMaximos: number;
  cuposOcupados: number;
  descripcion: string;
  reglas: string;
  activo: boolean;
  ganadorUid: string | null;
  puntosParticipacion: number;
  puntosCampeon: number;
  cerrado: boolean;
  creadoEn: Timestamp | null;
}
```

- [ ] **Step 3: Default en `normalizeTorneo`**

Buscar la función `normalizeTorneo`. Modificar para incluir `puntosCampeon`:

```typescript
function normalizeTorneo(data: DocumentData, id: string): Torneo {
  return {
    ...data,
    id,
    puntosParticipacion: data.puntosParticipacion ?? 0,
    puntosCampeon: data.puntosCampeon ?? 500,
    cerrado: data.cerrado ?? false,
  } as Torneo;
}
```

- [ ] **Step 4: Agregar función `elegirGanadorDeTorneo`**

Al final de la sección `Torneos` (después de `cerrarTorneo`), agregar:

```typescript
/**
 * Atomically: mark ganadorUid on torneo, mark user as ganador,
 * grant puntosCampeon, append historialPuntos entry.
 * Does NOT close the torneo — admin does that separately.
 */
export async function elegirGanadorDeTorneo(
  torneoId: string,
  ganadorUid: string,
  torneoNombre: string,
  puntosCampeon: number,
): Promise<void> {
  const batch = writeBatch(db);
  batch.update(doc(db, "torneos", torneoId), { ganadorUid });
  batch.update(doc(db, "users", ganadorUid), {
    ganador: true,
    torneoGanado: torneoNombre,
    puntos: increment(puntosCampeon),
  });
  const histRef = doc(collection(db, "users", ganadorUid, "historialPuntos"));
  batch.set(histRef, {
    puntos: puntosCampeon,
    motivo: `Ganó ${torneoNombre}`,
    tipo: "ganador" as PuntoTipo,
    fecha: serverTimestamp(),
  });
  await batch.commit();
}
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors in `lib/firestore.ts`. (El proyecto puede tener warnings en otros archivos por cambios pre-existentes. Solo verificar que no hay nuevos errores relacionados a firestore.ts.)

- [ ] **Step 6: Commit**

```bash
git add lib/firestore.ts
git commit -m "feat: Torneo.puntosCampeon schema + elegirGanadorDeTorneo batch op"
```

---

## Task 9: Montar `AchievementProvider` en root layout + listener

**Files:**
- Modify: `app/_layout.tsx`

El Provider envuelve la app. `useGanadorListener` se monta dentro (necesita `profile.uid`).

- [ ] **Step 1: Agregar imports**

Al final del bloque de imports de `app/_layout.tsx`, agregar:

```typescript
import { AchievementProvider } from "@/contexts/AchievementContext";
import { AchievementOverlay } from "@/components/ui/achievement/AchievementOverlay";
import { useGanadorListener } from "@/hooks/useGanadorListener";
```

- [ ] **Step 2: Agregar componente interno que mounta el listener**

Justo encima de `export default function RootLayout()`, agregar:

```tsx
function GanadorListenerMount() {
  const uid = useAuthStore((s) => s.profile?.uid);
  useGanadorListener(uid ?? null);
  return null;
}
```

- [ ] **Step 3: Envolver `<Slot />` + `<ToastProvider />` con `AchievementProvider`**

Reemplazar el bloque JSX actual:

Antes:
```tsx
{splashReady && (
  <>
    <StatusBar style={theme === "dark" ? "light" : "dark"} />
    <Slot />
    <ToastProvider />
  </>
)}
```

Después:
```tsx
{splashReady && (
  <AchievementProvider OverlayComponent={AchievementOverlay}>
    <StatusBar style={theme === "dark" ? "light" : "dark"} />
    <Slot />
    <ToastProvider />
    <GanadorListenerMount />
  </AchievementProvider>
)}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: sin nuevos errores relacionados a `_layout.tsx`.

- [ ] **Step 5: Commit**

```bash
git add app/_layout.tsx
git commit -m "feat: mount AchievementProvider + GanadorListener in root layout"
```

---

## Task 10: Manual QA + test scenario con DEV_SKIP_AUTH

**Files:**
- (No code changes; optional temp debug in `_layout.tsx`)

Verificar animación end-to-end en device.

- [ ] **Step 1: Correr dev build**

```bash
npm start
```

Abrir la app en iOS simulator o Android device. Confirmar que arranca sin crash.

- [ ] **Step 2: Probar dispatch manual del achievement**

Esta es una verificación **manual** sin backend. Agregar temporalmente en `app/(user)/home.tsx` un botón de test (solo dev):

Dentro del componente `HomeScreen`, agregar un `useEffect` o `Pressable`:

```tsx
import { useAchievement } from "@/contexts/AchievementContext";

// dentro de HomeScreen:
const { showAchievement } = useAchievement();

// JSX temporal:
{__DEV__ && (
  <Pressable
    onPress={() => showAchievement({
      title: "¡CAMPEÓN!",
      subtitle: "BBQ Classic Cup · +500 pts",
      variant: "champion",
    })}
    style={{ padding: 12, backgroundColor: "#00F068", margin: 20, borderRadius: 12 }}
  >
    <Text style={{ textAlign: "center", fontWeight: "700" }}>TEST ACHIEVEMENT</Text>
  </Pressable>
)}
```

Checklist:
- [ ] Tap el botón: se ve full-screen con trofeo scale-in + título
- [ ] A ~2.5s: colapsa a banner top con header "LOGRO DESBLOQUEADO" (VT323)
- [ ] A ~5s: banner se desliza hacia arriba y desaparece
- [ ] Tap en backdrop durante full-screen: skipea a banner
- [ ] Tap en banner: cierra inmediato
- [ ] Haptic feedback al enter + al collapse (device físico)
- [ ] 24 partículas confetti visibles

- [ ] **Step 3: Probar cola (doble dispatch rápido)**

Tap 2 veces seguidas rápido. Expected: se muestra la primera completa (~5s), pausa breve, luego la segunda completa.

- [ ] **Step 4: Probar reduce motion**

iOS Simulator → Settings → Accessibility → Motion → Reduce Motion (on).
Tap botón test. Expected: fade simple sin confetti/shimmer, dura ~2.4s total.
Desactivar reduce motion después.

- [ ] **Step 5: Probar listener Firestore (end-to-end parcial)**

En Firebase console → Firestore → `users/{tuUid}`:
- Setear `ganador: true` y `torneoGanado: "Test Cup"`.

Expected: la app con sesión iniciada muestra la animación sin tocar nada (listener dispara).

Luego:
- Resetear `ganador: false` y `torneoGanado: null`.
- Abrir la app de nuevo. **No debe re-disparar** (dedupe AsyncStorage).

- [ ] **Step 6: Probar dedupe**

- Setear otra vez `ganador: true, torneoGanado: "Test Cup"` (mismo torneo). Expected: NO dispara (AsyncStorage tiene "Test Cup").
- Cambiar a `torneoGanado: "Otra Cup"` (nuevo). Expected: dispara de nuevo.

- [ ] **Step 7: Remover botón temporal de home.tsx**

Borrar el Pressable de test. No commitear el botón.

- [ ] **Step 8: Commit sin el botón**

Verificar `git status`. Si quedó algún cambio en `home.tsx` por el test, revertirlo:
```bash
git checkout app/(user)/home.tsx
```

- [ ] **Step 9: PR**

Crear PR de la rama actual con los commits del plan.

```bash
git log --oneline feature/admin-dashboard-v2..HEAD
```

Verificar que los commits coincidan con las tareas del plan.

---

## Self-review (auditado ya, notas)

- **Spec coverage:** Todas las secciones de "Achievement component" del spec están mapeadas a tasks 1-7,9. La función `elegirGanadorDeTorneo` + schema `puntosCampeon` (sección "Tournament winner flow" → sub-parte "Elegir ganador — modal") cubierta en Task 8. Ubicación admin + countdown + DateTimePicker + Cloud Functions van en Plan 2.
- **Placeholders:** cada step tiene código o comando concreto. Sin TBD.
- **Type consistency:** `AchievementPayload` definido en Task 2, consumido idénticamente en 3, 6, 7. `QueueHandle.finish()` consistente entre test y consumer. `Torneo.puntosCampeon: number` consumido por `elegirGanadorDeTorneo` en Task 8.
- **Riesgo conocido:** los números de línea en `lib/firestore.ts:123-145` pueden desfasar si hay edits previos; las instrucciones usan búsqueda por patrón, no por línea.

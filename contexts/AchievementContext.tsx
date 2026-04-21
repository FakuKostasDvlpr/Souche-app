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
  pauseMs?: number;
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

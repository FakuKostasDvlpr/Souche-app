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
        if (lastSeenRef.current === undefined) return;
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
      }
    );

    return () => {
      cancelled = true;
      unsub();
    };
  }, [uid, showAchievement]);
}

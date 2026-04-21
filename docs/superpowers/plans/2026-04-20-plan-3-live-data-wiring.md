# Plan 3 — Live Data Wiring + BurgerImage Placeholder

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar datos hardcodeados en `home.tsx` / `menu.tsx` / `burger/[id].tsx` por data real de Firestore, agregar placeholder universal para burgers sin imagen, y wirear el ticker de promos a la colección existente `novedades`.

**Architecture:** Capa de hooks wrapper sobre funciones ya existentes en `lib/firestore.ts`. Componente `BurgerImage` maneja fallback de imagen. Ticker consume `novedades` activas. Champion card deriva de último torneo con `ganadorUid != null`. Estados loading → skeletons/hidden.

**Tech Stack:** Expo 54, RN 0.81, React 19, Firestore v12 (`onSnapshot`, `orderBy`, `limit`), `@expo/vector-icons`.

**Spec:** `docs/superpowers/specs/2026-04-20-achievement-and-live-data-design.md` — sección 5 (Live data wiring).

**Depende de:** Plan 2 completo (`getTorneoEstado`, `fechaInicio` en `Torneo`).

**Decisión de pivote respecto al spec:** El spec propone nueva colección `anuncios` con shape `{ icon, texto, orden }`. La realidad del repo es que ya existe `novedades` con `{ titulo, contenido, activa, fotoUrl }` + screen admin funcional (`admin/anuncios.tsx` usa `Novedad`). **Plan 3 reutiliza `novedades`** (DRY — no crear colección duplicada). Ticker mapea `Novedad` → `{ icon: "megaphone-outline", texto: titulo }`.

**Out-of-scope:**
- CommunitySection (queda hardcoded por ahora).
- Trend badge de StatsCards (eliminar, no migrar).
- Migración histórica de data.

---

## File Structure

**Nuevos:**
- `components/ui/BurgerImage.tsx` — Placeholder universal.
- `hooks/useNovedadesActivas.ts`
- `hooks/useMenuItems.ts`
- `hooks/useMenuCategorias.ts`
- `hooks/useTorneosVisibles.ts`
- `hooks/useUltimoCampeon.ts`
- `hooks/useEntradasActivasCount.ts`

**Modificar:**
- `lib/firestore.ts` — Agregar `UltimoCampeon` type + `subscribeToUltimoCampeon`.
- `app/(user)/home.tsx` — Reemplazar `PROMO_ITEMS`, `BURGERS`, `TOURNAMENTS`, `ChampionCard`, `StatsCards`.
- `app/(user)/menu.tsx` — Consumir `useMenuItems` + `useMenuCategorias`, usar `BurgerImage`.
- `app/(user)/burger/[id].tsx` — Usar `BurgerImage`.

**Deprecar (después de verificar):**
- `lib/burgerImages.ts` — Reemplazo completo por `BurgerImage`.

---

## Task 1: BurgerImage universal component

**Files:**
- Create: `components/ui/BurgerImage.tsx`

- [ ] **Step 1: Implement**

```tsx
import React from "react";
import { View, Text, Image, StyleProp, ViewStyle, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Defs, RadialGradient, Stop, Rect } from "react-native-svg";

interface Props {
  fotoUrl: string | null | undefined;
  style?: StyleProp<ViewStyle>;
  iconSize?: number;
  showLabel?: boolean;
}

export function BurgerImage({ fotoUrl, style, iconSize = 42, showLabel = true }: Props) {
  if (fotoUrl) {
    return (
      <Image
        source={{ uri: fotoUrl }}
        style={[{ width: "100%", height: "100%" }, style]}
        resizeMode="cover"
      />
    );
  }
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: "#0F1410", alignItems: "center", justifyContent: "center" }, style]}>
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="burgerPh" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0%" stopColor="#00F068" stopOpacity={0.18} />
            <Stop offset="100%" stopColor="#00F068" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#burgerPh)" />
      </Svg>
      <Ionicons name="fast-food" size={iconSize} color="#00F068" />
      {showLabel && (
        <Text
          style={{
            color: "#00F068",
            fontFamily: "VT323_400Regular",
            fontSize: 14,
            marginTop: 6,
            letterSpacing: 2,
          }}
        >
          SIN FOTO
        </Text>
      )}
    </View>
  );
}
```

- [ ] **Step 2: Smoke render**

En `app/(user)/menu.tsx` temporalmente:

```tsx
import { BurgerImage } from "@/components/ui/BurgerImage";
// <View style={{ width: 200, height: 200 }}><BurgerImage fotoUrl={null} /></View>
```

Verificar render en simulator. Remover.

- [ ] **Step 3: Commit**

```bash
git add components/ui/BurgerImage.tsx
git commit -m "feat(ui): BurgerImage universal placeholder"
```

---

## Task 2: useNovedadesActivas hook

**Files:**
- Create: `hooks/useNovedadesActivas.ts`

- [ ] **Step 1: Implement**

```typescript
import { useEffect, useState } from "react";
import { subscribeToNovedades, type Novedad } from "@/lib/firestore";

export function useNovedadesActivas() {
  const [data, setData] = useState<Novedad[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToNovedades((n) => {
      setData(n);
      setLoading(false);
    });
    return unsub;
  }, []);

  return { data, loading };
}
```

- [ ] **Step 2: Commit**

```bash
git add hooks/useNovedadesActivas.ts
git commit -m "feat(hooks): useNovedadesActivas"
```

---

## Task 3: useMenuItems + useMenuCategorias hooks

**Files:**
- Create: `hooks/useMenuItems.ts`
- Create: `hooks/useMenuCategorias.ts`

- [ ] **Step 1: useMenuItems**

```typescript
import { useEffect, useState } from "react";
import { subscribeToMenuItems, type MenuItem } from "@/lib/firestore";

interface Options {
  onlyDisponible?: boolean;
  limit?: number;
}

export function useMenuItems({ onlyDisponible = true, limit }: Options = {}) {
  const [data, setData] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToMenuItems(onlyDisponible, (items) => {
      setData(limit ? items.slice(0, limit) : items);
      setLoading(false);
    });
    return unsub;
  }, [onlyDisponible, limit]);

  return { data, loading };
}
```

- [ ] **Step 2: useMenuCategorias**

```typescript
import { useEffect, useState } from "react";
import { getMenuCategorias } from "@/lib/firestore";

export function useMenuCategorias() {
  const [data, setData] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getMenuCategorias()
      .then((cats) => {
        if (!mounted) return;
        setData(cats);
        setLoading(false);
      })
      .catch(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  return { data, loading };
}
```

- [ ] **Step 3: Commit**

```bash
git add hooks/useMenuItems.ts hooks/useMenuCategorias.ts
git commit -m "feat(hooks): useMenuItems + useMenuCategorias"
```

---

## Task 4: useTorneosVisibles hook

**Files:**
- Create: `hooks/useTorneosVisibles.ts`

- [ ] **Step 1: Implement**

```typescript
import { useEffect, useState, useMemo } from "react";
import { subscribeToTorneos, getTorneoEstado, type Torneo, type TorneoEstado } from "@/lib/firestore";

export interface TorneoWithEstado extends Torneo {
  estado: TorneoEstado;
}

interface Options {
  limit?: number;
}

export function useTorneosVisibles({ limit }: Options = {}) {
  const [raw, setRaw] = useState<Torneo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToTorneos(false, (torneos) => {
      setRaw(torneos);
      setLoading(false);
    });
    return unsub;
  }, []);

  const data = useMemo<TorneoWithEstado[]>(() => {
    const filtered = raw
      .filter((t) => !t.cerrado)
      .map((t) => ({ ...t, estado: getTorneoEstado(t) }))
      .filter((t) => t.estado === "activo" || t.estado === "proximamente");
    return limit ? filtered.slice(0, limit) : filtered;
  }, [raw, limit]);

  return { data, loading };
}
```

- [ ] **Step 2: Commit**

```bash
git add hooks/useTorneosVisibles.ts
git commit -m "feat(hooks): useTorneosVisibles with estado attached"
```

---

## Task 5: subscribeToUltimoCampeon + useUltimoCampeon

**Files:**
- Modify: `lib/firestore.ts`
- Create: `hooks/useUltimoCampeon.ts`

- [ ] **Step 1: Add type + fn en firestore.ts**

Debajo de `getTorneoEstado`:

```typescript
export interface UltimoCampeon {
  torneo: Torneo;
  ganadorUid: string;
  ganadorNombre: string;
  ganadorFotoUrl: string | null;
  puntosCampeon: number;
}

// Context7-verified (2026-04-20): `where("x","!=",null) + orderBy("x") + orderBy("y")`
// requiere índice compuesto. Firebase MCP confirmó que firestore.indexes.json está vacío
// (ningún compuesto desplegado). Para evitar deploy-blocker, usamos orderBy creadoEn desc
// con un limit generoso y filtramos ganadorUid del lado cliente. Funciona mientras haya
// < ~50 torneos totales; escalá a índice compuesto después si hace falta.
export function subscribeToUltimoCampeon(
  cb: (c: UltimoCampeon | null) => void
): Unsubscribe {
  const q = query(
    collection(db, "torneos"),
    orderBy("creadoEn", "desc"),
    limit(20)
  );
  return onSnapshot(q, async (snap) => {
    const conGanador = snap.docs.find((d) => {
      const data = d.data();
      return typeof data.ganadorUid === "string" && data.ganadorUid.length > 0;
    });
    if (!conGanador) {
      cb(null);
      return;
    }
    const torneo = normalizeTorneo(conGanador.data(), conGanador.id);
    if (!torneo.ganadorUid) {
      cb(null);
      return;
    }
    const userSnap = await getDoc(doc(db, "users", torneo.ganadorUid));
    if (!userSnap.exists()) {
      cb(null);
      return;
    }
    const u = userSnap.data();
    cb({
      torneo,
      ganadorUid: torneo.ganadorUid,
      ganadorNombre: (u.nombre as string) ?? "Campeón",
      ganadorFotoUrl: (u.fotoUrl as string) ?? null,
      puntosCampeon: torneo.puntosCampeon,
    });
  });
}
```

- [ ] **Step 2: Hook wrapper**

```typescript
import { useEffect, useState } from "react";
import { subscribeToUltimoCampeon, type UltimoCampeon } from "@/lib/firestore";

export function useUltimoCampeon() {
  const [data, setData] = useState<UltimoCampeon | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToUltimoCampeon((c) => {
      setData(c);
      setLoading(false);
    });
    return unsub;
  }, []);

  return { data, loading };
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/firestore.ts hooks/useUltimoCampeon.ts
git commit -m "feat(firestore): subscribeToUltimoCampeon + hook"
```

---

## Task 6: useEntradasActivasCount hook

**Files:**
- Create: `hooks/useEntradasActivasCount.ts`

- [ ] **Step 1: Implement**

```typescript
import { useEffect, useState } from "react";
import { subscribeToEntradasByUser } from "@/lib/firestore";

export function useEntradasActivasCount(uid: string | null | undefined) {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setCount(0);
      setLoading(false);
      return;
    }
    const unsub = subscribeToEntradasByUser(uid, (entradas) => {
      const active = entradas.filter(
        (e) => e.estado === "activo" || e.estado === "pendiente"
      ).length;
      setCount(active);
      setLoading(false);
    });
    return unsub;
  }, [uid]);

  return { count, loading };
}
```

- [ ] **Step 2: Commit**

```bash
git add hooks/useEntradasActivasCount.ts
git commit -m "feat(hooks): useEntradasActivasCount"
```

---

## Task 7: Migrar home.tsx PromoTicker → novedades

**Files:**
- Modify: `app/(user)/home.tsx`

- [ ] **Step 1: Remove hardcoded PROMO_ITEMS**

En `app/(user)/home.tsx` eliminar:

```typescript
const PROMO_ITEMS = [
  { icon: "flash", text: "2x puntos este finde" },
  // ...
];
```

- [ ] **Step 2: Reemplazar PromoTicker**

```tsx
import { useNovedadesActivas } from "@/hooks/useNovedadesActivas";

function PromoTicker() {
  const { data } = useNovedadesActivas();
  const x = useSharedValue(0);

  useEffect(() => {
    if (data.length === 0) return;
    x.value = 0;
    x.value = withRepeat(
      withTiming(-600, { duration: 14000, easing: Easing.linear }),
      -1,
      false,
    );
  }, [data.length]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  if (data.length === 0) return null;

  const items = data.map((n) => ({ icon: "megaphone-outline" as const, text: n.titulo }));
  const loop = [...items, ...items, ...items];

  return (
    <View style={{
      height: 36,
      borderTopWidth: 1, borderBottomWidth: 1,
      borderColor: "rgba(0,240,104,0.2)",
      backgroundColor: "rgba(0,240,104,0.06)",
      overflow: "hidden",
      justifyContent: "center",
    }}>
      <Animated.View style={[{ flexDirection: "row", alignItems: "center", gap: 32, paddingHorizontal: 24 }, style]}>
        {loop.map((item, i) => (
          <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name={item.icon} size={13} color="#00F068" />
            <Text style={{
              color: "#00F068", fontSize: 11, fontFamily: "Inter_500Medium",
              letterSpacing: 2, textTransform: "uppercase",
            }}>
              {item.text}
            </Text>
            <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: "rgba(0,240,104,0.4)" }} />
          </View>
        ))}
      </Animated.View>
    </View>
  );
}
```

- [ ] **Step 3: Verify**

Run: `npx expo start` → home → sin novedades activas: ticker oculto. Con 1+: scrollea.

- [ ] **Step 4: Commit**

```bash
git add app/\(user\)/home.tsx
git commit -m "feat(home): PromoTicker from novedades collection"
```

---

## Task 8: Migrar home.tsx PopularBurgers → useMenuItems

**Files:**
- Modify: `app/(user)/home.tsx`

- [ ] **Step 1: Remove hardcoded BURGERS + BURGER_IMAGES import**

Borrar:

```typescript
import { BURGER_IMAGES } from "@/lib/burgerImages";
const BURGERS = [...];
```

- [ ] **Step 2: Reemplazar PopularBurgers**

```tsx
import { useMenuItems } from "@/hooks/useMenuItems";
import { BurgerImage } from "@/components/ui/BurgerImage";

function PopularBurgers({ onAll, onItem }: { onAll: () => void; onItem: (id: string) => void }) {
  const { data: burgers } = useMenuItems({ onlyDisponible: true, limit: 4 });

  if (burgers.length === 0) return null;

  return (
    <View>
      <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", paddingHorizontal: 20 }}>
        <View>
          <Text style={{ color: "#EDEFEA", fontSize: 20, fontFamily: "SpaceGrotesk_700Bold", letterSpacing: -0.4, textTransform: "uppercase" }}>
            Lo más pedido
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 }}>
            Los favoritos de la casa
          </Text>
        </View>
        <Pressable onPress={onAll} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Text style={{ color: "#00F068", fontSize: 13, fontFamily: "Inter_600SemiBold" }}>Ver menú</Text>
          <Ionicons name="chevron-forward" size={14} color="#00F068" />
        </Pressable>
      </View>

      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, gap: 12 }}
        decelerationRate="fast" snapToInterval={260}
      >
        {burgers.map((b) => (
          <Pressable
            key={b.id}
            onPress={() => onItem(b.id)}
            style={{
              width: 250, aspectRatio: 3 / 4, borderRadius: 24,
              borderWidth: 1, borderColor: "rgba(0,240,104,0.2)",
              overflow: "hidden", backgroundColor: "#000",
            }}
          >
            <BurgerImage fotoUrl={b.fotoUrl} iconSize={56} />
            <LinearGradient
              colors={["rgba(0,0,0,0.4)", "rgba(0,0,0,0.2)", "rgba(0,0,0,0.85)"]}
              locations={[0, 0.5, 1]}
              style={StyleSheet.absoluteFill}
            />
            <LinearGradient
              colors={["rgba(0,240,104,0.25)", "transparent"]}
              start={{ x: 0, y: 1 }} end={{ x: 0.7, y: 0.3 }}
              style={StyleSheet.absoluteFill}
            />
            {b.badge && (
              <View style={{
                position: "absolute", left: 12, top: 12,
                paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
                backgroundColor: "#00F068",
              }}>
                <Text style={{ color: "#0A0E0B", fontSize: 10, fontFamily: "SpaceGrotesk_700Bold", letterSpacing: 1.2 }}>
                  {b.badge}
                </Text>
              </View>
            )}
            <View style={{ position: "absolute", left: 16, right: 16, bottom: 16, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text
                  numberOfLines={2}
                  style={{
                    color: "#fff", fontSize: 18, fontFamily: "SpaceGrotesk_700Bold",
                    letterSpacing: -0.4, textTransform: "uppercase", lineHeight: 22,
                  }}
                >
                  {b.titulo}
                </Text>
                <Text style={{ color: "#00F068", fontSize: 20, fontFamily: "SpaceGrotesk_700Bold", marginTop: 4 }}>
                  {b.precio}
                </Text>
              </View>
              <View style={{
                width: 42, height: 42, borderRadius: 21,
                backgroundColor: "#00F068", alignItems: "center", justifyContent: "center",
              }}>
                <Ionicons name="arrow-forward" size={16} color="#0A0E0B" />
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
```

- [ ] **Step 3: Verify**

Admin crea item menú (o Firestore console) → ver en home.

- [ ] **Step 4: Commit**

```bash
git add app/\(user\)/home.tsx
git commit -m "feat(home): PopularBurgers from menu collection with BurgerImage"
```

---

## Task 9: Migrar home.tsx TournamentsList → useTorneosVisibles

**Files:**
- Modify: `app/(user)/home.tsx`

- [ ] **Step 1: Remove TOURNAMENTS hardcoded**

Borrar:

```typescript
const TOURNAMENTS = [...];
```

- [ ] **Step 2: Reemplazar TournamentsList**

```tsx
import { useTorneosVisibles } from "@/hooks/useTorneosVisibles";
import { TournamentCountdown } from "@/components/ui/TournamentCountdown";

function TournamentsList({ onPress }: { onPress: () => void }) {
  const { data: torneos } = useTorneosVisibles({ limit: 3 });
  if (torneos.length === 0) return null;

  return (
    <View style={{ paddingHorizontal: 20 }}>
      <View>
        <Text style={{ color: "#EDEFEA", fontSize: 20, fontFamily: "SpaceGrotesk_700Bold", letterSpacing: -0.4, textTransform: "uppercase" }}>
          Próximos torneos
        </Text>
        <Text style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 }}>
          Inscribite y sumá puntos
        </Text>
      </View>
      <View style={{ gap: 12, marginTop: 12 }}>
        {torneos.map((t) => {
          const fillPct = t.cuposMaximos > 0 ? Math.round((t.cuposOcupados / t.cuposMaximos) * 100) : 0;
          const spotsLeft = Math.max(0, t.cuposMaximos - t.cuposOcupados);
          const urgent = fillPct >= 70 && t.estado === "activo";
          const proxima = t.estado === "proximamente";

          return (
            <Pressable
              key={t.id}
              onPress={onPress}
              style={{
                padding: 14, borderRadius: 18, borderWidth: 1,
                borderColor: proxima ? "rgba(247,174,0,0.3)" : "rgba(255,255,255,0.08)",
                backgroundColor: "rgba(18,26,20,0.6)", overflow: "hidden",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View style={{
                  flexDirection: "row", alignItems: "center", gap: 6,
                  paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
                  backgroundColor: proxima ? "rgba(247,174,0,0.15)" : "rgba(0,240,104,0.15)",
                  borderWidth: 1, borderColor: proxima ? "rgba(247,174,0,0.3)" : "rgba(0,240,104,0.3)",
                }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: proxima ? "#F7AE00" : "#00F068" }} />
                  <Text style={{
                    color: proxima ? "#F7AE00" : "#00F068",
                    fontSize: 10, fontFamily: "SpaceGrotesk_700Bold",
                    letterSpacing: 1.2, textTransform: "uppercase",
                  }}>
                    {proxima ? "Próximamente" : "Inscripción abierta"}
                  </Text>
                </View>
                {!proxima && spotsLeft > 0 && spotsLeft <= 5 && (
                  <Text style={{ color: "#FF3B30", fontSize: 11, fontFamily: "SpaceGrotesk_700Bold", letterSpacing: 1, textTransform: "uppercase" }}>
                    {spotsLeft} cupos!
                  </Text>
                )}
              </View>

              <Text style={{
                color: "#EDEFEA", fontSize: 20, fontFamily: "SpaceGrotesk_700Bold",
                letterSpacing: -0.4, textTransform: "uppercase", marginTop: 12,
              }}>
                {t.nombre}
              </Text>

              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 }}>
                <Ionicons name="calendar-outline" size={13} color="#00F068" />
                <Text style={{ color: "#00F068", fontSize: 13, fontFamily: "Inter_600SemiBold" }}>{t.fecha}</Text>
              </View>

              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.55)" />
                  <Text style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, fontFamily: "Inter_400Regular" }}>
                    {t.lugar}
                  </Text>
                </View>
                <Text style={{ color: "#EDEFEA", fontSize: 17, fontFamily: "SpaceGrotesk_700Bold" }}>{t.precio}</Text>
              </View>

              {proxima && t.fechaInicio ? (
                <View style={{ marginTop: 12 }}>
                  <TournamentCountdown target={t.fechaInicio.toDate()} size="sm" />
                </View>
              ) : (
                <View style={{ marginTop: 14, gap: 6 }}>
                  <View style={{ height: 4, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 999, overflow: "hidden" }}>
                    <LinearGradient
                      colors={urgent ? ["#F7AE00", "#F59E0B"] : ["rgba(0,240,104,0.8)", "#00F068"]}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={{ width: `${fillPct}%`, height: "100%", borderRadius: 999 }}
                    />
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontFamily: "Inter_400Regular" }}>
                      {fillPct}% lleno
                    </Text>
                    <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontFamily: "Inter_600SemiBold" }}>
                      Inscribirme →
                    </Text>
                  </View>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
```

- [ ] **Step 3: Verify**

Con torneo `proximamente` → chip amber + countdown. Con `activo` → verde + barra progreso.

- [ ] **Step 4: Commit**

```bash
git add app/\(user\)/home.tsx
git commit -m "feat(home): TournamentsList live with countdown for upcoming"
```

---

## Task 10: Migrar home.tsx ChampionCard → useUltimoCampeon

**Files:**
- Modify: `app/(user)/home.tsx`

- [ ] **Step 1: Reemplazar ChampionCard**

```tsx
import { useUltimoCampeon } from "@/hooks/useUltimoCampeon";

function ChampionCard() {
  const { data } = useUltimoCampeon();
  if (!data) return null;

  return (
    <View style={{ paddingHorizontal: 20 }}>
      <View style={{
        flexDirection: "row", alignItems: "center", gap: 14,
        paddingVertical: 12, paddingLeft: 14, paddingRight: 16,
        borderRadius: 18, borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
        backgroundColor: "rgba(18,26,20,0.6)", overflow: "hidden",
      }}>
        <LinearGradient
          colors={["transparent", "rgba(0,240,104,0.6)", "transparent"]}
          start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
          style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 2 }}
        />
        <View style={{ position: "relative" }}>
          <View pointerEvents="none" style={{
            position: "absolute", left: -6, top: -6, right: -6, bottom: -6,
            borderRadius: 18, backgroundColor: "rgba(0,240,104,0.3)", opacity: 0.5,
          }} />
          <View style={{
            width: 52, height: 52, borderRadius: 14,
            backgroundColor: "#EDEFEA", borderWidth: 1,
            borderColor: "rgba(0,240,104,0.4)",
            alignItems: "center", justifyContent: "center", overflow: "hidden",
          }}>
            {data.ganadorFotoUrl ? (
              <Image source={{ uri: data.ganadorFotoUrl }} style={{ width: 52, height: 52 }} resizeMode="cover" />
            ) : (
              <Image source={require("@/assets/logo/ilust.png")} style={{ width: 46, height: 46 }} resizeMode="contain" />
            )}
          </View>
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{
            color: "#00F068", fontSize: 10, fontFamily: "Inter_600SemiBold",
            letterSpacing: 2.5, textTransform: "uppercase",
          }}>
            Último campeón
          </Text>
          <Text
            numberOfLines={1}
            style={{ color: "#EDEFEA", fontSize: 15, fontFamily: "SpaceGrotesk_700Bold", marginTop: 2 }}
          >
            {data.ganadorNombre}
          </Text>
          <Text style={{ marginTop: 2, fontSize: 12, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.55)" }}>
            <Text style={{ color: "#00F068" }}>+{data.puntosCampeon} pts</Text> · {data.torneo.nombre}
          </Text>
        </View>

        <View style={{ width: 64, height: 64, alignItems: "center", justifyContent: "center" }}>
          <View pointerEvents="none" style={{
            position: "absolute", width: 74, height: 74, borderRadius: 37,
            backgroundColor: "rgba(247,174,0,0.18)",
          }} />
          <Image
            source={require("@/public/cupwin.png")}
            style={{ width: 60, height: 60 }}
            resizeMode="contain"
          />
        </View>
      </View>
    </View>
  );
}
```

- [ ] **Step 2: Verify**

Sin campeón → card oculta. Con uno → muestra datos reales.

- [ ] **Step 3: Commit**

```bash
git add app/\(user\)/home.tsx
git commit -m "feat(home): ChampionCard from last winner"
```

---

## Task 11: Migrar home.tsx StatsCards

**Files:**
- Modify: `app/(user)/home.tsx`

- [ ] **Step 1: Remove trend + hardcoded entradas**

Cambiar el componente `StatsCards`:

```tsx
function StatsCards({
  puntos, entradas, onPuntos, onEntradas,
}: { puntos: number; entradas: number; onPuntos: () => void; onEntradas: () => void }) {
  return (
    <View style={{ flexDirection: "row", gap: 12, paddingHorizontal: 20 }}>
      <StatCard icon="flash" value={puntos} label="puntos Souche" accent="primary" onPress={onPuntos} />
      <StatCard icon="ticket-outline" value={entradas} label="entradas activas" accent="amber" onPress={onEntradas} />
    </View>
  );
}
```

(Removido `trend="+50"`. `StatCard` ya soporta trend opcional — sin cambios.)

- [ ] **Step 2: Wire entradas count en HomeScreen**

En `HomeScreen()` reemplazar el `<StatsCards ... entradas={0} />`:

```tsx
import { useEntradasActivasCount } from "@/hooks/useEntradasActivasCount";

// dentro del componente:
const { count: entradasCount } = useEntradasActivasCount(profile?.uid);

// render:
<StatsCards
  puntos={profile?.puntos ?? 0}
  entradas={entradasCount}
  onPuntos={() => router.push("/(user)/puntos")}
  onEntradas={() => router.push("/(user)/entradas/mis-entradas")}
/>
```

- [ ] **Step 3: Verify**

User con 2 entradas `activo` → card muestra 2. Crea otra `pendiente` → 3.

- [ ] **Step 4: Commit**

```bash
git add app/\(user\)/home.tsx
git commit -m "feat(home): StatsCards entradas live, remove trend badge"
```

---

## Task 12: Migrar menu.tsx

**Files:**
- Modify: `app/(user)/menu.tsx`

- [ ] **Step 1: Revisar archivo y plan de cambios**

```bash
cat app/\(user\)/menu.tsx | head -60
```

- [ ] **Step 2: Reemplazar imports de datos**

Quitar:

```typescript
import { BURGER_IMAGES } from "@/lib/burgerImages";
const BURGERS = [...];
const CATEGORIES = [...];
```

Agregar:

```typescript
import { useMenuItems } from "@/hooks/useMenuItems";
import { useMenuCategorias } from "@/hooks/useMenuCategorias";
import { BurgerImage } from "@/components/ui/BurgerImage";
```

- [ ] **Step 3: Wire dentro del componente**

En el top del componente:

```typescript
const { data: items, loading } = useMenuItems({ onlyDisponible: true });
const { data: dynCats } = useMenuCategorias();
const categories = ["todos", ...dynCats];
const filtered = activeCategory === "todos"
  ? items
  : items.filter((i) => i.categoria === activeCategory);
const featured = items[0];
```

- [ ] **Step 4: Reemplazar `FeaturedCard` + `BurgerCard` image**

Cualquier `<Image source={BURGER_IMAGES[b.id]} />` pasa a ser `<BurgerImage fotoUrl={b.fotoUrl} />`.

Los campos hardcodeados (`b.name`, `b.price`) se reemplazan por `b.titulo`, `b.precio`.

- [ ] **Step 5: Empty / loading state**

Si `loading` → render skeletons. Si `!loading && items.length === 0` → mensaje "Sin productos".

- [ ] **Step 6: Verify**

Admin crea item menú → aparece en pantalla. Sin fotoUrl → placeholder.

- [ ] **Step 7: Commit**

```bash
git add app/\(user\)/menu.tsx
git commit -m "feat(menu): live data from firestore + BurgerImage placeholder"
```

---

## Task 13: Migrar burger/[id].tsx

**Files:**
- Modify: `app/(user)/burger/[id].tsx`

- [ ] **Step 1: Revisar archivo**

```bash
cat app/\(user\)/burger/\[id\].tsx | head -60
```

- [ ] **Step 2: Cargar item real de Firestore**

Cambiar de lookup en `BURGER_IMAGES` por:

```typescript
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { BurgerImage } from "@/components/ui/BurgerImage";
import type { MenuItem } from "@/lib/firestore";

const [item, setItem] = useState<MenuItem | null>(null);
useEffect(() => {
  if (!id) return;
  getDoc(doc(db, "menu", id as string)).then((snap) => {
    if (snap.exists()) setItem({ ...(snap.data() as any), id: snap.id });
  });
}, [id]);
```

Reemplazar cualquier `<Image source={BURGER_IMAGES[id]} />` por `<BurgerImage fotoUrl={item?.fotoUrl} />`.

- [ ] **Step 3: Verify**

Navegar a `/burger/<id>` → carga data real. Con/sin imagen OK.

- [ ] **Step 4: Commit**

```bash
git add app/\(user\)/burger/\[id\].tsx
git commit -m "feat(burger): live detail from firestore with BurgerImage"
```

---

## Task 14: Deprecate lib/burgerImages.ts

**Files:**
- Delete: `lib/burgerImages.ts`

- [ ] **Step 1: Verificar sin refs activas**

```bash
grep -rn "burgerImages" app/ components/ hooks/ lib/
```

Expected: No matches.

- [ ] **Step 2: Eliminar**

```bash
git rm lib/burgerImages.ts
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: Sin errores.

- [ ] **Step 4: Commit**

```bash
git commit -m "chore: remove deprecated lib/burgerImages.ts"
```

---

## Task 15: Manual QA full

- [ ] Sin novedades activas → ticker oculto.
- [ ] Admin crea novedad → aparece en ticker.
- [ ] Menú con items → PopularBurgers populado.
- [ ] Item sin `fotoUrl` → placeholder verde "SIN FOTO".
- [ ] Torneo `proximamente` → chip amber + countdown en home y en pantalla torneos.
- [ ] Torneo `activo` → chip verde + barra de cupos.
- [ ] Ningún torneo visible → sección oculta.
- [ ] Ganador previo → ChampionCard real.
- [ ] Sin ganadores → ChampionCard oculta.
- [ ] Entradas activas/pending del user → StatsCards count correcto.
- [ ] Trend badge ya no aparece.

---

## Task 16: Create PR

- [ ] **Step 1: Push**

```bash
git push origin feature/admin-dashboard-v2
```

- [ ] **Step 2: Open PR**

```bash
gh pr create --title "feat: live data wiring + BurgerImage placeholder" --body "$(cat <<'EOF'
## Summary
- New BurgerImage universal component with placeholder for null fotoUrl.
- Hooks: useNovedadesActivas, useMenuItems, useMenuCategorias, useTorneosVisibles, useUltimoCampeon, useEntradasActivasCount.
- home.tsx: PromoTicker, PopularBurgers, TournamentsList, ChampionCard, StatsCards all live.
- menu.tsx: items + categorias from Firestore.
- burger/[id].tsx: live detail.
- Deprecated lib/burgerImages.ts.

## Test plan
- [ ] Empty states hide properly.
- [ ] BurgerImage placeholder renders when fotoUrl is null.
- [ ] Countdown shows for upcoming tournaments.
- [ ] ChampionCard shows latest winner.
EOF
)"
```

---

## Self-Review

- **Spec coverage:** Sección 5 completa. Decisión divergente sobre `anuncios` vs `novedades` documentada arriba.
- **No placeholders:** Cada paso tiene código + comando.
- **Depende de Plan 2:** `getTorneoEstado`, `fechaInicio`, `TournamentCountdown` listos.
- **Backwards-compat:** Torneos sin `fechaInicio` renderizan como "activo".

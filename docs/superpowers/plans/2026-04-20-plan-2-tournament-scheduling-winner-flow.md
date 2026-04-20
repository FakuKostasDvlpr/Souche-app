# Plan 2 — Tournament Scheduling + Winner Flow + Cloud Functions

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir al superadmin crear torneos con fecha de publicación, mostrar countdown "PRÓXIMAMENTE" hasta activar, y desde un detalle admin elegir ganador o terminar el torneo — con push notifications automáticas vía Cloud Functions.

**Architecture:** Schema extension de `Torneo` con `fechaInicio` + `puntosCampeon`. Estado derivado puro (`getTorneoEstado`) evita pub/sub server-side. Pantalla `admin/torneo/[id].tsx` con sticky bottom para "Elegir ganador" y "Terminar torneo", reusando `elegirGanadorDeTorneo` (Plan 1) y `cerrarTorneo` existente. Dos Cloud Functions: `onGanadorSet` (1 push al ganador) y `onTorneoCerrado` (N pushes a participantes).

**Tech Stack:** Expo 54, RN 0.81, React 19, `@react-native-community/datetimepicker` (nuevo), Firestore v12 (`writeBatch`, `Timestamp`), `expo-router`, Firebase Functions v2, Expo Push API.

**Spec:** `docs/superpowers/specs/2026-04-20-achievement-and-live-data-design.md` — secciones 3 (Tournament winner flow) y 4 (Cloud Functions).

**Depende de:** Plan 1 completo (`elegirGanadorDeTorneo` existe en `lib/firestore.ts`).

**Out-of-scope:**
- Migración de torneos legacy (defaults en `normalizeTorneo`).
- Feature flags.
- CI para functions.

---

## File Structure

**Nuevos:**
- `hooks/useCountdown.ts` — Countdown adaptativo (30s / 1s cadencia).
- `components/ui/TournamentCountdown.tsx` — UI del countdown.
- `app/(user)/admin/torneo/[id].tsx` — Pantalla detalle admin.
- `app/(user)/admin/torneo/_components/ElegirGanadorSheet.tsx` — Bottom sheet con FlatList de participantes.
- `functions/src/lib/chunkArray.ts` — Helper.
- `functions/src/lib/expoPush.ts` — Helper `sendExpoPush` + `sendExpoPushBatch`.
- `functions/src/notifications/onGanadorSet.ts` — CF push al ganador.
- `functions/src/notifications/onTorneoCerrado.ts` — CF push masivo.
- `tests/unit/getTorneoEstado.test.ts` — TDD pure fn.
- `tests/unit/useCountdown.test.ts` — TDD hook.

**Modificar:**
- `lib/firestore.ts` — `Torneo` type (+`fechaInicio`, +`puntosCampeon`), `normalizeTorneo` defaults, nueva fn `getTorneoEstado`, type `TorneoEstado`.
- `app/(user)/admin/crm-torneos.tsx` — Form: 2 DateTimePicker, `puntosCampeon` field, validaciones. List card tap → navegar a detalle.
- `functions/src/index.ts` — Exportar nuevas CFs.
- `functions/package.json` — si falta `node-fetch`.
- `package.json` — `@react-native-community/datetimepicker`.

---

## Task 1: Instalar DateTimePicker

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install package**

```bash
npx expo install @react-native-community/datetimepicker
```

Expected: Resuelve versión compatible con Expo SDK 54 (≈ `8.3.x`).

- [ ] **Step 2: Verify on iOS simulator (smoke)**

Crear stub temporal en `app/(user)/home.tsx` (tope del componente):

```tsx
import DateTimePicker from "@react-native-community/datetimepicker";
// <DateTimePicker value={new Date()} mode="datetime" onChange={() => {}} />
```

Run: `npx expo start` → abrir app → verificar que no crashea el import. Luego remover stub.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: install @react-native-community/datetimepicker"
```

---

## Task 2: Extender Torneo con fechaInicio + puntosCampeon

**Files:**
- Modify: `lib/firestore.ts:32-49` (interface), `lib/firestore.ts:211-213` (normalizeTorneo)

- [ ] **Step 1: Agregar campos al interface**

En `lib/firestore.ts`, reemplazar el bloque `export interface Torneo { ... }`:

```typescript
export interface Torneo {
  id: string;
  nombre: string;
  fecha: string;
  fechaTimestamp: Timestamp | null;
  fechaInicio: Timestamp | null;  // NEW — activación / publicación
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
  puntosCampeon: number;  // NEW — default 500
  cerrado: boolean;
  creadoEn: Timestamp | null;
}
```

- [ ] **Step 2: Actualizar normalizeTorneo con defaults**

Reemplazar `normalizeTorneo`:

```typescript
function normalizeTorneo(data: DocumentData, id: string): Torneo {
  return {
    ...data,
    id,
    fechaInicio: data.fechaInicio ?? null,
    puntosParticipacion: data.puntosParticipacion ?? 0,
    puntosCampeon: data.puntosCampeon ?? 500,
    cerrado: data.cerrado ?? false,
  } as Torneo;
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: Pasa sin errores. Los callsites de `createTorneo` fallarán si no se pasa `fechaInicio` o `puntosCampeon` — fix en Task 6.

- [ ] **Step 4: Commit**

```bash
git add lib/firestore.ts
git commit -m "feat(torneo): add fechaInicio and puntosCampeon fields with defaults"
```

---

## Task 3: getTorneoEstado pure function (TDD)

**Files:**
- Create: `tests/unit/getTorneoEstado.test.ts`
- Modify: `lib/firestore.ts` (agregar `TorneoEstado` type y `getTorneoEstado` fn)

- [ ] **Step 1: Write failing test**

Crear `tests/unit/getTorneoEstado.test.ts`:

```typescript
import { Timestamp } from "firebase/firestore";
import { getTorneoEstado, type Torneo } from "@/lib/firestore";

function mkTorneo(overrides: Partial<Torneo> = {}): Torneo {
  return {
    id: "t1",
    nombre: "Test",
    fecha: "",
    fechaTimestamp: null,
    fechaInicio: null,
    lugar: "",
    precio: "",
    precioNum: 0,
    cuposMaximos: 0,
    cuposOcupados: 0,
    descripcion: "",
    reglas: "",
    activo: true,
    ganadorUid: null,
    puntosParticipacion: 0,
    puntosCampeon: 500,
    cerrado: false,
    creadoEn: null,
    ...overrides,
  };
}

describe("getTorneoEstado", () => {
  const NOW = new Date("2026-04-20T12:00:00Z");

  it("returns 'cerrado' when cerrado flag is true", () => {
    const t = mkTorneo({ cerrado: true });
    expect(getTorneoEstado(t, NOW)).toBe("cerrado");
  });

  it("returns 'inactivo' when activo is false and not cerrado", () => {
    const t = mkTorneo({ activo: false });
    expect(getTorneoEstado(t, NOW)).toBe("inactivo");
  });

  it("returns 'proximamente' when fechaInicio is in the future", () => {
    const future = Timestamp.fromDate(new Date("2026-04-25T12:00:00Z"));
    const t = mkTorneo({ fechaInicio: future });
    expect(getTorneoEstado(t, NOW)).toBe("proximamente");
  });

  it("returns 'activo' when fechaInicio is past", () => {
    const past = Timestamp.fromDate(new Date("2026-04-15T12:00:00Z"));
    const t = mkTorneo({ fechaInicio: past });
    expect(getTorneoEstado(t, NOW)).toBe("activo");
  });

  it("returns 'activo' when fechaInicio is null (legacy torneo)", () => {
    const t = mkTorneo({ fechaInicio: null });
    expect(getTorneoEstado(t, NOW)).toBe("activo");
  });

  it("prioritizes 'cerrado' over 'proximamente'", () => {
    const future = Timestamp.fromDate(new Date("2026-04-25T12:00:00Z"));
    const t = mkTorneo({ fechaInicio: future, cerrado: true });
    expect(getTorneoEstado(t, NOW)).toBe("cerrado");
  });
});
```

- [ ] **Step 2: Run test to verify fail**

Run: `npx jest tests/unit/getTorneoEstado.test.ts`
Expected: FAIL — "getTorneoEstado is not exported".

- [ ] **Step 3: Implement getTorneoEstado**

En `lib/firestore.ts`, agregar debajo de `normalizeTorneo`:

```typescript
export type TorneoEstado = "proximamente" | "activo" | "cerrado" | "inactivo";

export function getTorneoEstado(t: Torneo, now: Date = new Date()): TorneoEstado {
  if (t.cerrado) return "cerrado";
  if (!t.activo) return "inactivo";
  if (t.fechaInicio && t.fechaInicio.toDate() > now) return "proximamente";
  return "activo";
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npx jest tests/unit/getTorneoEstado.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/firestore.ts tests/unit/getTorneoEstado.test.ts
git commit -m "feat(torneo): add TorneoEstado derived state fn with tests"
```

---

## Task 4: useCountdown hook (TDD)

**Files:**
- Create: `hooks/useCountdown.ts`
- Create: `tests/unit/useCountdown.test.ts`

- [ ] **Step 1: Write failing test**

Crear `tests/unit/useCountdown.test.ts`:

```typescript
import { renderHook, act } from "@testing-library/react-hooks";
import { useCountdown } from "@/hooks/useCountdown";

jest.useFakeTimers();

describe("useCountdown", () => {
  beforeEach(() => {
    jest.setSystemTime(new Date("2026-04-20T12:00:00Z"));
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  it("returns expired=true and zeros when target is null", () => {
    const { result } = renderHook(() => useCountdown(null));
    expect(result.current.expired).toBe(true);
    expect(result.current.d).toBe(0);
    expect(result.current.h).toBe(0);
    expect(result.current.m).toBe(0);
    expect(result.current.s).toBe(0);
  });

  it("computes days/hours/minutes/seconds to target", () => {
    const target = new Date("2026-04-22T14:30:45Z");
    const { result } = renderHook(() => useCountdown(target));
    expect(result.current.expired).toBe(false);
    expect(result.current.d).toBe(2);
    expect(result.current.h).toBe(2);
    expect(result.current.m).toBe(30);
    expect(result.current.s).toBe(45);
  });

  it("returns expired=true when target is in the past", () => {
    const target = new Date("2026-04-19T12:00:00Z");
    const { result } = renderHook(() => useCountdown(target));
    expect(result.current.expired).toBe(true);
  });

  it("uses 30s tick when target > 1h away", () => {
    const target = new Date("2026-04-20T14:00:00Z");
    const { result } = renderHook(() => useCountdown(target));
    expect(result.current.h).toBe(2);
    act(() => { jest.advanceTimersByTime(30_000); });
    expect(result.current.m).toBe(59);
  });

  it("uses 1s tick when target < 1h away", () => {
    const target = new Date("2026-04-20T12:30:00Z");
    const { result } = renderHook(() => useCountdown(target));
    expect(result.current.m).toBe(30);
    act(() => { jest.advanceTimersByTime(1000); });
    expect(result.current.s).toBe(59);
  });

  it("flips to expired when countdown reaches zero", () => {
    const target = new Date("2026-04-20T12:00:05Z");
    const { result } = renderHook(() => useCountdown(target));
    expect(result.current.expired).toBe(false);
    act(() => { jest.advanceTimersByTime(6000); });
    expect(result.current.expired).toBe(true);
  });
});
```

- [ ] **Step 2: Install test deps si faltan**

```bash
npm install --save-dev @testing-library/react-hooks
```

- [ ] **Step 3: Run test to verify fail**

Run: `npx jest tests/unit/useCountdown.test.ts`
Expected: FAIL — módulo no existe.

- [ ] **Step 4: Implement hook**

Crear `hooks/useCountdown.ts`:

```typescript
import { useEffect, useState, useRef } from "react";

export interface CountdownState {
  d: number;
  h: number;
  m: number;
  s: number;
  expired: boolean;
  totalMs: number;
}

const ZERO: CountdownState = { d: 0, h: 0, m: 0, s: 0, expired: true, totalMs: 0 };

function compute(target: Date | null, now: Date): CountdownState {
  if (!target) return ZERO;
  const diff = target.getTime() - now.getTime();
  if (diff <= 0) return { ...ZERO, totalMs: 0 };
  const d = Math.floor(diff / 86_400_000);
  const h = Math.floor((diff % 86_400_000) / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);
  return { d, h, m, s, expired: false, totalMs: diff };
}

export function useCountdown(target: Date | null): CountdownState {
  const [state, setState] = useState<CountdownState>(() => compute(target, new Date()));
  const targetRef = useRef(target);
  targetRef.current = target;

  useEffect(() => {
    if (!target) {
      setState(ZERO);
      return;
    }
    setState(compute(target, new Date()));

    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const next = compute(targetRef.current, new Date());
      setState(next);
      if (next.expired) return;
      const cadence = next.totalMs > 3_600_000 ? 30_000 : 1000;
      timer = setTimeout(tick, cadence);
    };
    timer = setTimeout(tick, 1000);
    return () => clearTimeout(timer);
  }, [target?.getTime()]);

  return state;
}
```

- [ ] **Step 5: Run tests to verify pass**

Run: `npx jest tests/unit/useCountdown.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 6: Commit**

```bash
git add hooks/useCountdown.ts tests/unit/useCountdown.test.ts package.json package-lock.json
git commit -m "feat(hooks): useCountdown with adaptive cadence + tests"
```

---

## Task 5: TournamentCountdown component

**Files:**
- Create: `components/ui/TournamentCountdown.tsx`

- [ ] **Step 1: Implement component**

```tsx
import React from "react";
import { View, Text } from "react-native";
import { useCountdown } from "@/hooks/useCountdown";

interface Props {
  target: Date | null;
  size?: "sm" | "md";
}

export function TournamentCountdown({ target, size = "md" }: Props) {
  const { d, h, m, s, expired } = useCountdown(target);
  if (expired || !target) return null;

  const isSm = size === "sm";
  const cellW = isSm ? 30 : 44;
  const cellH = isSm ? 30 : 44;
  const numSize = isSm ? 14 : 22;
  const labelSize = isSm ? 8 : 10;

  const cells: Array<[string, number]> = [
    ["DÍAS", d],
    ["HS", h],
    ["MIN", m],
    ["SEG", s],
  ];

  return (
    <View style={{ flexDirection: "row", gap: isSm ? 6 : 10, alignItems: "center" }}>
      {cells.map(([label, value], i) => (
        <View
          key={label}
          style={{
            width: cellW,
            height: cellH,
            borderRadius: 8,
            backgroundColor: "rgba(247,174,0,0.12)",
            borderWidth: 1,
            borderColor: "rgba(247,174,0,0.3)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              color: "#F7AE00",
              fontFamily: "SpaceGrotesk_700Bold",
              fontSize: numSize,
              lineHeight: numSize + 2,
            }}
          >
            {String(value).padStart(2, "0")}
          </Text>
          <Text
            style={{
              color: "rgba(247,174,0,0.7)",
              fontFamily: "Inter_500Medium",
              fontSize: labelSize,
              letterSpacing: 1,
            }}
          >
            {label}
          </Text>
        </View>
      ))}
    </View>
  );
}
```

- [ ] **Step 2: Smoke render en home.tsx (temporal)**

En `app/(user)/home.tsx` dentro del `ScrollView` (después de `<PromoTicker />`):

```tsx
{/* TEMP */}
<TournamentCountdown target={new Date(Date.now() + 3 * 86_400_000 + 2 * 3_600_000)} />
```

Import: `import { TournamentCountdown } from "@/components/ui/TournamentCountdown";`

Run: `npx expo start` → verificar render. Remover bloque después de validar.

- [ ] **Step 3: Commit**

```bash
git add components/ui/TournamentCountdown.tsx
git commit -m "feat(ui): TournamentCountdown amber pill"
```

---

## Task 6: Update CRM form (crm-torneos.tsx)

**Files:**
- Modify: `app/(user)/admin/crm-torneos.tsx`

- [ ] **Step 1: Extend FormState**

Reemplazar `type FormState` y `EMPTY_FORM`:

```typescript
type FormState = {
  nombre: string;
  fechaInicio: Date | null;
  fechaEvento: Date | null;
  lugar: string;
  precio: string;
  precioNum: string;
  cuposMaximos: string;
  descripcion: string;
  reglas: string;
  activo: boolean;
  puntosParticipacion: string;
  puntosCampeon: string;
};

const EMPTY_FORM: FormState = {
  nombre: "",
  fechaInicio: null,
  fechaEvento: null,
  lugar: "",
  precio: "",
  precioNum: "",
  cuposMaximos: "",
  descripcion: "",
  reglas: "",
  activo: true,
  puntosParticipacion: "0",
  puntosCampeon: "500",
};
```

- [ ] **Step 2: Reemplazar torneoToForm**

```typescript
function torneoToForm(t: Torneo): FormState {
  return {
    nombre: t.nombre,
    fechaInicio: t.fechaInicio ? t.fechaInicio.toDate() : null,
    fechaEvento: t.fechaTimestamp ? t.fechaTimestamp.toDate() : null,
    lugar: t.lugar,
    precio: t.precio,
    precioNum: String(t.precioNum),
    cuposMaximos: String(t.cuposMaximos),
    descripcion: t.descripcion,
    reglas: t.reglas,
    activo: t.activo,
    puntosParticipacion: String(t.puntosParticipacion),
    puntosCampeon: String(t.puntosCampeon),
  };
}
```

- [ ] **Step 3: Importar DateTimePicker + Timestamp**

En los imports superiores:

```typescript
import DateTimePicker from "@react-native-community/datetimepicker";
import { Platform } from "react-native";
import { Timestamp } from "firebase/firestore";
```

- [ ] **Step 4: Agregar date picker state**

Debajo de `const [saving, setSaving] = useState(false);`:

```typescript
const [pickerOpen, setPickerOpen] = useState<null | "inicio" | "evento">(null);
```

- [ ] **Step 5: Reemplazar handleSave con validaciones**

```typescript
const handleSave = async () => {
  if (!form.nombre.trim() || !form.lugar.trim()) {
    Alert.alert("Campos requeridos", "Nombre y lugar son obligatorios.");
    return;
  }
  if (form.fechaInicio && form.fechaEvento && form.fechaInicio > form.fechaEvento) {
    Alert.alert("Fechas inválidas", "La fecha de inicio debe ser anterior o igual a la del evento.");
    return;
  }
  if (!editTarget && form.fechaInicio && form.fechaInicio < new Date()) {
    Alert.alert("Fecha inválida", "La fecha de publicación no puede ser pasada.");
    return;
  }
  setSaving(true);
  try {
    const fechaStr = form.fechaEvento
      ? new Intl.DateTimeFormat("es-AR", {
          day: "numeric",
          month: "long",
          year: "numeric",
          timeZone: "America/Argentina/Buenos_Aires",
        }).format(form.fechaEvento)
      : "";
    const data = {
      nombre: form.nombre.trim(),
      fecha: fechaStr,
      fechaTimestamp: form.fechaEvento ? Timestamp.fromDate(form.fechaEvento) : null,
      fechaInicio: form.fechaInicio ? Timestamp.fromDate(form.fechaInicio) : null,
      lugar: form.lugar.trim(),
      precio: form.precio.trim() || `$${form.precioNum}`,
      precioNum: parseInt(form.precioNum) || 0,
      cuposMaximos: parseInt(form.cuposMaximos) || 0,
      descripcion: form.descripcion.trim(),
      reglas: form.reglas.trim(),
      activo: form.activo,
      puntosParticipacion: parseInt(form.puntosParticipacion) || 0,
      puntosCampeon: parseInt(form.puntosCampeon) || 500,
    };
    if (editTarget) {
      await updateTorneo(editTarget.id, data);
    } else {
      await createTorneo(data);
    }
    setModalVisible(false);
  } catch {
    Alert.alert("Error", "No se pudo guardar el torneo.");
  } finally {
    setSaving(false);
  }
};
```

- [ ] **Step 6: Crear DatePickerField inline helper**

Antes del `return` principal del componente, agregar helper:

```tsx
const DateField = ({ label, value, onChange, kind }: {
  label: string;
  value: Date | null;
  onChange: (d: Date) => void;
  kind: "inicio" | "evento";
}) => (
  <View style={{ marginBottom: 14 }}>
    <Text style={{ color: c.fgMuted, fontSize: 11, fontWeight: "700", letterSpacing: 1, marginBottom: 6 }}>
      {label}
    </Text>
    <Pressable
      onPress={() => setPickerOpen(kind)}
      style={{
        backgroundColor: c.surface2,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: c.border,
        paddingHorizontal: 14,
        paddingVertical: 13,
      }}
    >
      <Text style={{ color: value ? c.fg : c.fgMuted, fontSize: 14 }}>
        {value
          ? value.toLocaleString("es-AR", { dateStyle: "medium", timeStyle: "short" })
          : "Tocar para elegir"}
      </Text>
    </Pressable>
    {pickerOpen === kind && (
      <DateTimePicker
        value={value ?? new Date()}
        mode="datetime"
        display={Platform.OS === "ios" ? "spinner" : "default"}
        onChange={(_e, selected) => {
          setPickerOpen(null);
          if (selected) onChange(selected);
        }}
      />
    )}
  </View>
);
```

- [ ] **Step 7: Reemplazar campos del form dentro del Modal ScrollView**

Sustituir el bloque desde `<Field label="NOMBRE" ...` hasta antes de `<Pressable onPress={handleSave}`:

```tsx
<Field label="NOMBRE" value={form.nombre} onChangeText={(v) => setForm((f) => ({ ...f, nombre: v }))} />
<DateField
  label="FECHA DE PUBLICACIÓN"
  value={form.fechaInicio}
  onChange={(d) => setForm((f) => ({ ...f, fechaInicio: d }))}
  kind="inicio"
/>
<DateField
  label="FECHA DEL EVENTO"
  value={form.fechaEvento}
  onChange={(d) => setForm((f) => ({ ...f, fechaEvento: d }))}
  kind="evento"
/>
<Field label="LUGAR" value={form.lugar} onChangeText={(v) => setForm((f) => ({ ...f, lugar: v }))} />
<Field label="PRECIO (display: $5.000)" value={form.precio} onChangeText={(v) => setForm((f) => ({ ...f, precio: v }))} />
<Field label="PRECIO NUMÉRICO" value={form.precioNum} onChangeText={(v) => setForm((f) => ({ ...f, precioNum: v }))} keyboardType="numeric" />
<Field label="CUPOS MÁXIMOS" value={form.cuposMaximos} onChangeText={(v) => setForm((f) => ({ ...f, cuposMaximos: v }))} keyboardType="numeric" />
<Field label="PUNTOS POR PARTICIPACIÓN" value={form.puntosParticipacion} onChangeText={(v) => setForm((f) => ({ ...f, puntosParticipacion: v }))} keyboardType="numeric" />
<Field label="PUNTOS PARA EL CAMPEÓN" value={form.puntosCampeon} onChangeText={(v) => setForm((f) => ({ ...f, puntosCampeon: v }))} keyboardType="numeric" />
<Field label="DESCRIPCIÓN" value={form.descripcion} onChangeText={(v) => setForm((f) => ({ ...f, descripcion: v }))} multiline />
<Field label="REGLAS" value={form.reglas} onChangeText={(v) => setForm((f) => ({ ...f, reglas: v }))} multiline />

<View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
  <Text style={{ color: c.fg, fontWeight: "600", fontSize: 14 }}>Publicado</Text>
  <Switch
    value={form.activo}
    onValueChange={(v) => setForm((f) => ({ ...f, activo: v }))}
    trackColor={{ true: c.lime, false: c.border }}
    thumbColor="#fff"
  />
</View>
```

- [ ] **Step 8: List card tap → navegar a detalle**

En `renderItem`, envolver el `<View>` card en `<Pressable onPress={() => router.push(\`/(user)/admin/torneo/${item.id}\` as any)}>`. Mantener los botones "Editar" / "Cerrar" con `stopPropagation` de facto (Pressable anidado funciona OK). Alternativa: mover card container a Pressable. Shape final:

```tsx
const renderItem = useCallback(({ item }: { item: Torneo }) => (
  <Pressable
    onPress={() => router.push(`/(user)/admin/torneo/${item.id}` as any)}
    style={{
      marginHorizontal: 16,
      marginBottom: 12,
      backgroundColor: c.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: item.cerrado ? c.border : item.activo ? c.limeAlpha(0.3) : c.border,
      overflow: "hidden",
    }}
  >
    {/* contenido existente */}
  </Pressable>
), [c, closingId, openEdit, handleCerrar, router]);
```

- [ ] **Step 9: Verify**

Run: `npx expo start` → abrir CRM torneos → abrir form → verificar DateTimePicker en iOS y Android. Cancelar sin guardar.

- [ ] **Step 10: Commit**

```bash
git add app/\(user\)/admin/crm-torneos.tsx
git commit -m "feat(admin): CRM form — fechaInicio/fechaEvento DatePickers + puntosCampeon"
```

---

## Task 7: Admin detail screen — scaffold

**Files:**
- Create: `app/(user)/admin/torneo/[id].tsx`

- [ ] **Step 1: Crear el archivo con layout base**

```tsx
import { useEffect, useState, useMemo } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, Redirect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "@/lib/theme";
import { ScreenBackground } from "@/components/ui/ScreenBackground";
import { TournamentCountdown } from "@/components/ui/TournamentCountdown";
import { useAuthStore } from "@/store/useAuthStore";
import {
  getTorneo,
  subscribeToAllEntradas,
  getTorneoEstado,
  cerrarTorneo,
  type Torneo,
  type Entrada,
} from "@/lib/firestore";

export default function AdminTorneoDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const c = useThemeColors();
  const profile = useAuthStore((s) => s.profile);

  const [torneo, setTorneo] = useState<Torneo | null>(null);
  const [loading, setLoading] = useState(true);
  const [entradas, setEntradas] = useState<Entrada[]>([]);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    getTorneo(id).then((t) => {
      if (!mounted) return;
      setTorneo(t);
      setLoading(false);
    });
    return () => { mounted = false; };
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const unsub = subscribeToAllEntradas((all) => {
      setEntradas(all.filter((e) => e.torneoId === id && e.estado === "activo"));
    });
    return unsub;
  }, [id]);

  const estado = useMemo(() => (torneo ? getTorneoEstado(torneo) : null), [torneo]);

  if (profile?.rol !== "admin") return <Redirect href="/(user)/home" />;
  if (loading || !torneo) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
        <ScreenBackground>
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator color={c.lime} />
          </View>
        </ScreenBackground>
      </SafeAreaView>
    );
  }

  const hasGanador = torneo.ganadorUid != null;
  const canElegir = !torneo.cerrado && !hasGanador && entradas.length > 0 && estado === "activo";
  const canTerminar = !torneo.cerrado && estado !== "proximamente";

  const handleTerminar = () => {
    Alert.alert(
      "Terminar torneo",
      `Se asignarán ${torneo.puntosParticipacion} pts a ${entradas.length} participantes. ¿Confirmar?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Terminar",
          style: "destructive",
          onPress: async () => {
            setClosing(true);
            try {
              await cerrarTorneo(torneo.id, torneo.nombre, torneo.puntosParticipacion);
              Alert.alert("Torneo cerrado", "Los participantes fueron notificados.");
              router.back();
            } catch {
              Alert.alert("Error", "No se pudo cerrar el torneo.");
            } finally {
              setClosing(false);
            }
          },
        },
      ]
    );
  };

  const chipColor =
    estado === "proximamente" ? "#F7AE00"
    : estado === "cerrado" ? "#FF3B30"
    : estado === "activo" ? c.lime
    : c.fgMuted;
  const chipBg =
    estado === "proximamente" ? "rgba(247,174,0,0.15)"
    : estado === "cerrado" ? "rgba(255,59,48,0.15)"
    : estado === "activo" ? c.limeAlpha(0.15)
    : c.surface2;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={["top"]}>
      <ScreenBackground>
        <View style={{ flex: 1 }}>
          {/* Header */}
          <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8, flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Pressable onPress={() => router.back()} style={{ padding: 4 }}>
              <Ionicons name="arrow-back" size={24} color={c.fg} />
            </Pressable>
            <Text style={{ flex: 1, color: c.fgMuted, fontSize: 12, letterSpacing: 2, fontWeight: "700" }}>
              DETALLE TORNEO
            </Text>
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
            <View style={{ paddingHorizontal: 20, gap: 6 }}>
              <Text style={{ fontFamily: "BebasNeue", color: c.fg, fontSize: 36, letterSpacing: 0.5 }}>
                {torneo.nombre}
              </Text>
              <Text style={{ color: c.fgMuted, fontSize: 14 }}>
                {torneo.fecha || "Sin fecha"} · {torneo.lugar}
              </Text>
              <View style={{ alignSelf: "flex-start", marginTop: 8, backgroundColor: chipBg, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 5 }}>
                <Text style={{ color: chipColor, fontSize: 11, fontWeight: "800", letterSpacing: 1 }}>
                  {estado?.toUpperCase()}
                </Text>
              </View>
              {estado === "proximamente" && torneo.fechaInicio && (
                <View style={{ marginTop: 10 }}>
                  <TournamentCountdown target={torneo.fechaInicio.toDate()} size="md" />
                </View>
              )}
            </View>

            {/* Stats row */}
            <View style={{ flexDirection: "row", gap: 10, paddingHorizontal: 20, marginTop: 20 }}>
              <StatBox label="CUPOS" value={`${torneo.cuposOcupados}/${torneo.cuposMaximos}`} c={c} />
              <StatBox label="PTS PART." value={String(torneo.puntosParticipacion)} c={c} />
              <StatBox label="PTS CAMP." value={String(torneo.puntosCampeon)} c={c} />
            </View>

            {/* Descripción y reglas */}
            {!!torneo.descripcion && (
              <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
                <Text style={{ color: c.fgMuted, fontSize: 11, letterSpacing: 1, fontWeight: "700" }}>DESCRIPCIÓN</Text>
                <Text style={{ color: c.fg, fontSize: 14, lineHeight: 20, marginTop: 6 }}>{torneo.descripcion}</Text>
              </View>
            )}

            {/* Ganador section */}
            <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
              <Text style={{ color: c.fgMuted, fontSize: 11, letterSpacing: 1, fontWeight: "700" }}>GANADOR</Text>
              {hasGanador ? (
                <View style={{ marginTop: 8, backgroundColor: c.limeAlpha(0.12), borderRadius: 14, padding: 12, borderWidth: 1, borderColor: c.limeAlpha(0.3) }}>
                  <Text style={{ color: c.lime, fontSize: 13, fontWeight: "700" }}>🏆 UID: {torneo.ganadorUid}</Text>
                  <Text style={{ color: c.fgMuted, fontSize: 12, marginTop: 4 }}>
                    +{torneo.puntosCampeon} pts · {torneo.nombre}
                  </Text>
                </View>
              ) : (
                <Text style={{ color: c.fgMuted, fontSize: 14, marginTop: 8 }}>
                  Ningún ganador elegido aún.
                </Text>
              )}
            </View>

            {/* Participantes */}
            <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
              <Text style={{ color: c.fgMuted, fontSize: 11, letterSpacing: 1, fontWeight: "700" }}>
                PARTICIPANTES ACTIVOS ({entradas.length})
              </Text>
              <View style={{ gap: 8, marginTop: 8 }}>
                {entradas.map((e) => (
                  <View key={e.id} style={{ backgroundColor: c.surface, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: c.border }}>
                    <Text style={{ color: c.fg, fontSize: 14, fontWeight: "600" }}>{e.usuarioNombre}</Text>
                    <Text style={{ color: c.fgMuted, fontSize: 12, marginTop: 2 }}>{e.usuarioEmail}</Text>
                  </View>
                ))}
                {entradas.length === 0 && (
                  <Text style={{ color: c.fgMuted, fontSize: 13 }}>Sin participantes todavía.</Text>
                )}
              </View>
            </View>
          </ScrollView>

          {/* Sticky bottom actions */}
          <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: 16, paddingBottom: 28, backgroundColor: c.bg, borderTopWidth: 1, borderTopColor: c.border, flexDirection: "row", gap: 10 }}>
            <Pressable
              disabled={!canElegir}
              onPress={() => { /* Task 8 wires bottom sheet */ }}
              style={{ flex: 1, backgroundColor: canElegir ? c.lime : c.surface2, borderRadius: 14, paddingVertical: 14, alignItems: "center" }}
            >
              <Text style={{ color: canElegir ? "#0A0E0B" : c.fgMuted, fontWeight: "800", fontSize: 14 }}>
                🏆 Elegir ganador
              </Text>
            </Pressable>
            <Pressable
              disabled={!canTerminar || closing}
              onPress={handleTerminar}
              style={{ flex: 1, backgroundColor: canTerminar ? "#F7AE00" : c.surface2, borderRadius: 14, paddingVertical: 14, alignItems: "center" }}
            >
              {closing ? <ActivityIndicator color="#fff" /> : (
                <Text style={{ color: canTerminar ? "#0A0E0B" : c.fgMuted, fontWeight: "800", fontSize: 14 }}>
                  🔒 Terminar torneo
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </ScreenBackground>
    </SafeAreaView>
  );
}

function StatBox({ label, value, c }: { label: string; value: string; c: ReturnType<typeof useThemeColors> }) {
  return (
    <View style={{ flex: 1, backgroundColor: c.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: c.border }}>
      <Text style={{ color: c.fgMuted, fontSize: 10, letterSpacing: 1, fontWeight: "700" }}>{label}</Text>
      <Text style={{ color: c.fg, fontFamily: "SpaceGrotesk_700Bold", fontSize: 18, marginTop: 4 }}>{value}</Text>
    </View>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npx expo start` → CRM torneos → tap card → carga detalle → "Elegir ganador" disabled sin participantes, "Terminar torneo" habilitado si `activo`.

- [ ] **Step 3: Commit**

```bash
git add app/\(user\)/admin/torneo/\[id\].tsx
git commit -m "feat(admin): tournament detail screen with sticky actions"
```

---

## Task 8: ElegirGanadorSheet

**Files:**
- Create: `app/(user)/admin/torneo/_components/ElegirGanadorSheet.tsx`
- Modify: `app/(user)/admin/torneo/[id].tsx`

- [ ] **Step 1: Implement sheet**

```tsx
import { useState } from "react";
import { View, Text, Modal, Pressable, FlatList, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "@/lib/theme";
import { elegirGanadorDeTorneo, type Entrada } from "@/lib/firestore";

interface Props {
  visible: boolean;
  torneoId: string;
  torneoNombre: string;
  puntosCampeon: number;
  participantes: Entrada[];
  onClose: () => void;
  onDone: () => void;
}

export function ElegirGanadorSheet({
  visible, torneoId, torneoNombre, puntosCampeon, participantes, onClose, onDone,
}: Props) {
  const c = useThemeColors();
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (!selectedUid) return;
    setSubmitting(true);
    try {
      await elegirGanadorDeTorneo(torneoId, selectedUid, torneoNombre, puntosCampeon);
      onDone();
    } catch (e) {
      Alert.alert("Error", "No se pudo elegir el ganador.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
        <View style={{ backgroundColor: c.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: "85%" }}>
          <View style={{ padding: 20, paddingBottom: 12, flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: "BebasNeue", color: c.fg, fontSize: 22, letterSpacing: 1 }}>
                ELEGIR CAMPEÓN
              </Text>
              <Text style={{ color: c.fgMuted, fontSize: 12, marginTop: 4 }}>
                Recibirá +{puntosCampeon} pts y notificación
              </Text>
            </View>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={22} color={c.fgMuted} />
            </Pressable>
          </View>

          <FlatList
            data={participantes}
            keyExtractor={(e) => e.id}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
            renderItem={({ item }) => {
              const selected = selectedUid === item.usuarioUid;
              return (
                <Pressable
                  onPress={() => setSelectedUid(item.usuarioUid)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    padding: 12,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: selected ? c.lime : c.border,
                    backgroundColor: selected ? c.limeAlpha(0.1) : c.surface2,
                    marginBottom: 8,
                  }}
                >
                  <View style={{
                    width: 22, height: 22, borderRadius: 11,
                    borderWidth: 2, borderColor: selected ? c.lime : c.border,
                    alignItems: "center", justifyContent: "center",
                  }}>
                    {selected && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.lime }} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: c.fg, fontSize: 14, fontWeight: "600" }}>{item.usuarioNombre}</Text>
                    <Text style={{ color: c.fgMuted, fontSize: 12 }}>{item.usuarioEmail}</Text>
                  </View>
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <Text style={{ color: c.fgMuted, fontSize: 14, textAlign: "center", padding: 32 }}>
                Sin participantes activos.
              </Text>
            }
          />

          <View style={{ padding: 16, paddingBottom: 32, flexDirection: "row", gap: 10, borderTopWidth: 1, borderTopColor: c.border }}>
            <Pressable
              onPress={onClose}
              style={{ flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: c.surface2, alignItems: "center" }}
            >
              <Text style={{ color: c.fg, fontWeight: "700" }}>Cancelar</Text>
            </Pressable>
            <Pressable
              onPress={handleConfirm}
              disabled={!selectedUid || submitting}
              style={{
                flex: 1, paddingVertical: 14, borderRadius: 14,
                backgroundColor: selectedUid && !submitting ? c.lime : c.surface2,
                alignItems: "center",
              }}
            >
              {submitting
                ? <ActivityIndicator color="#fff" />
                : <Text style={{ color: selectedUid ? "#0A0E0B" : c.fgMuted, fontWeight: "800" }}>Confirmar</Text>}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
```

- [ ] **Step 2: Integrar en [id].tsx**

En `app/(user)/admin/torneo/[id].tsx` agregar state + mount:

```tsx
import { ElegirGanadorSheet } from "./_components/ElegirGanadorSheet";
// ...
const [sheetOpen, setSheetOpen] = useState(false);
```

En el botón "Elegir ganador":

```tsx
onPress={() => setSheetOpen(true)}
```

Antes del cierre del `<ScreenBackground>`:

```tsx
<ElegirGanadorSheet
  visible={sheetOpen}
  torneoId={torneo.id}
  torneoNombre={torneo.nombre}
  puntosCampeon={torneo.puntosCampeon}
  participantes={entradas}
  onClose={() => setSheetOpen(false)}
  onDone={() => {
    setSheetOpen(false);
    getTorneo(torneo.id).then((t) => t && setTorneo(t));
    Alert.alert("Ganador elegido", "Se envió la notificación.");
  }}
/>
```

- [ ] **Step 3: Verify E2E**

Con 2 usuarios y un torneo `activo` con entradas: seleccionar ganador → torneo actualiza → user gana puntos (Firestore console verify).

- [ ] **Step 4: Commit**

```bash
git add app/\(user\)/admin/torneo/
git commit -m "feat(admin): ElegirGanadorSheet with participant picker"
```

---

## Task 9: Apply estado visuals to user-facing screens

**Files:**
- Modify: `app/(user)/entradas/torneos.tsx`

- [ ] **Step 1: Revisar el archivo actual**

```bash
cat app/\(user\)/entradas/torneos.tsx | head -80
```

- [ ] **Step 2: Aplicar getTorneoEstado**

En el render de cada torneo (dentro del map/FlatList):

```tsx
import { getTorneoEstado } from "@/lib/firestore";
import { TournamentCountdown } from "@/components/ui/TournamentCountdown";

const estado = getTorneoEstado(torneo);
```

Reemplazar el CTA "Inscribirme" por:

```tsx
{estado === "proximamente" ? (
  <View>
    <Text style={{ color: "#F7AE00", fontSize: 11, fontWeight: "700", letterSpacing: 1 }}>
      PRÓXIMAMENTE
    </Text>
    {torneo.fechaInicio && (
      <View style={{ marginTop: 6 }}>
        <TournamentCountdown target={torneo.fechaInicio.toDate()} size="sm" />
      </View>
    )}
  </View>
) : estado === "activo" ? (
  <Pressable onPress={handleInscribir}>{/* ... */}</Pressable>
) : null}
```

Hide items con `estado === "cerrado"` o `"inactivo"`.

- [ ] **Step 3: Verify**

Run: `npx expo start` → pantalla torneos → crear uno proximamente desde CRM → ver countdown en user feed.

- [ ] **Step 4: Commit**

```bash
git add app/\(user\)/entradas/torneos.tsx
git commit -m "feat(user): respect torneo estado on tournaments list"
```

---

## Task 10: Cloud Functions setup — libs

**Files:**
- Create: `functions/src/lib/chunkArray.ts`
- Create: `functions/src/lib/expoPush.ts`

- [ ] **Step 1: chunkArray**

```typescript
export function chunkArray<T>(arr: T[], size: number): T[][] {
  if (size <= 0) return [arr];
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}
```

- [ ] **Step 2: expoPush helpers**

```typescript
import { chunkArray } from "./chunkArray";

export interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: "default";
  priority?: "high" | "default";
}

const EXPO_URL = "https://exp.host/--/api/v2/push/send";

export async function sendExpoPush(msg: ExpoPushMessage): Promise<void> {
  try {
    const res = await fetch(EXPO_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(msg),
    });
    if (!res.ok) {
      console.error(`sendExpoPush: HTTP ${res.status}`, await res.text());
      return;
    }
    const json = (await res.json()) as { data?: Array<{ status: string; message?: string }> };
    const receipt = json?.data?.[0];
    if (receipt?.status === "error") {
      console.error("sendExpoPush receipt error:", receipt.message);
    }
  } catch (e) {
    console.error("sendExpoPush exception:", e);
    throw e;
  }
}

export async function sendExpoPushBatch(msgs: ExpoPushMessage[]): Promise<void> {
  for (const chunk of chunkArray(msgs, 100)) {
    try {
      const res = await fetch(EXPO_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(chunk),
      });
      if (!res.ok) {
        console.error(`sendExpoPushBatch: HTTP ${res.status}`, await res.text());
        continue;
      }
      const json = (await res.json()) as { data?: Array<{ status: string; message?: string }> };
      json?.data?.forEach((r) => {
        if (r.status === "error") console.error("Batch receipt error:", r.message);
      });
    } catch (e) {
      console.error("sendExpoPushBatch chunk failed:", e);
    }
  }
}
```

- [ ] **Step 3: Build functions**

```bash
cd functions && npm run build
```

Expected: TS compila OK.

- [ ] **Step 4: Commit**

```bash
cd .. && git add functions/src/lib/
git commit -m "feat(functions): chunkArray + expoPush helpers"
```

---

## Task 11: onGanadorSet Cloud Function

**Files:**
- Create: `functions/src/notifications/onGanadorSet.ts`
- Modify: `functions/src/index.ts`

- [ ] **Step 1: Implement CF**

```typescript
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { sendExpoPush } from "../lib/expoPush";

export const onGanadorSet = onDocumentUpdated(
  "users/{uid}",
  async (event) => {
    try {
      const before = event.data?.before.data();
      const after = event.data?.after.data();
      if (!before || !after) return;

      const becameGanador = !before.ganador && after.ganador;
      const torneoChanged =
        before.torneoGanado !== after.torneoGanado && !!after.torneoGanado;
      if (!becameGanador && !torneoChanged) return;

      const token = after.expoPushToken as string | undefined;
      if (!token) {
        console.log("onGanadorSet: user has no expoPushToken, skipping.");
        return;
      }

      await sendExpoPush({
        to: token,
        title: "¡Sos el CAMPEÓN! 🏆",
        body: `Ganaste ${after.torneoGanado}`,
        data: { type: "ganador", torneoNombre: after.torneoGanado },
        sound: "default",
        priority: "high",
      });
    } catch (e) {
      console.error("onGanadorSet error:", e);
    }
  }
);
```

- [ ] **Step 2: Export en index.ts**

Al final de `functions/src/index.ts`:

```typescript
export { onGanadorSet } from "./notifications/onGanadorSet";
```

- [ ] **Step 3: Build**

```bash
cd functions && npm run build && cd ..
```

- [ ] **Step 4: Commit**

```bash
git add functions/src/notifications/onGanadorSet.ts functions/src/index.ts
git commit -m "feat(functions): onGanadorSet push notification"
```

---

## Task 12: onTorneoCerrado Cloud Function

**Files:**
- Create: `functions/src/notifications/onTorneoCerrado.ts`
- Modify: `functions/src/index.ts`

- [ ] **Step 1: Implement CF**

```typescript
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { sendExpoPushBatch, type ExpoPushMessage } from "../lib/expoPush";
import { chunkArray } from "../lib/chunkArray";

export const onTorneoCerrado = onDocumentUpdated(
  "torneos/{torneoId}",
  async (event) => {
    try {
      const before = event.data?.before.data();
      const after = event.data?.after.data();
      if (!before || !after) return;
      if (before.cerrado || !after.cerrado) return;

      const torneoId = event.params.torneoId;
      const torneoNombre = (after.nombre as string) ?? "el torneo";

      const db = admin.firestore();
      const entradasSnap = await db
        .collection("entradas")
        .where("torneoId", "==", torneoId)
        .where("estado", "in", ["activo", "usado"])
        .get();

      const uids = Array.from(
        new Set(entradasSnap.docs.map((d) => d.data().usuarioUid as string).filter(Boolean))
      );
      if (uids.length === 0) {
        console.log("onTorneoCerrado: no participants, skipping.");
        return;
      }

      const tokens: string[] = [];
      for (const chunk of chunkArray(uids, 10)) {
        const usersSnap = await db
          .collection("users")
          .where(admin.firestore.FieldPath.documentId(), "in", chunk)
          .get();
        usersSnap.docs.forEach((d) => {
          const token = d.data().expoPushToken as string | undefined;
          if (token) tokens.push(token);
        });
      }

      if (tokens.length === 0) return;

      const messages: ExpoPushMessage[] = tokens.map((to) => ({
        to,
        title: "Torneo finalizado",
        body: `El torneo ${torneoNombre} terminó. ¡Gracias por participar!`,
        data: { type: "torneoCerrado", torneoId, torneoNombre },
        sound: "default",
        priority: "default",
      }));

      await sendExpoPushBatch(messages);
    } catch (e) {
      console.error("onTorneoCerrado error:", e);
    }
  }
);
```

- [ ] **Step 2: Export en index.ts**

```typescript
export { onTorneoCerrado } from "./notifications/onTorneoCerrado";
```

- [ ] **Step 3: Build**

```bash
cd functions && npm run build && cd ..
```

- [ ] **Step 4: Commit**

```bash
git add functions/src/notifications/onTorneoCerrado.ts functions/src/index.ts
git commit -m "feat(functions): onTorneoCerrado mass push to participants"
```

---

## Task 13: Deploy Cloud Functions

**Files:** N/A (deploy step)

- [ ] **Step 1: Build y deploy**

```bash
cd functions && npm run build && firebase deploy --only functions
```

Expected: `onGanadorSet` y `onTorneoCerrado` aparecen en output. No errores.

- [ ] **Step 2: Smoke test onGanadorSet**

Desde Firebase Console → Firestore → usuario test → editar doc, setear `ganador: true` + `torneoGanado: "Test Cup"` → verificar que el device con ese `expoPushToken` recibe push.

Alternativa: usar `admin/torneo/[id].tsx` con torneo real.

- [ ] **Step 3: Smoke test onTorneoCerrado**

Desde Firebase Console: torneo test con 1-2 entradas `activo` → set `cerrado: true` → verificar pushes a devices de los participantes.

- [ ] **Step 4: Commit logs/QA note (opcional)**

```bash
git commit --allow-empty -m "chore(qa): plan 2 cloud functions deployed and smoke tested"
```

---

## Task 14: Manual QA end-to-end

**Files:** N/A

- [ ] Admin crea torneo con `fechaInicio` +1 día, `puntosCampeon=500`.
- [ ] User home → sección torneos muestra "PRÓXIMAMENTE" + countdown.
- [ ] Admin edita `fechaInicio` a +1 min → espera → countdown flip a ACTIVO sin reload.
- [ ] User se inscribe (entrada activo).
- [ ] Admin detalle torneo → participante aparece en lista.
- [ ] "Elegir ganador" → pick user → confirm.
- [ ] Ganador (Plan 1 ya entregado) ve animación en foreground + push si background.
- [ ] Puntos del ganador = antes + 500.
- [ ] Admin "Terminar torneo" → confirm.
- [ ] Todos los participantes reciben push.
- [ ] Participantes tienen +puntosParticipacion en historial.
- [ ] Torneo estado = "CERRADO" en user feed.

---

## Task 15: Create PR

- [ ] **Step 1: Push branch**

```bash
git push -u origin feature/admin-dashboard-v2
```

- [ ] **Step 2: Open PR**

```bash
gh pr create --title "feat: tournament scheduling + winner flow + Cloud Functions" --body "$(cat <<'EOF'
## Summary
- Extends Torneo schema with fechaInicio + puntosCampeon.
- New admin detail screen with "Elegir ganador" / "Terminar torneo" buttons.
- Two Cloud Functions (onGanadorSet, onTorneoCerrado) sending Expo push.
- Countdown component for "PRÓXIMAMENTE" tournaments.

## Test plan
- [ ] Create tournament with fechaInicio in future → see countdown.
- [ ] Flip to active, select winner → winner gets push + achievement.
- [ ] Terminate tournament → all participants get push + points.
EOF
)"
```

---

## Self-Review

- **Spec coverage:** Cubre sección 3 (winner flow) + 4 (Cloud Functions) + fechaInicio addendum.
- **Depende de Plan 1:** `elegirGanadorDeTorneo` debe existir en `lib/firestore.ts`.
- **No placeholders:** todos los pasos tienen código completo.
- **Compatibilidad:** `normalizeTorneo` defaults para torneos legacy.

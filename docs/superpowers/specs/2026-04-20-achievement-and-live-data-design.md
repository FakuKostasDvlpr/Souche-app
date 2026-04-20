# Achievement Component + Tournament Winner Flow + Live Data Wiring

**Fecha:** 2026-04-20
**Autor:** Facu (brainstorm con asistente)
**Estado:** Draft — pendiente aprobación usuario
**Scope:** Expo RN (souche-app) — rama `feature/admin-dashboard-v2`

## Contexto

La app Souche tiene varias secciones con datos hardcodeados (ticker de promos, burgers destacados, lista de torneos, champion card) y le falta un flujo real para que el superadmin elija al ganador de un torneo y lo anuncie. Se quiere sumar una animación de "logro desbloqueado" estilo Minecraft cuando alguien es proclamado campeón, que dispara en tiempo real en el dispositivo del ganador (foreground) y via push (background).

Este spec cubre tres áreas entrelazadas:

1. **Achievement component system** (animación Minecraft-style).
2. **Tournament scheduling + winner flow** (creación con fecha de inicio + countdown + detalle admin con "Elegir ganador" / "Terminar torneo").
3. **Live data wiring** (migrar home/menu hardcodeados a Firestore + placeholder universal de imágenes).

## No-goals

- Sistema general de achievements/gamification (milestones de puntos, badges, niveles). Este spec expone API reusable pero solo conecta el trigger `ganador`.
- Sistema de recordatorios ("avisame cuando abra inscripción"). Countdown solo es visual.
- Backfill scripts para torneos legacy. Backwards-compat se logra con defaults en `normalizeTorneo`.
- Sistema de tests extensivo. Este spec define solo unit tests para pure logic + manual QA checklist.
- Feature flags. El scope es todo refactor/extension compatible.

## Decisiones de diseño (resumen del brainstorm)

| Decisión | Valor | Razón |
|----------|-------|-------|
| Trigger de animación | Solo `ganador` de torneo | YAGNI; componente queda reusable para milestones futuros |
| Estilo animación | Híbrido dramático (full-screen takeover → colapsa a banner Minecraft) | Drama para evento único + "feel" Minecraft preservado |
| Flujo ganador — ubicación | `app/(user)/admin/crm-torneos.tsx` + nuevo `admin/torneo/[id].tsx` | Consolidar en CRM existente |
| Flujo ganador — separación | "Elegir ganador" y "Terminar torneo" = botones separados | Permite elegir ganador sin cerrar, o cerrar sin ganador |
| Picker de ganador | Solo entradas `activo` del torneo | Evita elegir a no-participantes |
| Placeholder burger | Gradient dark + ícono `fast-food` verde + label VT323 "SIN FOTO" | Simple y brandeado |
| Fuente del ticker | Nueva collection `anuncios` | Dedicada; admin ya empezó screen `admin/anuncios.tsx` |
| Sonido achievement | Solo `expo-haptics` | Sin nueva dep/asset |
| Scheduling torneos | `fechaInicio: Timestamp` + estado derivado `getTorneoEstado` | No requiere CF; puro derived state + countdown hook |
| DateTimePicker | `@react-native-community/datetimepicker` | Estándar Expo, soporte out-of-box |

## Arquitectura

```
┌─────────────────────────── CLIENTE (Expo RN) ───────────────────────────┐
│                                                                          │
│  ┌─────────────────────┐    ┌──────────────────────────────────────┐    │
│  │  Admin (crm-torneos)│    │  App usuario (home / menu / etc.)    │    │
│  │  ├─ Elegir ganador  │    │  ├─ AchievementProvider  (root)      │    │
│  │  ├─ Terminar torneo │    │  ├─ Listener users/{uid}             │    │
│  │  └─ DateTimePicker  │    │  └─ showAchievement(...) imperativo  │    │
│  └──────────┬──────────┘    └──────────┬───────────────────────────┘    │
│             │ writes                    │ onSnapshot                      │
└─────────────┼───────────────────────────┼─────────────────────────────────┘
              ▼                           │
     ┌────────────────────┐               │
     │  Firestore         │◀──────────────┘
     │  users, torneos,   │
     │  entradas, anuncios│
     └─────────┬──────────┘
               │ onUpdate triggers
               ▼
     ┌──────────────────────────────┐
     │  Cloud Functions             │
     │  ├─ onGanadorSet  → 1 push   │──► Expo Push ──► Winner device
     │  └─ onTorneoCerrado → N push │──► Expo Push ──► All participants
     └──────────────────────────────┘
```

**Capas nuevas / modificadas:**

- `contexts/AchievementContext.tsx` (nuevo) — Provider montado en root layout. Expone `showAchievement(payload)` imperativo + cola FIFO interna.
- `components/ui/achievement/AchievementOverlay.tsx` + subcomponentes — UI del overlay con FSM de 5 fases (Reanimated 4).
- `hooks/useGanadorListener.ts` — Suscribe a `users/{uid}`. Detecta transiciones `ganador` y `torneoGanado`. Idempotente via AsyncStorage.
- `app/(user)/admin/crm-torneos.tsx` (modificar) — DateTimePicker, nuevo chip `PRÓXIMAMENTE`, tap en card navega a detalle.
- `app/(user)/admin/torneo/[id].tsx` (nuevo) — Detalle con "Elegir ganador" / "Terminar torneo".
- `functions/src/notifications/onGanadorSet.ts` + `onTorneoCerrado.ts` (nuevos).
- `lib/firestore.ts` (extender) — `puntosCampeon`, `fechaInicio`, `getTorneoEstado`, `elegirGanadorDeTorneo`, `subscribeToUltimoCampeon`, CRUD `anuncios`.
- `hooks/useCountdown.ts` + `components/ui/TournamentCountdown.tsx` — Countdown adaptativo.
- `components/ui/BurgerImage.tsx` — Placeholder universal.
- Wiring en `home.tsx`, `menu.tsx`, `burger/[id].tsx`, `entradas/torneos.tsx` para consumir real data.

## Achievement component

### API

```typescript
type AchievementVariant = "champion" | "milestone" | "default";

interface AchievementPayload {
  title: string;
  subtitle?: string;
  icon?: ImageSourcePropType;
  variant?: AchievementVariant;
  ctaLabel?: string;
  onCta?: () => void;
}

const { showAchievement } = useAchievement();
showAchievement({
  title: "¡Campeón!",
  subtitle: "BBQ Classic Cup · +500 pts",
  variant: "champion",
});
```

### Máquina de estados del overlay

| t (ms)        | Fase                   | Visual                                                                                                                                                                                                                                 | Haptic           |
| ------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| 0 → 400       | Enter                  | Backdrop blur+fade in (BlurView intensity 0→40), glow radial verde, trofeo `cupwin.png` scale 0.3→1 con spring (damping 10), shimmer sweep diagonal                                                                                      | `Heavy` impact   |
| 400 → 2500    | Hold full-screen       | Trofeo con float+rotate ±3°, título "¡CAMPEÓN!" Space Grotesk 48px con type-in (~50ms/char), subtítulo fade+slide-up a t=1200ms, CTA "Ver detalle" fade in a t=1800ms, 24 partículas confetti (SVG rects verde/amber) con rotación random | `Success` t=400  |
| 2500 → 2900   | Collapse transition    | Backdrop fade out, trofeo translate+scale hacia posición banner (top-left, 32px), título morpha a compacto (18px), container reshape centered → top-pinned                                                                              | `Light` impact   |
| 2900 → 4900   | Banner hold            | Banner rounded 20px, glass panel `rgba(18,26,20,0.85)` + border `rgba(0,240,104,0.4)` + 4 pixel-brackets sutiles. Micro-header "LOGRO DESBLOQUEADO" en **VT323**. Título Space Grotesk, subtítulo Inter. Shimmer sweep a t=3200ms        | —                |
| 4900 → 5200   | Exit                   | Banner translateY -100 + opacity 0                                                                                                                                                                                                      | —                |

### Cola

Si `showAchievement` se invoca mientras uno está en curso → push a `queueRef.current`. Al terminar Exit, pop siguiente con 300ms pause.

### Accesibilidad

- `accessibilityRole="alert"` + `accessibilityLiveRegion="polite"`.
- `AccessibilityInfo.isReduceMotionEnabled()` → fade-in/out simple, sin confetti/shimmer.

### Interacciones

- Tap backdrop (full-screen): skip a Collapse.
- Tap banner: ejecuta `onCta` si existe.
- Full-screen: bloquea UI debajo. Banner: `pointerEvents="box-none"` en contenedor, `"auto"` solo en pill.

### Dedupe

`useGanadorListener` graba `lastSeenTorneoGanado:{torneoId}` en AsyncStorage. No re-dispara por el mismo torneo aunque la app se reabra.

## Tournament winner flow

### Schema changes (Torneo)

```typescript
export interface Torneo {
  id: string;
  nombre: string;
  fecha: string;
  fechaTimestamp: Timestamp | null;   // event date (existing)
  fechaInicio: Timestamp | null;      // NEW — activation / publication date
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
  puntosCampeon: number;              // NEW — default 500
  cerrado: boolean;
  creadoEn: Timestamp | null;
}
```

`normalizeTorneo` defaults: `fechaInicio: data.fechaInicio ?? null`, `puntosCampeon: data.puntosCampeon ?? 500`.

### Estado derivado

```typescript
export type TorneoEstado = "proximamente" | "activo" | "cerrado" | "inactivo";

export function getTorneoEstado(t: Torneo, now = new Date()): TorneoEstado {
  if (t.cerrado) return "cerrado";
  if (!t.activo) return "inactivo";
  if (t.fechaInicio && t.fechaInicio.toDate() > now) return "proximamente";
  return "activo";
}
```

### Countdown hook

```typescript
function useCountdown(target: Date | null): {
  d: number; h: number; m: number; s: number;
  expired: boolean;
  totalMs: number;
}
```

Cadencia adaptativa: 30s tick si >1h restante, 1s tick si <1h. Cuando `expired` flip: parent re-renderiza con nuevo `getTorneoEstado` → chip amber → verde sin pub/sub.

### CRM — pantalla de detalle `admin/torneo/[id].tsx`

Layout vertical:

- Header: back + menu edit.
- Nombre (BebasNeue 36), metadatos (fecha, lugar, precio), chip de estado.
- Stats row: `cuposOcupados/cuposMaximos`, `puntosParticipacion`, `puntosCampeon`.
- Descripción, reglas.
- Sección "Ganador":
  - Si `ganadorUid != null`: card con nombre + puntos + confirmación.
  - Si null: texto "Ningún ganador elegido aún".
- Sección "Participantes activos (N)": FlatList de entradas `activo`.
- Sticky bottom: dos botones.
  - "Elegir ganador 🏆" — primary (verde). Abre bottom sheet picker.
  - "Terminar torneo 🔒" — destructive (amber/rojo).

### Estados de los botones

| Condición                                            | Elegir ganador | Terminar torneo |
| ---------------------------------------------------- | -------------- | --------------- |
| `cerrado === true`                                   | disabled       | disabled        |
| `ganadorUid != null`                                 | disabled       | habilitado      |
| Sin participantes activos                            | disabled       | habilitado      |
| `estado === "proximamente"`                          | disabled       | disabled        |
| Default (activo, sin ganador, con participantes)     | habilitado     | habilitado      |

### Elegir ganador — modal

Bottom sheet con título "Elegir campeón de {nombre}", subtítulo "Recibirá +{puntosCampeon} pts y notificación", FlatList de participantes (radio selection), botones confirmar/cancelar.

Al confirmar → `elegirGanadorDeTorneo(torneoId, uid, nombre, puntosCampeon)`:

```typescript
export async function elegirGanadorDeTorneo(
  torneoId: string,
  ganadorUid: string,
  torneoNombre: string,
  puntosCampeon: number,
) {
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
    tipo: "ganador",
    fecha: serverTimestamp(),
  });
  await batch.commit();
}
```

### Terminar torneo

Reusa `cerrarTorneo(id, nombre, puntosParticipacion)` existente. Cloud Function `onTorneoCerrado` dispara push masivo.

### Form CRM — nuevo

Orden sugerido:

```
NOMBRE
FECHA DE PUBLICACIÓN  [DateTimePicker]
FECHA DEL EVENTO      [DateTimePicker]
LUGAR
PRECIO / PRECIO NUM
CUPOS MÁXIMOS
PUNTOS POR PARTICIPACIÓN
PUNTOS PARA EL CAMPEÓN
DESCRIPCIÓN
REGLAS
[Toggle: Publicado (activo)]
```

Validaciones:

- `fechaInicio <= fechaTimestamp`.
- `fechaInicio >= now` al crear (permitido al editar para legacy).
- Ambos opcionales; sin `fechaInicio` se comporta como "activo siempre".

El string `fecha` (display) se auto-genera desde `fechaTimestamp` con `Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Argentina/Buenos_Aires" })`.

### Protección superadmin

Asunción: `app/(user)/admin/_layout.tsx` ya hace gate por `profile.rol`. Si no, agregar:

```tsx
if (profile?.rol !== "admin") return <Redirect href="/(user)/home" />;
```

## Cloud Functions

### `onGanadorSet`

Trigger: `onDocumentUpdated("users/{uid}")`.

```typescript
const before = event.data.before.data();
const after = event.data.after.data();

const becameGanador = !before.ganador && after.ganador;
const torneoChanged =
  before.torneoGanado !== after.torneoGanado && after.torneoGanado;
if (!becameGanador && !torneoChanged) return;
if (!after.expoPushToken) return;

await sendExpoPush({
  to: after.expoPushToken,
  title: "¡Sos el CAMPEÓN! 🏆",
  body: `Ganaste ${after.torneoGanado}`,
  data: { type: "ganador", torneoNombre: after.torneoGanado },
  sound: "default",
  priority: "high",
});
```

Push es solo para despertar la app. La animación se dispara desde Firestore listener client-side (single source of truth).

### `onTorneoCerrado`

Trigger: `onDocumentUpdated("torneos/{torneoId}")`.

Lógica:

1. Guard: `before.cerrado === false && after.cerrado === true`.
2. Query `entradas where torneoId == torneoId and estado in ["activo", "usado"]`.
3. Collect unique `usuarioUid`.
4. Fetch tokens en chunks de 10 (Firestore `in` query limit).
5. Send push en chunks de 100 (Expo batch limit).

Body: `"El torneo {nombre} terminó. ¡Gracias por participar!"`, data `{ type: "torneoCerrado", torneoId, torneoNombre }`.

### Error handling

- Guards silenciosos para null (token missing, campo missing) — NO throw.
- `fetch`: verificar `response.ok`, parsear tickets.
- Tokens inválidos (`DeviceNotRegistered`): log + continue.
- Transient (5xx/network): throw → CF auto-reintenta hasta 3 veces.

### Archivos

```
functions/src/
  notifications/
    onGanadorSet.ts           # NEW
    onTorneoCerrado.ts        # NEW
    onEntradaReviewed.ts      # existente
  lib/
    expoPush.ts               # existe — extender con sendExpoPushBatch si falta
    chunkArray.ts             # NEW
  index.ts                    # agregar exports
```

## Live data wiring

### 5.1 `BurgerImage` universal

```tsx
interface BurgerImageProps {
  fotoUrl: string | null | undefined;
  style?: StyleProp<ViewStyle>;
  iconSize?: number;
  showLabel?: boolean;
}
```

Con `fotoUrl`: `<Image source={{ uri }} resizeMode="cover" />`.
Sin: fondo `#0F1410` + SoftGlow verde + `Ionicons name="fast-food" color="#00F068"` + label VT323 "SIN FOTO".

Callers: `home.tsx` (PopularBurgers), `menu.tsx` (FeaturedCard, BurgerCard), `burger/[id].tsx`.

### 5.2 Anuncios

Collection `anuncios`:

```typescript
export interface Anuncio {
  id: string;
  icon: string;          // Ionicons name
  texto: string;
  activo: boolean;
  orden: number;
  creadoEn: Timestamp | null;
}
```

Helpers: `subscribeToAnuncios`, `subscribeToAllAnuncios`, `createAnuncio`, `updateAnuncio`, `deleteAnuncio`.

`PromoTicker` en home consume `useAnunciosActivos()`. Empty → oculto.

`admin/anuncios.tsx` (ya untracked) expone CRUD.

### 5.3 Menu — home + menu.tsx

Home `PopularBurgers`: `useMenuItems({ disponible: true, limit: 4 })` — query `where(disponible==true).orderBy(creadoEn, desc).limit(4)`.

`menu.tsx`: `subscribeToMenuItems(true, setItems)` (ya existe). Categories via `getMenuCategorias()` (ya existe) + prepend "Todos". Featured = primer item.

Migrar todo `BURGER_IMAGES[b.id]` → `<BurgerImage fotoUrl={b.fotoUrl} />`. `lib/burgerImages.ts` deprecable.

### 5.4 ChampionCard

```typescript
export interface UltimoCampeon {
  torneo: Torneo;
  ganadorNombre: string;
  ganadorFotoUrl: string | null;
  puntosCampeon: number;
}

export function subscribeToUltimoCampeon(
  cb: (c: UltimoCampeon | null) => void
): Unsubscribe {
  // 1) onSnapshot torneos where ganadorUid != null, orderBy creadoEn desc, limit 1
  // 2) fetch user doc por ganadorUid (cache-friendly)
  // 3) emit UltimoCampeon | null
}
```

Render: card con data real o ocultar si null.

### 5.5 TournamentsList (home)

```tsx
const torneos = useTorneosVisibles();
// subscribe → filter cerrado==false → attach getTorneoEstado → limit 2-3
```

Por estado:

- `proximamente`: chip amber + `<TournamentCountdown size="sm" />`, CTA "Inicia pronto".
- `activo`: comportamiento actual (verde, progress bar, "Inscribirme →").

Si 0 visibles → ocultar sección.

### 5.6 StatsCards

`entradas`: `useEntradasActivasCount(uid)` — onSnapshot `where(usuarioUid==uid, estado in ["activo","pendiente"])`.

`trend`: eliminar por MVP.

### 5.7 CommunitySection

Hardcoded por ahora (social links). Follow-up: mover a `config/community`.

### 5.8 Hooks wrapper

```
hooks/
  useAnunciosActivos.ts
  useMenuItems.ts
  useMenuCategorias.ts
  useTorneosVisibles.ts
  useUltimoCampeon.ts
  useEntradasActivasCount.ts
  useCountdown.ts
```

Todos retornan `{ data, loading, error }`.

### 5.9 Loading states

- Ticker: oculto hasta data.
- StatsCards: NumberFlow 0 → real value.
- PopularBurgers / TournamentsList: 4 skeletons.
- ChampionCard: oculta hasta confirmar.

## Error handling (resumen)

| Capa | Estrategia |
|------|-----------|
| Subscriptions | Log + UI fallback (estado vacío). No crash |
| Writes | `try/catch` + `Alert.alert` + toast |
| Imagen remota | `<Image onError>` → placeholder via `BurgerImage` |
| `showAchievement` payload inválido | Log + return silencioso |
| AsyncStorage fail (lastSeen) | Asumir "no visto" |
| Expo Push permiso denegado | Warn log; listener Firestore cubre foreground |
| Cloud Functions — tokens inválidos | Log + continue |
| Cloud Functions — transient | Throw → CF auto-reintenta |

## Edge cases (resumen)

| Feature | Caso | Comportamiento |
|---------|------|----------------|
| Achievement | 2do torneo ganado | Dispara por `torneoGanado` change |
| Achievement | Offline cuando se elige ganador | Push cola Expo; listener dispara al abrir |
| Achievement | Re-install app | AsyncStorage perdido; re-dispara una vez |
| Achievement | Reduce motion | Fade in/out sin confetti |
| Winner | Re-elección (ya hay ganador) | Button disabled; evita undo puntos |
| Winner | 2 admins simultáneos | Last-write-wins; batch previene corrupción |
| Winner | Sin `expoPushToken` | CF skipea push; listener client cubre |
| Termination | Sin participantes | Silent return |
| Termination | Ya cerrado | Transition guard skipea |
| Scheduling | `fechaInicio === null` | Trata como activo (legacy) |
| Scheduling | Clock skew ±5min | Aceptable |
| Scheduling | Countdown 0 con app abierta | Re-render por `getTorneoEstado` |

## Testing

### Unit (pure logic)

```
tests/unit/
  getTorneoEstado.test.ts
  useCountdown.test.ts
  elegirGanadorDeTorneo.test.ts       # firestore-jest-mock
  achievementQueue.test.ts
```

Setup: `jest` + `jest-expo` preset.

### Cloud Functions (emulator)

- `firebase emulators:start --only firestore,functions`.
- Scripts `tests/cloud/trigger-ganador.ts` y `trigger-cerrar.ts`.
- Run manual pre-deploy. No CI.

### Manual QA checklist

**Ganador (E2E):**

- [ ] Admin crea torneo con `fechaInicio` futura, `puntosCampeon=500`.
- [ ] Feed usuario muestra "PRÓXIMAMENTE" con countdown.
- [ ] Al `fechaInicio` → transita a "ACTIVO". Usuario se inscribe.
- [ ] Admin abre detalle → "Elegir ganador" → selecciona → confirma.
- [ ] Ganador foreground: ve animación full-screen + banner Minecraft.
- [ ] Ganador background: recibe push "¡Sos el CAMPEÓN! 🏆". Tap → animación.
- [ ] Ganador ve +500 pts + historial entry.
- [ ] Cerrar/reabrir app: NO re-dispara animación.

**Terminar torneo:**

- [ ] Admin "Terminar torneo" → confirma.
- [ ] Torneo → "CERRADO" en todos los feeds.
- [ ] Participantes reciben push "El torneo X terminó".
- [ ] Cada participante: +`puntosParticipacion` en historial.

**Data wiring:**

- [ ] Sin anuncios: ticker oculto.
- [ ] Admin crea anuncio: aparece en ticker.
- [ ] Burger sin `fotoUrl`: placeholder OK.
- [ ] Menu vacío: empty state.
- [ ] Sin ganadores previos: ChampionCard oculta.

**Edge cases:**

- [ ] Reduce motion → animación degradada OK.
- [ ] Clock skew ±5min → countdown OK.
- [ ] Token expirado → CF log, no crash.

**Device matrix:** iOS 17+, Android 12+.

## Migración & rollout

- **Schema:** Firestore sin migración. Defaults en `normalizeTorneo`.
- **Rollout:** 3 PRs secuenciales.
  1. `feat/achievement-component` — Provider + overlay + listener + `elegirGanadorDeTorneo`. Sin wire-up.
  2. `feat/tournament-scheduling-and-winner-flow` — Schema Torneo, detalle admin, countdown, DateTimePicker, Cloud Functions.
  3. `feat/live-data-wiring` — BurgerImage, anuncios CRUD, migración home/menu/burger.
- **Post-deploy:** correr manual QA con torneo de prueba.

## Riesgos & mitigaciones

| Riesgo | Mitigación |
|--------|-----------|
| `onGanadorSet` se dispara por edits accidentales | Guard `before !== after` |
| Animación re-dispara al reabrir | `lastSeenTorneoGanado` AsyncStorage |
| Push spam en torneo de 1000 participantes | Chunks 100/request, <10s total |
| `puntosCampeon` default mismatch | Admin edita torneo antes de elegir |
| DateTimePicker Android UX | Testear ambos; fallback manual si rompe |
| Animación janky en low-end | Reduce motion fallback + `variant="low"` opcional |

## Archivos afectados (resumen)

```
# NEW
contexts/AchievementContext.tsx
components/ui/achievement/
  AchievementOverlay.tsx
  AchievementBanner.tsx
  AchievementParticles.tsx
  AchievementShimmer.tsx
components/ui/BurgerImage.tsx
components/ui/TournamentCountdown.tsx
hooks/
  useGanadorListener.ts
  useCountdown.ts
  useAnunciosActivos.ts
  useMenuItems.ts
  useMenuCategorias.ts
  useTorneosVisibles.ts
  useUltimoCampeon.ts
  useEntradasActivasCount.ts
app/(user)/admin/torneo/[id].tsx
app/(user)/admin/torneo/_components/ElegirGanadorSheet.tsx
functions/src/notifications/
  onGanadorSet.ts
  onTorneoCerrado.ts
functions/src/lib/chunkArray.ts
tests/unit/getTorneoEstado.test.ts
tests/unit/useCountdown.test.ts
tests/unit/elegirGanadorDeTorneo.test.ts
tests/unit/achievementQueue.test.ts

# MODIFY
app/_layout.tsx                        # montar AchievementProvider
app/(user)/home.tsx                    # migrar PROMO_ITEMS/BURGERS/TOURNAMENTS/ChampionCard/StatsCards
app/(user)/menu.tsx                    # migrar BURGERS/CATEGORIES, usar BurgerImage
app/(user)/burger/[id].tsx             # usar BurgerImage
app/(user)/entradas/torneos.tsx        # respetar estado proximamente/activo
app/(user)/admin/crm-torneos.tsx       # DateTimePicker + nuevo chip + tap card → detalle
app/(user)/admin/anuncios.tsx          # revisar CRUD contra shape Anuncio
lib/firestore.ts                       # +Anuncio, +fechaInicio, +puntosCampeon, +getTorneoEstado, +elegirGanadorDeTorneo, +subscribeToUltimoCampeon
functions/src/index.ts                 # exportar nuevas CF
package.json                           # +@react-native-community/datetimepicker

# DEPRECATE (borrar tras migración verificada)
lib/burgerImages.ts
```

## Criterios de aceptación

- [ ] Admin puede crear torneo con `fechaInicio` y `puntosCampeon`, ambos visibles en detalle.
- [ ] Torneo con `fechaInicio` futura muestra "PRÓXIMAMENTE" + countdown real en home, lista y detalle.
- [ ] Al llegar `fechaInicio`, transita visualmente a "ACTIVO" sin reload.
- [ ] Admin elige ganador via modal → ganador recibe push + ve animación full-screen → banner Minecraft en device.
- [ ] Ganador tiene `+puntosCampeon` en `puntos` y entry en `historialPuntos`.
- [ ] Admin termina torneo → todos los participantes reciben push + puntos de participación.
- [ ] Home PromoTicker alimentado por `anuncios` collection.
- [ ] Home PopularBurgers + MenuScreen alimentados por `menu` collection.
- [ ] Home ChampionCard alimentado por último torneo con ganador.
- [ ] Home StatsCards entradas count live.
- [ ] `BurgerImage` renderiza placeholder cuando `fotoUrl === null`.
- [ ] Reduce motion degrada animación correctamente.
- [ ] Animación no re-dispara al reabrir app (dedupe AsyncStorage).

# Master Checklist — Panorama completo 2026-04-20

> **Propósito:** Un único lugar para ver progreso de los 3 planes. Marcá cada tarea al terminarla. Cada tarea referencia el plan correspondiente para pasos detallados + código.

**Spec:** `docs/superpowers/specs/2026-04-20-achievement-and-live-data-design.md`

**Orden de ejecución:** Pre-Flight → Plan 1 → Plan 2 → Plan 3. Cada uno depende del anterior.

---

## 🚦 Pre-Flight — Validaciones Firebase + Context7 (2026-04-20)

> Bloqueadores encontrados al validar los 3 planes contra Firebase MCP + Context7. Resolver ANTES de T1.1.

- [x] **PF.1** — **Rules admin-write.** ✅ Deployed 2026-04-21. Rules actuales (`users/{userId}` match) permiten write solo al dueño. Rompe `setUserAsGanador`, `addPuntosToUser`, `cerrarTorneo` desde admin. Crear `firestore.rules` en repo root:
  ```
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      function isSuperadmin() {
        return request.auth != null &&
          get(/databases/$(database)/documents/users/$(request.auth.uid)).data.rol == "superadmin";
      }
      match /users/{userId} {
        allow read: if request.auth != null;
        allow write: if request.auth != null && (request.auth.uid == userId || isSuperadmin());
      }
      match /{document=**} {
        allow read, write: if request.auth != null;
      }
    }
  }
  ```
  Deploy: `npx firebase-tools deploy --only firestore:rules --project souche-9ff0b`.
- [x] **PF.2** — **firebase.json root.** ✅ Created 2026-04-21. Si no existe en repo root, crear:
  ```json
  {
    "firestore": { "rules": "firestore.rules", "indexes": "firestore.indexes.json" },
    "functions": [{ "source": "functions" }]
  }
  ```
- [x] **PF.3** — **firestore.indexes.json.** ✅ Created 2026-04-21. Crear archivo vacío `{ "indexes": [], "fieldOverrides": [] }`. (Plan 3 T5 fue reescrito para evitar índice compuesto; no hacen falta índices adicionales.)
- [x] **PF.4** — **Context7 check librerías.** ✅ Verified 2026-04-20. Confirmado (2026-04-20):
  - `@testing-library/react-native` v13.3+ tiene `renderHook` sync — reemplaza `@testing-library/react-hooks` (deprecado en React 19). Plan 2 T4 ya parcheado.
  - Reanimated 4.1.5: `useSharedValue`, `withSequence`, `withTiming`, `runOnJS` — API estable, compatible con Plan 1.
  - Firebase JS SDK v12: `where != null + orderBy` combinación requiere índice compuesto. Plan 3 T5 reescrito con `orderBy creadoEn desc + limit 20 + client filter`.

**Gate:** PF.1-3 deployed antes de T1.1. PF.4 verificado.

---

## 🎯 Plan 1 — Achievement Component System

**Archivo:** `docs/superpowers/plans/2026-04-20-plan-1-achievement-component.md`
**Meta:** Provider + overlay Minecraft + listener Firestore + `elegirGanadorDeTorneo`.

- [x] **T1.1** — Setup jest + jest-expo + ts-jest (config + smoke test). ✅
- [x] **T1.2** — `lib/achievementQueue.ts` — FIFO pure logic + 6 tests TDD. ✅
- [x] **T1.3** — `contexts/AchievementContext.tsx` — Provider + `useAchievement()`. ✅
- [x] **T1.4** — `components/ui/achievement/AchievementParticles.tsx` — 24 partículas Reanimated. ✅
- [x] **T1.5** — `components/ui/achievement/AchievementShimmer.tsx` — Sweep diagonal. ✅
- [x] **T1.6** — `components/ui/achievement/AchievementOverlay.tsx` — FSM 5 fases + haptics. ✅
- [x] **T1.7** — `hooks/useGanadorListener.ts` — onSnapshot users/{uid} + AsyncStorage dedupe. ✅
- [x] **T1.8** — Extender `lib/firestore.ts` — `elegirGanadorDeTorneo` con writeBatch. ✅
- [x] **T1.9** — Modificar `app/_layout.tsx` — Montar `AchievementProvider` + `useGanadorListener`. ✅
- [ ] **T1.10** — Manual QA + crear PR `feat/achievement-component`.

**Gate:** PR 1 mergeado antes de empezar Plan 2.

---

## 🏆 Plan 2 — Tournament Scheduling + Winner Flow + Cloud Functions

**Archivo:** `docs/superpowers/plans/2026-04-20-plan-2-tournament-scheduling-winner-flow.md`
**Meta:** `fechaInicio` + countdown + detalle admin + 2 Cloud Functions.

- [ ] **T2.1** — Instalar `@react-native-community/datetimepicker`.
- [ ] **T2.2** — Extender `Torneo` type con `fechaInicio` + `puntosCampeon` + defaults.
- [ ] **T2.3** — `getTorneoEstado` pure fn + 6 tests TDD.
- [ ] **T2.4** — `hooks/useCountdown.ts` + 6 tests TDD (cadencia adaptativa).
- [ ] **T2.5** — `components/ui/TournamentCountdown.tsx` amber pill.
- [ ] **T2.6** — Update form `admin/crm-torneos.tsx` con 2 DatePicker + `puntosCampeon` + validaciones.
- [ ] **T2.7** — Crear `app/(user)/admin/torneo/[id].tsx` scaffold con sticky actions.
- [ ] **T2.8** — `ElegirGanadorSheet.tsx` bottom sheet + integración en detalle.
- [ ] **T2.9** — Aplicar `getTorneoEstado` visuals en `entradas/torneos.tsx`.
- [ ] **T2.10** — Cloud Functions libs: `chunkArray.ts` + `expoPush.ts`.
- [ ] **T2.11** — `onGanadorSet` CF (1 push al ganador).
- [ ] **T2.12** — `onTorneoCerrado` CF (N pushes masivos en chunks).
- [ ] **T2.13** — Deploy CFs + smoke test en Firebase Console.
- [ ] **T2.14** — Manual QA E2E (ganador + terminar + countdown).
- [ ] **T2.15** — Crear PR `feat/tournament-scheduling-and-winner-flow`.

**Gate:** PR 2 mergeado antes de empezar Plan 3.

---

## 📡 Plan 3 — Live Data Wiring + BurgerImage

**Archivo:** `docs/superpowers/plans/2026-04-20-plan-3-live-data-wiring.md`
**Meta:** Home/menu/burger alimentados por Firestore + placeholder universal.

- [ ] **T3.1** — `components/ui/BurgerImage.tsx` — Placeholder VT323 "SIN FOTO".
- [ ] **T3.2** — `hooks/useNovedadesActivas.ts`.
- [ ] **T3.3** — `hooks/useMenuItems.ts` + `hooks/useMenuCategorias.ts`.
- [ ] **T3.4** — `hooks/useTorneosVisibles.ts` (filtra cerrado, attach estado).
- [ ] **T3.5** — `subscribeToUltimoCampeon` + `hooks/useUltimoCampeon.ts`.
- [ ] **T3.6** — `hooks/useEntradasActivasCount.ts`.
- [ ] **T3.7** — Migrar `home.tsx` PromoTicker → novedades.
- [ ] **T3.8** — Migrar `home.tsx` PopularBurgers → useMenuItems + BurgerImage.
- [ ] **T3.9** — Migrar `home.tsx` TournamentsList → useTorneosVisibles + Countdown.
- [ ] **T3.10** — Migrar `home.tsx` ChampionCard → useUltimoCampeon.
- [ ] **T3.11** — Migrar `home.tsx` StatsCards → useEntradasActivasCount, eliminar `trend`.
- [ ] **T3.12** — Migrar `menu.tsx` → useMenuItems + BurgerImage.
- [ ] **T3.13** — Migrar `burger/[id].tsx` → Firestore + BurgerImage.
- [ ] **T3.14** — Deprecar `lib/burgerImages.ts` (git rm).
- [ ] **T3.15** — Manual QA full (ticker, placeholder, countdown, champion, entradas).
- [ ] **T3.16** — Crear PR `feat/live-data-wiring`.

**Gate final:** QA aceptación con torneo real end-to-end.

---

## ✅ Criterios de aceptación finales (del spec)

- [ ] Admin crea torneo con `fechaInicio` y `puntosCampeon`, visibles en detalle.
- [ ] Torneo con `fechaInicio` futura → "PRÓXIMAMENTE" + countdown.
- [ ] Al llegar `fechaInicio` → "ACTIVO" sin reload.
- [ ] Admin elige ganador → push + animación full-screen + banner Minecraft.
- [ ] Ganador tiene +`puntosCampeon` en historial.
- [ ] Admin termina torneo → participantes reciben push + puntos participación.
- [ ] PromoTicker alimentado por `novedades`.
- [ ] PopularBurgers + MenuScreen alimentados por `menu`.
- [ ] ChampionCard alimentado por último torneo con ganador.
- [ ] StatsCards entradas count live.
- [ ] `BurgerImage` placeholder cuando `fotoUrl == null`.
- [ ] Reduce motion degrada animación.
- [ ] Animación no re-dispara al reabrir app (AsyncStorage dedupe).

---

## 🧭 Flujo de trabajo sugerido

1. Abrir este archivo (`MASTER-checklist.md`) al lado del plan activo.
2. Leer tarea del plan → aplicar código → marcar aquí como `[x]`.
3. Al terminar un plan entero → commit checklist update + crear PR.
4. Mergear PR antes de empezar siguiente plan.

**No empezar Plan N+1 hasta que Plan N esté mergeado** (schema migrations en PR 2 rompen Plan 3; Achievement provider en PR 1 necesario para Plan 2 flow).

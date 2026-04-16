# Admin Dashboard v2 — Design Spec
Date: 2026-04-15
Status: Approved

---

## 1. Scope

Full implementation of the admin panel for Souche App, covering:
- Firebase Storage integration (comprobantes + burger + anuncio photos)
- Expo Push Notifications via Cloud Functions (Firebase Blaze required)
- Comprobantes admin panel (approve/reject entradas)
- CRM Torneos (CRUD + participation points)
- CRM Burgers (CRUD + photo upload)
- Points screen (paginated user table + add/subtract + history)
- Anuncios screen (CRUD for novedades)
- Admin panel restructure in config.tsx

---

## 2. Architecture

### Stack decisions
- **Firebase Blaze**: required for Storage (mandatory since Feb 2026) and Cloud Functions
- **Expo Push Notifications**: client registers `expoPushToken`, stored in Firestore. Cloud Function sends push via `https://exp.host/--/api/v2/push/send`
- **No MQTT, no Supabase, no external broker**: single backend (Firebase)

### Push notification flow
```
App opens
  → Notifications.requestPermissionsAsync()
  → Notifications.getExpoPushTokenAsync()
  → updateDoc(users/{uid}, { expoPushToken: token })

Admin approves/rejects entrada
  → updateDoc(entradas/{id}, { estado: "activo" | "rechazada" })
  → Firestore trigger (Cloud Function: onDocumentUpdated)
      → reads users/{usuarioUid}.expoPushToken
      → POST https://exp.host/--/api/v2/push/send
          { to, title, body, data }
```

### Image upload flow (shared util: lib/storage.ts)
```
uploadComprobante(uid, entradaId, uri) → comprobantes/{uid}/{entradaId}.jpg  quality 0.7
uploadBurgerPhoto(menuItemId, uri)     → menu/{menuItemId}.jpg               quality 0.9
uploadAnuncioPhoto(novedadId, uri)     → novedades/{novedadId}.jpg           quality 0.9

Internal: fetch(uri) → blob → uploadBytesResumable → getDownloadURL → return url
```

### Firebase Storage rules
```
comprobantes/{uid}/**  → owner write, admin read
menu/**               → admin write, all read
novedades/**          → admin write, all read
```

---

## 3. Firestore Schema Changes

### Torneo (add fields)
```typescript
puntosParticipacion: number  // points awarded to all participants on torneo close. default: 0
cerrado: boolean             // prevents double point assignment. default: false
```

### UserProfile (add fields)
```typescript
expoPushToken: string | null  // Expo push token, updated on each login
loginMethod: "email" | "google" | "apple" | null  // captured at registration
ip: string | null  // captured at registration via ipapi.co or similar free API
```

---

## 4. Files

### Create
| File | Purpose |
|------|---------|
| `lib/storage.ts` | Shared image upload util (3 functions) |
| `functions/index.ts` | Cloud Function: onDocumentUpdated entradas → push notification |
| `app/(user)/admin/crm-torneos.tsx` | Torneo CRUD + close torneo + participation points |
| `app/(user)/admin/crm-burgers.tsx` | Burger menu CRUD + photo upload |
| `app/(user)/admin/points.tsx` | Paginated user table + add/subtract points + history |
| `app/(user)/admin/anuncios.tsx` | Novedades CRUD + optional photo |

### Modify
| File | Change |
|------|--------|
| `lib/firestore.ts` | Add `puntosParticipacion`, `cerrado` to Torneo; add `expoPushToken` to UserProfile-related queries |
| `store/useAuthStore.ts` | Add `expoPushToken`, `loginMethod`, `ip` to UserProfile type |
| `app/_layout.tsx` | Register Expo Push Token on auth state change |
| `app/(user)/_layout.tsx` | Register new screens; remove alta-entradas + ganadores |
| `app/(user)/config.tsx` | Restructure adminItems (6 entries) |
| `app/(user)/entradas/[id].tsx` | Wire uploadComprobante() in handleSubmit before createEntrada() |

### Delete
| File | Reason |
|------|--------|
| `app/(user)/admin/alta-entradas.tsx` | Replaced by crm-torneos.tsx |
| `app/(user)/admin/ganadores.tsx` | Replaced by points.tsx |

---

## 5. Admin Panel Structure (config.tsx)

### Before
```
Gestionar Eventos   → admin/alta-entradas   (stub)
CRM Usuarios        → admin/usuarios        (stub)
Ganadores           → admin/ganadores       (stub)
CRM Menu            → admin/crm-menu        (stub)
Anuncios            → admin/comprobantes    (BUG: wrong path)
```

### After
```
Comprobantes        → admin/comprobantes    (implement)
Torneos             → admin/crm-torneos     (new)
Burgers             → admin/crm-burgers     (new)
Usuarios            → admin/usuarios        (stub, future)
Points              → admin/points          (new)
Anuncios            → admin/anuncios        (new)
```

---

## 6. Screen Designs

### 6.1 Comprobantes (admin/comprobantes.tsx)
- Real-time list via `subscribeToPendingEntradas()` + `subscribeToAllEntradas()`
- Tab selector: PENDIENTES | ACTIVOS | RECHAZADOS
- Card per entrada: usuario name/email, torneo name/date, "Ver comprobante" button (full-screen expo-image modal), CHECK button (green), CLOSE button (red)
- CHECK → `confirmarEntrada(id, crypto.randomUUID())` → Cloud Function sends push "Entrada confirmada"
- CLOSE → bottom sheet with motivo input → `rechazarEntrada(id, motivo)` → Cloud Function sends push "Entrada rechazada"

### 6.2 CRM Torneos (admin/crm-torneos.tsx)
- FlashList of all torneos (active + inactive)
- Card: nombre, fecha, lugar, cupos X/Y, badge ACTIVO/INACTIVO
- Actions: Editar, Toggle activo, Eliminar, "Cerrar torneo" (when cuposOcupados > 0 && !cerrado)
- Bottom sheet form fields: nombre, fecha, lugar, precio display, precio num, cupos maximos, descripcion, reglas
- Admin-only field (superadmin only, never shown to users): `puntosParticipacion` (number input)
- "Cerrar torneo" flow: Alert confirm → batch addPuntosToUser for all activo entradas → updateTorneo({ cerrado: true, activo: false }) → Toast with count

### 6.3 CRM Burgers (admin/crm-burgers.tsx)
- FlashList of menu items
- Card: expo-image 80x80, titulo, categoria, precio, badge, disponible toggle
- Bottom sheet form: foto (ImagePicker → uploadBurgerPhoto quality 0.9), titulo, descripcion, precio display + num, categoria (picker + custom text), badge, disponible switch
- Upload: pick image → local preview → on submit uploadBurgerPhoto → createMenuItem or updateMenuItem

### 6.4 Points (admin/points.tsx)
- Header search input (filter by nombre or email, client-side)
- FlashList with paginated load (20 per batch via subscribeToUsers)
- Table columns: nombre+apellido, email, puntos, entradas count, metodo login, fecha registro
- Tap row → inline expanded panel:
  - User details: email, login method, IP (if stored), registration date, ganador status
  - Points adjustment: [-] [number input] [+] + motivo input + confirm button
  - Historial: last 50 entries from `historialPuntos` subcollection (tipo, puntos, motivo, fecha)
- Positive value → `addPuntosToUser(uid, n, motivo, "manual")`
- Negative value → `addPuntosToUser(uid, -n, motivo, "manual")` (uses increment(-n))

### 6.5 Anuncios (admin/anuncios.tsx)
- FlashList of novedades
- Card: thumbnail foto (if exists), titulo, contenido preview, badge ACTIVO/INACTIVO
- Actions: Editar, Toggle activo, Eliminar
- Bottom sheet form: foto optional (uploadAnuncioPhoto quality 0.9), titulo, contenido (multiline), activo switch
- Bug fix: config.tsx adminItems "Anuncios" path was pointing to comprobantes — corrected to admin/anuncios

---

## 7. Cloud Function (functions/index.ts)

```typescript
export const onEntradaUpdate = onDocumentUpdated("entradas/{entradaId}", async (event) => {
  const before = event.data?.before.data()
  const after = event.data?.after.data()
  if (!before || !after) return
  if (before.estado === after.estado) return  // no change

  const uid = after.usuarioUid
  const userSnap = await db.collection("users").doc(uid).get()
  const token = userSnap.data()?.expoPushToken
  if (!token) return

  let title = ""
  let body = ""

  if (after.estado === "activo") {
    title = "Entrada confirmada!"
    body = `Tu entrada para ${after.torneoNombre} fue aprobada.`
  } else if (after.estado === "rechazada") {
    title = "Entrada rechazada"
    body = `Tu comprobante de ${after.torneoNombre} fue rechazado.`
  } else {
    return
  }

  await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ to: token, title, body, data: { entradaId: event.params.entradaId } })
  })
})
```

Deploy: `firebase deploy --only functions`

---

## 8. React Native / Expo Best Practices Applied

- **FlashList** (not FlatList) for all lists — critical for performance with large user/entrada sets
- **expo-image** for all image display — lazy load, cache, zoom gesture support
- **expo-image-picker** quality 0.7 (comprobantes) / 0.9 (burgers, anuncios)
- **uploadBytesResumable** with progress indicator for uploads > 300ms
- **Skeleton screens** while data loads (not spinners)
- **Bottom sheets** for forms (not full-screen navigations) — keeps context
- **Inline expanded rows** in Points table — avoids navigation for quick edits
- Touch targets min 44pt on all action buttons
- `crypto.randomUUID()` for QR tokens (Node 18+ compatible)

---

## 9. Manual Steps (Firebase Console)

1. Upgrade project `souche-9ff0b` to Blaze plan (credit card required, free up to 5GB storage)
2. Set Storage security rules (comprobantes / menu / novedades)
3. `firebase init functions` → select TypeScript
4. `firebase deploy --only functions`

---

## 10. Out of Scope (future sprints)

- Full FCM token refresh on token rotation
- IP address capture (requires auth metadata or Cloud Function on user creation)
- Usuarios screen full implementation (currently stub)
- Offline support
- Analytics dashboard

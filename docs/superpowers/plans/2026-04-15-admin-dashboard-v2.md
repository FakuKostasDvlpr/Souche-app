# Admin Dashboard v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the full admin dashboard including Firebase Storage, Expo Push Notifications via Cloud Functions, Comprobantes panel, CRM Torneos/Burgers, Points screen, and Anuncios CRUD.

**Architecture:** Firebase Blaze with direct client-side Storage uploads; Cloud Functions trigger on Firestore entrada updates to send Expo Push Notifications; all admin screens are flat Expo Router file-based routes under `app/(user)/admin/`.

**Tech Stack:** Expo SDK 52, React Native, Firebase JS SDK v12, firebase-admin (Cloud Functions), expo-notifications, expo-image-picker, @shopify/flash-list, expo-image

**Spec:** `docs/superpowers/specs/2026-04-15-admin-dashboard-v2-design.md`

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `lib/storage.ts` | uploadComprobante, uploadBurgerPhoto, uploadAnuncioPhoto |
| Create | `functions/index.ts` | Cloud Function: onEntradaUpdate → Expo Push |
| Create | `functions/package.json` | firebase-functions, firebase-admin deps |
| Create | `functions/tsconfig.json` | TypeScript config for functions |
| Create | `app/(user)/admin/crm-torneos.tsx` | Torneo CRUD + close + participation points |
| Create | `app/(user)/admin/crm-burgers.tsx` | Burger menu CRUD + photo upload |
| Create | `app/(user)/admin/points.tsx` | User table + add/subtract points + history |
| Create | `app/(user)/admin/anuncios.tsx` | Novedades CRUD + photo upload |
| Modify | `store/useAuthStore.ts` | Add expoPushToken, loginMethod, ip to UserProfile |
| Modify | `lib/firestore.ts` | Add puntosParticipacion, cerrado to Torneo; add expoPushToken, loginMethod, ip helpers |
| Modify | `app/_layout.tsx` | Register Expo Push Token on auth |
| Modify | `app/(auth)/register.tsx` | Capture loginMethod + ip on registration |
| Modify | `app/(user)/_layout.tsx` | Register new screens, remove deleted ones |
| Modify | `app/(user)/config.tsx` | Restructure adminItems |
| Modify | `app/(user)/entradas/[id].tsx` | Wire uploadComprobante in handleSubmit |
| Delete | `app/(user)/admin/alta-entradas.tsx` | Replaced by crm-torneos |
| Delete | `app/(user)/admin/ganadores.tsx` | Replaced by points |

---

## Task 1: Schema + Types

**Files:**
- Modify: `store/useAuthStore.ts`
- Modify: `lib/firestore.ts`

- [ ] **Step 1: Update UserProfile type in useAuthStore.ts**

Open `store/useAuthStore.ts` and add three fields to `UserProfile`:

```typescript
export interface UserProfile {
  uid: string;
  nombre: string;
  apellido: string;
  email: string;
  foto: string | null;
  genero: "hombre" | "mujer" | "no_especificado";
  rol: UserRole;
  puntos: number;
  ganador: boolean;
  torneoGanado: string | null;
  emailVerified: boolean;
  fcmToken: string | null;
  expoPushToken: string | null;      // NEW
  loginMethod: "email" | "google" | "apple" | null;  // NEW
  ip: string | null;                 // NEW
  creadoEn: Date | null;
}
```

- [ ] **Step 2: Update Torneo type in lib/firestore.ts**

Add two fields to the `Torneo` interface:

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
  puntosParticipacion: number;   // NEW — default 0
  cerrado: boolean;              // NEW — default false
  creadoEn: Timestamp | null;
}
```

- [ ] **Step 3: Update createTorneo signature in lib/firestore.ts**

```typescript
export async function createTorneo(
  data: Omit<Torneo, "id" | "creadoEn" | "cuposOcupados" | "ganadorUid" | "cerrado">
): Promise<string> {
  const ref = await addDoc(collection(db, "torneos"), {
    ...data,
    cuposOcupados: 0,
    ganadorUid: null,
    cerrado: false,
    creadoEn: serverTimestamp(),
  });
  return ref.id;
}
```

- [ ] **Step 4: Add updateExpoPushToken helper to lib/firestore.ts**

```typescript
export async function updateExpoPushToken(uid: string, token: string) {
  await updateDoc(doc(db, "users", uid), { expoPushToken: token });
}
```

- [ ] **Step 5: Add cerrarTorneo helper to lib/firestore.ts**

```typescript
/** Assign participation points to all active entradas of a torneo and close it */
export async function cerrarTorneo(
  torneoId: string,
  torneoNombre: string,
  puntosParticipacion: number
): Promise<number> {
  const snap = await getDocs(
    query(
      collection(db, "entradas"),
      where("torneoId", "==", torneoId),
      where("estado", "==", "activo")
    )
  );
  let count = 0;
  for (const d of snap.docs) {
    const entrada = d.data();
    await addPuntosToUser(
      entrada.usuarioUid,
      puntosParticipacion,
      `Participó en ${torneoNombre}`,
      "torneo"
    );
    count++;
  }
  await updateDoc(doc(db, "torneos", torneoId), {
    cerrado: true,
    activo: false,
  });
  return count;
}
```

- [ ] **Step 6: Commit**

```bash
git add store/useAuthStore.ts lib/firestore.ts
git commit -m "feat: extend schema — Torneo participation points, UserProfile push/login/ip fields"
```

---

## Task 2: Firebase Storage Utility

**Files:**
- Create: `lib/storage.ts`

- [ ] **Step 1: Create lib/storage.ts**

```typescript
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";
import { storage } from "@/lib/firebase";

async function uploadImage(
  path: string,
  uri: string,
  quality: number
): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();
  const storageRef = ref(storage, path);
  await new Promise<void>((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, blob);
    task.on("state_changed", undefined, reject, resolve);
  });
  return getDownloadURL(storageRef);
}

export async function uploadComprobante(
  uid: string,
  entradaId: string,
  uri: string
): Promise<string> {
  return uploadImage(`comprobantes/${uid}/${entradaId}.jpg`, uri, 0.7);
}

export async function uploadBurgerPhoto(
  menuItemId: string,
  uri: string
): Promise<string> {
  return uploadImage(`menu/${menuItemId}.jpg`, uri, 0.9);
}

export async function uploadAnuncioPhoto(
  novedadId: string,
  uri: string
): Promise<string> {
  return uploadImage(`novedades/${novedadId}.jpg`, uri, 0.9);
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/storage.ts
git commit -m "feat: add Firebase Storage upload utility (comprobante/burger/anuncio)"
```

---

## Task 3: Expo Push Token Setup

**Files:**
- Modify: `app/_layout.tsx`

- [ ] **Step 1: Install expo-notifications if not present**

```bash
npx expo install expo-notifications
```

- [ ] **Step 2: Read current app/_layout.tsx**

Open `app/_layout.tsx` and find where Firebase auth state listener is set up (look for `onAuthStateChanged`).

- [ ] **Step 3: Add push token registration after login**

After the existing auth listener resolves a logged-in user and sets the profile, add:

```typescript
import * as Notifications from "expo-notifications";
import { updateExpoPushToken } from "@/lib/firestore";

// Inside the auth state resolved block, after setProfile:
async function registerPushToken(uid: string) {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== "granted") return;
  const token = await Notifications.getExpoPushTokenAsync();
  if (token?.data) {
    await updateExpoPushToken(uid, token.data);
  }
}

// Call it:
registerPushToken(user.uid);
```

- [ ] **Step 4: Commit**

```bash
git add app/_layout.tsx
git commit -m "feat: register Expo Push Token on login and persist to Firestore"
```

---

## Task 4: Cloud Function — Push Notifications

**Files:**
- Create: `functions/package.json`
- Create: `functions/tsconfig.json`
- Create: `functions/index.ts`

> **Note:** Requires Firebase Blaze plan and `firebase-tools` installed globally.
> Run `npm install -g firebase-tools` then `firebase login` if not done.

- [ ] **Step 1: Initialize Firebase Functions**

```bash
firebase init functions
# Select: TypeScript, No ESLint, No install dependencies yet
```

This creates `functions/` folder with `package.json`, `tsconfig.json`, `src/index.ts`.

- [ ] **Step 2: Install dependencies**

```bash
cd functions && npm install && cd ..
```

- [ ] **Step 3: Write functions/src/index.ts**

```typescript
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

export const onEntradaUpdate = onDocumentUpdated(
  "entradas/{entradaId}",
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;
    if (before.estado === after.estado) return;

    const estadoAfter = after.estado as string;
    if (estadoAfter !== "activo" && estadoAfter !== "rechazada") return;

    const uid: string = after.usuarioUid;
    const torneoNombre: string = after.torneoNombre;

    const userSnap = await db.collection("users").doc(uid).get();
    const token: string | undefined = userSnap.data()?.expoPushToken;
    if (!token) return;

    const title =
      estadoAfter === "activo" ? "Entrada confirmada!" : "Entrada rechazada";
    const body =
      estadoAfter === "activo"
        ? `Tu entrada para ${torneoNombre} fue aprobada.`
        : `Tu comprobante de ${torneoNombre} fue rechazado.`;

    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: token,
        title,
        body,
        data: { entradaId: event.params.entradaId },
      }),
    });
  }
);
```

- [ ] **Step 4: Deploy function**

```bash
firebase deploy --only functions
```

Expected output: `✔ functions[onEntradaUpdate]: Successful create operation.`

- [ ] **Step 5: Commit**

```bash
git add functions/
git commit -m "feat: Cloud Function — push notification on entrada approve/reject"
```

---

## Task 5: Wire Comprobante Upload in entradas/[id].tsx

**Files:**
- Modify: `app/(user)/entradas/[id].tsx`

- [ ] **Step 1: Read current handleSubmit in entradas/[id].tsx**

Open `app/(user)/entradas/[id].tsx` lines 72–90. Note that `handleSubmit` stores `comprobanteUri` locally and calls `addEntrada` with mock data. This must be replaced with real Firestore + Storage.

- [ ] **Step 2: Replace handleSubmit**

Replace the `handleSubmit` function:

```typescript
import { uploadComprobante } from "@/lib/storage";
import { createEntrada, incrementCuposOcupados } from "@/lib/firestore";
import { useAuthStore } from "@/store/useAuthStore";
import { nanoid } from "nanoid/non-secure";

// Inside component:
const profile = useAuthStore((s) => s.profile);

const handleSubmit = async () => {
  if (!comprobanteUri) {
    Alert.alert("Comprobante requerido", "Subi el comprobante de transferencia para continuar.");
    return;
  }
  if (!profile) return;
  setLoading(true);
  setStep("processing");
  try {
    const entradaId = nanoid(10);
    const fotoUrl = await uploadComprobante(profile.uid, entradaId, comprobanteUri);
    await createEntrada({
      usuarioUid: profile.uid,
      usuarioNombre: `${profile.nombre} ${profile.apellido}`,
      usuarioEmail: profile.email,
      torneoId: torneo.id,
      torneoNombre: torneo.nombre,
      fecha: torneo.fecha,
      lugar: torneo.lugar,
      estado: "pendiente",
      comprobanteFotoUrl: fotoUrl,
    });
    await incrementCuposOcupados(torneo.id);
  } catch (e) {
    Alert.alert("Error", "No se pudo enviar el comprobante. Intentá de nuevo.");
    setStep("comprobante");
  } finally {
    setLoading(false);
  }
};
```

> Note: `nanoid` must be installed: `npx expo install nanoid`

- [ ] **Step 3: Install nanoid**

```bash
npx expo install nanoid
```

- [ ] **Step 4: Commit**

```bash
git add app/(user)/entradas/[id].tsx
git commit -m "feat: wire Firebase Storage upload for comprobante in entrada flow"
```

---

## Task 6: Admin Panel Restructure

**Files:**
- Modify: `app/(user)/config.tsx`
- Modify: `app/(user)/_layout.tsx`
- Delete: `app/(user)/admin/alta-entradas.tsx`
- Delete: `app/(user)/admin/ganadores.tsx`

- [ ] **Step 1: Update adminItems in config.tsx**

Replace the `adminItems` array in `app/(user)/config.tsx`:

```typescript
const adminItems = [
  { icon: "receipt-outline" as const,    label: "Comprobantes", path: "/(user)/admin/comprobantes" },
  { icon: "trophy-outline" as const,     label: "Torneos",      path: "/(user)/admin/crm-torneos" },
  { icon: "fast-food-outline" as const,  label: "Burgers",      path: "/(user)/admin/crm-burgers" },
  { icon: "people-outline" as const,     label: "Usuarios",     path: "/(user)/admin/usuarios" },
  { icon: "star-outline" as const,       label: "Points",       path: "/(user)/admin/points" },
  { icon: "megaphone-outline" as const,  label: "Anuncios",     path: "/(user)/admin/anuncios" },
];
```

- [ ] **Step 2: Update _layout.tsx — remove old screens, add new ones**

Replace the admin screen registrations in `app/(user)/_layout.tsx`:

```typescript
{/* Remove these: */}
{/* <Tabs.Screen name="admin/alta-entradas" ... /> */}
{/* <Tabs.Screen name="admin/ganadores" ... /> */}
{/* <Tabs.Screen name="admin/crm-menu" ... /> */}

{/* Add/keep these: */}
<Tabs.Screen name="admin/comprobantes"  options={{ href: null, ...HEADER, title: "Comprobantes" }} />
<Tabs.Screen name="admin/crm-torneos"   options={{ href: null, ...HEADER, title: "Torneos" }} />
<Tabs.Screen name="admin/crm-burgers"   options={{ href: null, ...HEADER, title: "Burgers" }} />
<Tabs.Screen name="admin/usuarios"      options={{ href: null, ...HEADER, title: "Usuarios" }} />
<Tabs.Screen name="admin/points"        options={{ href: null, ...HEADER, title: "Points" }} />
<Tabs.Screen name="admin/anuncios"      options={{ href: null, ...HEADER, title: "Anuncios" }} />
```

- [ ] **Step 3: Delete obsolete screens**

```bash
rm app/\(user\)/admin/alta-entradas.tsx
rm app/\(user\)/admin/ganadores.tsx
```

- [ ] **Step 4: Commit**

```bash
git add app/(user)/config.tsx app/(user)/_layout.tsx
git rm "app/(user)/admin/alta-entradas.tsx" "app/(user)/admin/ganadores.tsx"
git commit -m "feat: restructure admin panel — 6 entries, remove old stubs"
```

---

## Task 7: Comprobantes Panel

**Files:**
- Modify: `app/(user)/admin/comprobantes.tsx`

- [ ] **Step 1: Implement comprobantes.tsx**

Replace the stub with full implementation:

```typescript
import { useState, useEffect } from "react";
import {
  View, Text, Pressable, Modal, Alert, ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { FlashList } from "@shopify/flash-list";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useThemeColors } from "@/lib/theme";
import {
  subscribeToAllEntradas,
  confirmarEntrada,
  rechazarEntrada,
  type Entrada,
  type EntradaEstado,
} from "@/lib/firestore";

type Tab = "pendiente" | "activo" | "rechazada";

export default function ComprobantesScreen() {
  const c = useThemeColors();
  const [entradas, setEntradas] = useState<Entrada[]>([]);
  const [tab, setTab] = useState<Tab>("pendiente");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [motivoEntradaId, setMotivoEntradaId] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => subscribeToAllEntradas(setEntradas), []);

  const filtered = entradas.filter((e) => e.estado === tab);
  const pendingCount = entradas.filter((e) => e.estado === "pendiente").length;

  const handleConfirmar = async (id: string) => {
    setLoading(id);
    try {
      await confirmarEntrada(id, crypto.randomUUID());
    } finally {
      setLoading(null);
    }
  };

  const handleRechazar = async () => {
    if (!motivoEntradaId || !motivo.trim()) return;
    setLoading(motivoEntradaId);
    try {
      await rechazarEntrada(motivoEntradaId, motivo.trim());
      setMotivoEntradaId(null);
      setMotivo("");
    } finally {
      setLoading(null);
    }
  };

  const TABS: { key: Tab; label: string }[] = [
    { key: "pendiente", label: `PENDIENTES${pendingCount > 0 ? ` (${pendingCount})` : ""}` },
    { key: "activo",    label: "ACTIVOS" },
    { key: "rechazada", label: "RECHAZADOS" },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={["bottom"]}>
      {/* Tab bar */}
      <View style={{ flexDirection: "row", paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}>
        {TABS.map((t) => (
          <Pressable
            key={t.key}
            onPress={() => setTab(t.key)}
            style={{
              flex: 1, paddingVertical: 8, borderRadius: 12, alignItems: "center",
              backgroundColor: tab === t.key ? c.lime : c.surface,
              borderWidth: 1, borderColor: tab === t.key ? c.lime : c.border,
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: "700", color: tab === t.key ? "#020805" : c.fgMuted, letterSpacing: 0.5 }}>
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlashList
        data={filtered}
        estimatedItemSize={160}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <View style={{ alignItems: "center", paddingTop: 60 }}>
            <Text style={{ color: c.fgMuted, fontSize: 14 }}>Sin entradas en esta sección</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={{ backgroundColor: c.surface, borderRadius: 20, borderWidth: 1, borderColor: c.border, padding: 16, marginBottom: 12 }}>
            <Text style={{ color: c.fg, fontWeight: "700", fontSize: 15 }}>{item.usuarioNombre}</Text>
            <Text style={{ color: c.fgMuted, fontSize: 13, marginTop: 2 }}>{item.usuarioEmail}</Text>
            <Text style={{ color: c.fgMuted, fontSize: 12, marginTop: 6 }}>{item.torneoNombre} · {item.fecha}</Text>

            {item.comprobanteFotoUrl && (
              <Pressable onPress={() => setPhotoUrl(item.comprobanteFotoUrl)} style={{ marginTop: 12 }}>
                <Image
                  source={{ uri: item.comprobanteFotoUrl }}
                  style={{ width: "100%", height: 140, borderRadius: 12 }}
                  contentFit="cover"
                />
                <Text style={{ color: c.lime, fontSize: 12, marginTop: 4, fontWeight: "600" }}>Ver comprobante completo</Text>
              </Pressable>
            )}

            {item.estado === "pendiente" && (
              <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
                <Pressable
                  onPress={() => handleConfirmar(item.id)}
                  disabled={loading === item.id}
                  style={{ flex: 1, backgroundColor: "#22c55e", borderRadius: 12, paddingVertical: 12, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6 }}
                >
                  {loading === item.id
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <><Ionicons name="checkmark" size={18} color="#fff" /><Text style={{ color: "#fff", fontWeight: "700" }}>Aprobar</Text></>
                  }
                </Pressable>
                <Pressable
                  onPress={() => setMotivoEntradaId(item.id)}
                  disabled={loading === item.id}
                  style={{ flex: 1, backgroundColor: "#ef4444", borderRadius: 12, paddingVertical: 12, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6 }}
                >
                  <Ionicons name="close" size={18} color="#fff" />
                  <Text style={{ color: "#fff", fontWeight: "700" }}>Rechazar</Text>
                </Pressable>
              </View>
            )}

            {item.motivoRechazo && (
              <Text style={{ color: "#ef4444", fontSize: 12, marginTop: 8 }}>Motivo: {item.motivoRechazo}</Text>
            )}
          </View>
        )}
      />

      {/* Full-screen photo modal */}
      <Modal visible={!!photoUrl} transparent animationType="fade" onRequestClose={() => setPhotoUrl(null)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.92)", justifyContent: "center", alignItems: "center" }} onPress={() => setPhotoUrl(null)}>
          {photoUrl && (
            <Image source={{ uri: photoUrl }} style={{ width: "92%", height: "70%" }} contentFit="contain" />
          )}
          <Text style={{ color: "#fff", marginTop: 16, opacity: 0.6 }}>Toca para cerrar</Text>
        </Pressable>
      </Modal>

      {/* Rechazo motivo modal */}
      <Modal visible={!!motivoEntradaId} transparent animationType="slide" onRequestClose={() => setMotivoEntradaId(null)}>
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" }}>
          <View style={{ backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 }}>
            <Text style={{ color: c.fg, fontWeight: "700", fontSize: 17, marginBottom: 16 }}>Motivo de rechazo</Text>
            <View style={{ backgroundColor: c.bg, borderRadius: 12, borderWidth: 1, borderColor: c.border, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16 }}>
              <Text
                // TextInput replacement — use RN TextInput
                style={{ color: c.fg, fontSize: 15 }}
              >
                {/* Replace with: */}
              </Text>
            </View>
            {/* Note: use React Native TextInput for motivo input:
              <TextInput
                value={motivo}
                onChangeText={setMotivo}
                placeholder="Ej: El comprobante no coincide..."
                placeholderTextColor={c.fgMuted}
                style={{ color: c.fg, fontSize: 15 }}
                multiline
              />
            */}
            <Pressable onPress={handleRechazar} style={{ backgroundColor: "#ef4444", borderRadius: 14, paddingVertical: 14, alignItems: "center" }}>
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>Confirmar rechazo</Text>
            </Pressable>
            <Pressable onPress={() => { setMotivoEntradaId(null); setMotivo(""); }} style={{ marginTop: 10, alignItems: "center" }}>
              <Text style={{ color: c.fgMuted }}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
```

> Note: Replace the placeholder comment block with an actual `TextInput` for the motivo field. Import `TextInput` from `react-native`.

- [ ] **Step 2: Fix TextInput in motivo modal**

In the motivo modal section, replace the placeholder comment with:

```typescript
import { TextInput } from "react-native";

// In motivo modal:
<TextInput
  value={motivo}
  onChangeText={setMotivo}
  placeholder="Ej: El comprobante no coincide con el monto del torneo..."
  placeholderTextColor={c.fgMuted}
  style={{ color: c.fg, fontSize: 15, minHeight: 60 }}
  multiline
/>
```

- [ ] **Step 3: Commit**

```bash
git add "app/(user)/admin/comprobantes.tsx"
git commit -m "feat: implement Comprobantes admin panel with approve/reject flow"
```

---

## Task 8: CRM Torneos

**Files:**
- Create: `app/(user)/admin/crm-torneos.tsx`

- [ ] **Step 1: Create crm-torneos.tsx**

```typescript
import { useState, useEffect } from "react";
import {
  View, Text, Pressable, ScrollView, TextInput, Switch, Alert, ActivityIndicator, Modal,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useThemeColors } from "@/lib/theme";
import { useAuthStore } from "@/store/useAuthStore";
import {
  subscribeToTorneos,
  createTorneo,
  updateTorneo,
  cerrarTorneo,
  type Torneo,
} from "@/lib/firestore";

const EMPTY_FORM = {
  nombre: "",
  fecha: "",
  lugar: "",
  precio: "",
  precioNum: "",
  cuposMaximos: "",
  descripcion: "",
  reglas: "",
  puntosParticipacion: "0",
  activo: true,
};

export default function CrmTorneosScreen() {
  const c = useThemeColors();
  const profile = useAuthStore((s) => s.profile);
  const isSuperAdmin = profile?.rol === "superadmin";
  const [torneos, setTorneos] = useState<Torneo[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [closingId, setClosingId] = useState<string | null>(null);

  useEffect(() => subscribeToTorneos(false, setTorneos), []);

  const openCreate = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (t: Torneo) => {
    setEditId(t.id);
    setForm({
      nombre: t.nombre,
      fecha: t.fecha,
      lugar: t.lugar,
      precio: t.precio,
      precioNum: String(t.precioNum),
      cuposMaximos: String(t.cuposMaximos),
      descripcion: t.descripcion,
      reglas: t.reglas,
      puntosParticipacion: String(t.puntosParticipacion ?? 0),
      activo: t.activo,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.nombre || !form.fecha || !form.lugar || !form.precio || !form.precioNum || !form.cuposMaximos) {
      Alert.alert("Campos requeridos", "Completá todos los campos obligatorios.");
      return;
    }
    setSaving(true);
    try {
      const data = {
        nombre: form.nombre.trim(),
        fecha: form.fecha.trim(),
        fechaTimestamp: null,
        lugar: form.lugar.trim(),
        precio: form.precio.trim(),
        precioNum: Number(form.precioNum),
        cuposMaximos: Number(form.cuposMaximos),
        descripcion: form.descripcion.trim(),
        reglas: form.reglas.trim(),
        activo: form.activo,
        puntosParticipacion: isSuperAdmin ? Number(form.puntosParticipacion) : 0,
      };
      if (editId) {
        await updateTorneo(editId, data);
      } else {
        await createTorneo(data);
      }
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCerrar = (torneo: Torneo) => {
    Alert.alert(
      "Cerrar torneo",
      `Asignar ${torneo.puntosParticipacion} pts a cada participante activo. Esta acción no se puede deshacer.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Cerrar torneo",
          style: "destructive",
          onPress: async () => {
            setClosingId(torneo.id);
            try {
              const count = await cerrarTorneo(torneo.id, torneo.nombre, torneo.puntosParticipacion);
              Alert.alert("Torneo cerrado", `${count} participantes recibieron ${torneo.puntosParticipacion} pts.`);
            } finally {
              setClosingId(null);
            }
          },
        },
      ]
    );
  };

  const Field = ({ label, value, onChangeText, keyboardType = "default", multiline = false }: {
    label: string; value: string; onChangeText: (v: string) => void;
    keyboardType?: "default" | "numeric"; multiline?: boolean;
  }) => (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ color: c.fgMuted, fontSize: 12, fontWeight: "600", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        multiline={multiline}
        style={{ backgroundColor: c.bg, borderRadius: 12, borderWidth: 1, borderColor: c.border, paddingHorizontal: 14, paddingVertical: 11, color: c.fg, fontSize: 15, minHeight: multiline ? 80 : undefined }}
        placeholderTextColor={c.fgMuted}
      />
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={["bottom"]}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 }}>
        <Text style={{ color: c.fg, fontSize: 18, fontWeight: "800" }}>Torneos</Text>
        <Pressable onPress={openCreate} style={{ backgroundColor: c.lime, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Ionicons name="add" size={18} color="#020805" />
          <Text style={{ color: "#020805", fontWeight: "700", fontSize: 13 }}>Nuevo</Text>
        </Pressable>
      </View>

      <FlashList
        data={torneos}
        estimatedItemSize={180}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<Text style={{ color: c.fgMuted, textAlign: "center", paddingTop: 40 }}>Sin torneos todavía</Text>}
        renderItem={({ item }) => (
          <View style={{ backgroundColor: c.surface, borderRadius: 20, borderWidth: 1, borderColor: c.border, padding: 16, marginBottom: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: c.fg, fontWeight: "700", fontSize: 15 }}>{item.nombre}</Text>
                <Text style={{ color: c.fgMuted, fontSize: 13, marginTop: 2 }}>{item.fecha} · {item.lugar}</Text>
                <Text style={{ color: c.fgMuted, fontSize: 12, marginTop: 4 }}>Cupos: {item.cuposOcupados}/{item.cuposMaximos}</Text>
              </View>
              <View style={{ backgroundColor: item.activo ? c.limeAlpha(0.15) : c.limeAlpha(0.05), borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                <Text style={{ color: item.activo ? c.lime : c.fgMuted, fontSize: 11, fontWeight: "700" }}>
                  {item.activo ? "ACTIVO" : item.cerrado ? "CERRADO" : "INACTIVO"}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              <Pressable onPress={() => openEdit(item)} style={{ backgroundColor: c.bg, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: c.border }}>
                <Text style={{ color: c.fg, fontSize: 13, fontWeight: "600" }}>Editar</Text>
              </Pressable>
              <Pressable
                onPress={() => updateTorneo(item.id, { activo: !item.activo })}
                style={{ backgroundColor: c.bg, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: c.border }}
              >
                <Text style={{ color: c.fg, fontSize: 13, fontWeight: "600" }}>{item.activo ? "Desactivar" : "Activar"}</Text>
              </Pressable>
              {!item.cerrado && item.cuposOcupados > 0 && (
                <Pressable
                  onPress={() => handleCerrar(item)}
                  disabled={closingId === item.id}
                  style={{ backgroundColor: "#f59e0b22", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: "#f59e0b" }}
                >
                  {closingId === item.id
                    ? <ActivityIndicator size="small" color="#f59e0b" />
                    : <Text style={{ color: "#f59e0b", fontSize: 13, fontWeight: "700" }}>Cerrar torneo</Text>
                  }
                </Pressable>
              )}
            </View>
          </View>
        )}
      />

      {/* Form modal */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowForm(false)}>
        <View style={{ flex: 1, backgroundColor: c.bg }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20, borderBottomWidth: 1, borderColor: c.border }}>
            <Text style={{ color: c.fg, fontSize: 18, fontWeight: "800" }}>{editId ? "Editar Torneo" : "Nuevo Torneo"}</Text>
            <Pressable onPress={() => setShowForm(false)}>
              <Ionicons name="close" size={24} color={c.fg} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <Field label="Nombre *" value={form.nombre} onChangeText={(v) => setForm((f) => ({ ...f, nombre: v }))} />
            <Field label="Fecha *" value={form.fecha} onChangeText={(v) => setForm((f) => ({ ...f, fecha: v }))} />
            <Field label="Lugar *" value={form.lugar} onChangeText={(v) => setForm((f) => ({ ...f, lugar: v }))} />
            <Field label='Precio display * (ej: "$5.000")' value={form.precio} onChangeText={(v) => setForm((f) => ({ ...f, precio: v }))} />
            <Field label="Precio número *" value={form.precioNum} onChangeText={(v) => setForm((f) => ({ ...f, precioNum: v }))} keyboardType="numeric" />
            <Field label="Cupos máximos *" value={form.cuposMaximos} onChangeText={(v) => setForm((f) => ({ ...f, cuposMaximos: v }))} keyboardType="numeric" />
            <Field label="Descripción" value={form.descripcion} onChangeText={(v) => setForm((f) => ({ ...f, descripcion: v }))} multiline />
            <Field label="Reglas" value={form.reglas} onChangeText={(v) => setForm((f) => ({ ...f, reglas: v }))} multiline />

            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <Text style={{ color: c.fg, fontSize: 15, fontWeight: "600" }}>Activo</Text>
              <Switch value={form.activo} onValueChange={(v) => setForm((f) => ({ ...f, activo: v }))} />
            </View>

            {isSuperAdmin && (
              <View style={{ borderTopWidth: 1, borderColor: c.border, paddingTop: 16, marginTop: 4 }}>
                <Text style={{ color: c.gold, fontSize: 11, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>Solo admin</Text>
                <Field label="Puntos por participar" value={form.puntosParticipacion} onChangeText={(v) => setForm((f) => ({ ...f, puntosParticipacion: v }))} keyboardType="numeric" />
              </View>
            )}

            <Pressable
              onPress={handleSave}
              disabled={saving}
              style={{ backgroundColor: c.lime, borderRadius: 16, paddingVertical: 16, alignItems: "center", marginTop: 8 }}
            >
              {saving
                ? <ActivityIndicator color="#020805" />
                : <Text style={{ color: "#020805", fontWeight: "800", fontSize: 16 }}>Guardar</Text>
              }
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/(user)/admin/crm-torneos.tsx"
git commit -m "feat: CRM Torneos — CRUD, toggle, close torneo with participation points"
```

---

## Task 9: CRM Burgers

**Files:**
- Create: `app/(user)/admin/crm-burgers.tsx`

- [ ] **Step 1: Create crm-burgers.tsx**

```typescript
import { useState, useEffect } from "react";
import {
  View, Text, Pressable, ScrollView, TextInput, Switch,
  Alert, ActivityIndicator, Modal,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { FlashList } from "@shopify/flash-list";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { nanoid } from "nanoid/non-secure";
import { useThemeColors } from "@/lib/theme";
import {
  subscribeToMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  type MenuItem,
} from "@/lib/firestore";
import { uploadBurgerPhoto } from "@/lib/storage";

const CATEGORIAS_BASE = ["clasica", "especial", "veggie", "bebida", "extra"];

const EMPTY_FORM = {
  titulo: "", descripcion: "", precio: "", precioNum: "",
  categoria: "clasica", badge: "", disponible: true, fotoUri: null as string | null,
};

export default function CrmBurgersScreen() {
  const c = useThemeColors();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [existingFotoUrl, setExistingFotoUrl] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => subscribeToMenuItems(false, setItems), []);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.9 });
    if (!result.canceled && result.assets[0]) {
      setForm((f) => ({ ...f, fotoUri: result.assets[0].uri }));
    }
  };

  const openCreate = () => {
    setEditId(null);
    setExistingFotoUrl(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (item: MenuItem) => {
    setEditId(item.id);
    setExistingFotoUrl(item.fotoUrl);
    setForm({
      titulo: item.titulo,
      descripcion: item.descripcion,
      precio: item.precio,
      precioNum: String(item.precioNum),
      categoria: item.categoria,
      badge: item.badge ?? "",
      disponible: item.disponible,
      fotoUri: null,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.titulo || !form.precio || !form.precioNum || !form.categoria) {
      Alert.alert("Campos requeridos", "Completá titulo, precio y categoría.");
      return;
    }
    setSaving(true);
    try {
      let fotoUrl: string | null = existingFotoUrl;
      const itemId = editId ?? nanoid(10);
      if (form.fotoUri) {
        fotoUrl = await uploadBurgerPhoto(itemId, form.fotoUri);
      }
      const data = {
        titulo: form.titulo.trim(),
        descripcion: form.descripcion.trim(),
        precio: form.precio.trim(),
        precioNum: Number(form.precioNum),
        categoria: form.categoria.trim(),
        badge: form.badge.trim() || null,
        disponible: form.disponible,
        fotoUrl,
      };
      if (editId) {
        await updateMenuItem(editId, data);
      } else {
        await createMenuItem(data);
      }
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string, titulo: string) => {
    Alert.alert("Eliminar burger", `¿Eliminar "${titulo}"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar", style: "destructive",
        onPress: async () => {
          setDeletingId(id);
          try { await deleteMenuItem(id); } finally { setDeletingId(null); }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={["bottom"]}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 }}>
        <Text style={{ color: c.fg, fontSize: 18, fontWeight: "800" }}>Burgers</Text>
        <Pressable onPress={openCreate} style={{ backgroundColor: c.lime, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Ionicons name="add" size={18} color="#020805" />
          <Text style={{ color: "#020805", fontWeight: "700", fontSize: 13 }}>Nueva</Text>
        </Pressable>
      </View>

      <FlashList
        data={items}
        estimatedItemSize={100}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <View style={{ backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 12, marginBottom: 10, flexDirection: "row", alignItems: "center", gap: 12 }}>
            {item.fotoUrl
              ? <Image source={{ uri: item.fotoUrl }} style={{ width: 72, height: 72, borderRadius: 12 }} contentFit="cover" />
              : <View style={{ width: 72, height: 72, borderRadius: 12, backgroundColor: c.bg, alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="fast-food-outline" size={28} color={c.fgMuted} />
                </View>
            }
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.fg, fontWeight: "700", fontSize: 14 }}>{item.titulo}</Text>
              <Text style={{ color: c.fgMuted, fontSize: 12 }}>{item.categoria} · {item.precio}</Text>
              {item.badge && <Text style={{ color: c.lime, fontSize: 11, fontWeight: "700", marginTop: 2 }}>{item.badge}</Text>}
            </View>
            <View style={{ alignItems: "flex-end", gap: 8 }}>
              <Switch
                value={item.disponible}
                onValueChange={(v) => updateMenuItem(item.id, { disponible: v })}
                trackColor={{ true: c.lime }}
              />
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Pressable onPress={() => openEdit(item)}>
                  <Ionicons name="pencil-outline" size={18} color={c.fgMuted} />
                </Pressable>
                {deletingId === item.id
                  ? <ActivityIndicator size="small" color="#ef4444" />
                  : <Pressable onPress={() => handleDelete(item.id, item.titulo)}>
                      <Ionicons name="trash-outline" size={18} color="#ef4444" />
                    </Pressable>
                }
              </View>
            </View>
          </View>
        )}
      />

      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowForm(false)}>
        <View style={{ flex: 1, backgroundColor: c.bg }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20, borderBottomWidth: 1, borderColor: c.border }}>
            <Text style={{ color: c.fg, fontSize: 18, fontWeight: "800" }}>{editId ? "Editar Burger" : "Nueva Burger"}</Text>
            <Pressable onPress={() => setShowForm(false)}><Ionicons name="close" size={24} color={c.fg} /></Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            {/* Photo picker */}
            <Pressable onPress={pickImage} style={{ width: "100%", height: 160, borderRadius: 16, borderWidth: 1, borderColor: c.border, overflow: "hidden", marginBottom: 16, backgroundColor: c.surface, alignItems: "center", justifyContent: "center" }}>
              {form.fotoUri || existingFotoUrl
                ? <Image source={{ uri: form.fotoUri ?? existingFotoUrl! }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                : <><Ionicons name="camera-outline" size={32} color={c.fgMuted} /><Text style={{ color: c.fgMuted, marginTop: 8 }}>Subir foto</Text></>
              }
            </Pressable>

            {(["titulo", "descripcion", "precio", "precioNum"] as const).map((field) => (
              <View key={field} style={{ marginBottom: 14 }}>
                <Text style={{ color: c.fgMuted, fontSize: 12, fontWeight: "600", marginBottom: 6, textTransform: "uppercase" }}>
                  {field === "precioNum" ? "Precio número" : field.charAt(0).toUpperCase() + field.slice(1)} {["titulo", "precio", "precioNum"].includes(field) ? "*" : ""}
                </Text>
                <TextInput
                  value={form[field] as string}
                  onChangeText={(v) => setForm((f) => ({ ...f, [field]: v }))}
                  keyboardType={field === "precioNum" ? "numeric" : "default"}
                  multiline={field === "descripcion"}
                  style={{ backgroundColor: c.bg, borderRadius: 12, borderWidth: 1, borderColor: c.border, paddingHorizontal: 14, paddingVertical: 11, color: c.fg, fontSize: 15, minHeight: field === "descripcion" ? 80 : undefined }}
                  placeholderTextColor={c.fgMuted}
                />
              </View>
            ))}

            <View style={{ marginBottom: 14 }}>
              <Text style={{ color: c.fgMuted, fontSize: 12, fontWeight: "600", marginBottom: 6, textTransform: "uppercase" }}>Categoría *</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                {CATEGORIAS_BASE.map((cat) => (
                  <Pressable key={cat} onPress={() => setForm((f) => ({ ...f, categoria: cat }))}
                    style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: form.categoria === cat ? c.lime : c.surface, borderWidth: 1, borderColor: form.categoria === cat ? c.lime : c.border }}
                  >
                    <Text style={{ color: form.categoria === cat ? "#020805" : c.fg, fontSize: 13, fontWeight: "600" }}>{cat}</Text>
                  </Pressable>
                ))}
              </View>
              <TextInput
                value={form.categoria}
                onChangeText={(v) => setForm((f) => ({ ...f, categoria: v }))}
                placeholder="O escribí categoría custom..."
                placeholderTextColor={c.fgMuted}
                style={{ backgroundColor: c.bg, borderRadius: 12, borderWidth: 1, borderColor: c.border, paddingHorizontal: 14, paddingVertical: 11, color: c.fg, fontSize: 15 }}
              />
            </View>

            <View style={{ marginBottom: 14 }}>
              <Text style={{ color: c.fgMuted, fontSize: 12, fontWeight: "600", marginBottom: 6, textTransform: "uppercase" }}>Badge (opcional)</Text>
              <TextInput
                value={form.badge}
                onChangeText={(v) => setForm((f) => ({ ...f, badge: v }))}
                placeholder='Ej: "NUEVO", "POPULAR"'
                placeholderTextColor={c.fgMuted}
                style={{ backgroundColor: c.bg, borderRadius: 12, borderWidth: 1, borderColor: c.border, paddingHorizontal: 14, paddingVertical: 11, color: c.fg, fontSize: 15 }}
              />
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <Text style={{ color: c.fg, fontSize: 15, fontWeight: "600" }}>Disponible</Text>
              <Switch value={form.disponible} onValueChange={(v) => setForm((f) => ({ ...f, disponible: v }))} />
            </View>

            <Pressable onPress={handleSave} disabled={saving} style={{ backgroundColor: c.lime, borderRadius: 16, paddingVertical: 16, alignItems: "center" }}>
              {saving ? <ActivityIndicator color="#020805" /> : <Text style={{ color: "#020805", fontWeight: "800", fontSize: 16 }}>Guardar</Text>}
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/(user)/admin/crm-burgers.tsx"
git commit -m "feat: CRM Burgers — CRUD with photo upload to Firebase Storage"
```

---

## Task 10: Points Screen

**Files:**
- Create: `app/(user)/admin/points.tsx`

- [ ] **Step 1: Create points.tsx**

```typescript
import { useState, useEffect, useCallback } from "react";
import {
  View, Text, Pressable, TextInput, ActivityIndicator, ScrollView,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useThemeColors } from "@/lib/theme";
import {
  subscribeToUsers,
  addPuntosToUser,
  getHistorialPuntos,
  type HistorialPunto,
} from "@/lib/firestore";
import type { DocumentData } from "firebase/firestore";

export default function PointsScreen() {
  const c = useThemeColors();
  const [users, setUsers] = useState<DocumentData[]>([]);
  const [search, setSearch] = useState("");
  const [expandedUid, setExpandedUid] = useState<string | null>(null);
  const [historial, setHistorial] = useState<HistorialPunto[]>([]);
  const [histLoading, setHistLoading] = useState(false);
  const [puntosInput, setPuntosInput] = useState("0");
  const [motivo, setMotivo] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => subscribeToUsers(setUsers), []);

  const filtered = users.filter((u) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      String(u.nombre ?? "").toLowerCase().includes(q) ||
      String(u.apellido ?? "").toLowerCase().includes(q) ||
      String(u.email ?? "").toLowerCase().includes(q)
    );
  });

  const handleExpand = async (uid: string) => {
    if (expandedUid === uid) {
      setExpandedUid(null);
      return;
    }
    setExpandedUid(uid);
    setPuntosInput("0");
    setMotivo("");
    setHistLoading(true);
    try {
      const h = await getHistorialPuntos(uid);
      setHistorial(h);
    } finally {
      setHistLoading(false);
    }
  };

  const handleAjustar = async (uid: string) => {
    const n = Number(puntosInput);
    if (!n || !motivo.trim()) {
      return;
    }
    setSaving(true);
    try {
      await addPuntosToUser(uid, n, motivo.trim(), "manual" as any);
      const h = await getHistorialPuntos(uid);
      setHistorial(h);
      setPuntosInput("0");
      setMotivo("");
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (ts: any) => {
    if (!ts) return "—";
    const date = ts.toDate?.() ?? new Date(ts);
    return date.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={["bottom"]}>
      <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.border, paddingHorizontal: 12, gap: 8 }}>
          <Ionicons name="search-outline" size={18} color={c.fgMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar por nombre o email..."
            placeholderTextColor={c.fgMuted}
            style={{ flex: 1, color: c.fg, fontSize: 15, paddingVertical: 12 }}
          />
        </View>
      </View>

      <FlashList
        data={filtered}
        estimatedItemSize={72}
        keyExtractor={(item) => item.uid}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        renderItem={({ item }) => {
          const isExpanded = expandedUid === item.uid;
          return (
            <View style={{ backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.border, marginBottom: 10, overflow: "hidden" }}>
              <Pressable onPress={() => handleExpand(item.uid)} style={{ flexDirection: "row", alignItems: "center", padding: 14, gap: 12 }}>
                <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: c.limeAlpha(0.15), alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ color: c.lime, fontWeight: "700", fontSize: 16 }}>{String(item.nombre ?? "?").charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.fg, fontWeight: "600", fontSize: 14 }}>{item.nombre} {item.apellido}</Text>
                  <Text style={{ color: c.fgMuted, fontSize: 12, marginTop: 1 }}>{item.email}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ color: c.lime, fontWeight: "700", fontSize: 14 }}>★ {item.puntos ?? 0}</Text>
                  <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color={c.fgMuted} style={{ marginTop: 4 }} />
                </View>
              </Pressable>

              {isExpanded && (
                <View style={{ borderTopWidth: 1, borderColor: c.border, padding: 14 }}>
                  {/* Details row */}
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
                    {[
                      { label: "Método", value: item.loginMethod ?? "—" },
                      { label: "Entradas", value: String(item.entradas?.length ?? 0) },
                      { label: "Ganador", value: item.ganador ? "Sí" : "No" },
                      { label: "Registro", value: formatDate(item.creadoEn) },
                      { label: "IP", value: item.ip ?? "—" },
                    ].map(({ label, value }) => (
                      <View key={label} style={{ backgroundColor: c.bg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: c.border }}>
                        <Text style={{ color: c.fgMuted, fontSize: 10, fontWeight: "600", textTransform: "uppercase" }}>{label}</Text>
                        <Text style={{ color: c.fg, fontSize: 13, fontWeight: "600", marginTop: 2 }}>{value}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Points adjustment */}
                  <Text style={{ color: c.fgMuted, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Ajustar puntos</Text>
                  <View style={{ flexDirection: "row", gap: 8, marginBottom: 10, alignItems: "center" }}>
                    <Pressable onPress={() => setPuntosInput((v) => String(Number(v) - 10))} style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: c.bg, borderWidth: 1, borderColor: c.border, alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ color: c.fg, fontSize: 18, fontWeight: "700" }}>−</Text>
                    </Pressable>
                    <TextInput
                      value={puntosInput}
                      onChangeText={setPuntosInput}
                      keyboardType="numeric"
                      style={{ flex: 1, backgroundColor: c.bg, borderRadius: 10, borderWidth: 1, borderColor: c.border, paddingHorizontal: 12, paddingVertical: 8, color: c.fg, fontSize: 15, textAlign: "center" }}
                    />
                    <Pressable onPress={() => setPuntosInput((v) => String(Number(v) + 10))} style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: c.bg, borderWidth: 1, borderColor: c.border, alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ color: c.fg, fontSize: 18, fontWeight: "700" }}>+</Text>
                    </Pressable>
                  </View>
                  <TextInput
                    value={motivo}
                    onChangeText={setMotivo}
                    placeholder="Motivo..."
                    placeholderTextColor={c.fgMuted}
                    style={{ backgroundColor: c.bg, borderRadius: 10, borderWidth: 1, borderColor: c.border, paddingHorizontal: 12, paddingVertical: 8, color: c.fg, fontSize: 14, marginBottom: 10 }}
                  />
                  <Pressable onPress={() => handleAjustar(item.uid)} disabled={saving} style={{ backgroundColor: c.lime, borderRadius: 12, paddingVertical: 10, alignItems: "center" }}>
                    {saving ? <ActivityIndicator color="#020805" size="small" /> : <Text style={{ color: "#020805", fontWeight: "700" }}>Confirmar</Text>}
                  </Pressable>

                  {/* Historial */}
                  <Text style={{ color: c.fgMuted, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 16, marginBottom: 8 }}>Historial</Text>
                  {histLoading
                    ? <ActivityIndicator color={c.lime} />
                    : historial.length === 0
                      ? <Text style={{ color: c.fgMuted, fontSize: 13 }}>Sin historial</Text>
                      : historial.map((h) => (
                          <View key={h.id} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 6, borderBottomWidth: 1, borderColor: c.borderLight }}>
                            <Text style={{ color: h.puntos > 0 ? c.lime : "#ef4444", fontWeight: "700", fontSize: 13, width: 52 }}>
                              {h.puntos > 0 ? "+" : ""}{h.puntos}
                            </Text>
                            <Text style={{ flex: 1, color: c.fg, fontSize: 13 }}>{h.motivo}</Text>
                            <Text style={{ color: c.fgMuted, fontSize: 11 }}>{formatDate(h.fecha)}</Text>
                          </View>
                        ))
                  }
                </View>
              )}
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/(user)/admin/points.tsx"
git commit -m "feat: Points admin screen — searchable user table, add/subtract points, historial"
```

---

## Task 11: Anuncios Screen

**Files:**
- Create: `app/(user)/admin/anuncios.tsx`

- [ ] **Step 1: Create anuncios.tsx**

```typescript
import { useState, useEffect } from "react";
import {
  View, Text, Pressable, ScrollView, TextInput, Switch, Alert, ActivityIndicator, Modal,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { FlashList } from "@shopify/flash-list";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { nanoid } from "nanoid/non-secure";
import { useThemeColors } from "@/lib/theme";
import {
  getNovedades,
  createNovedad,
  updateNovedad,
  type Novedad,
} from "@/lib/firestore";
import { uploadAnuncioPhoto } from "@/lib/storage";

const EMPTY_FORM = {
  titulo: "", contenido: "", activa: true, fotoUri: null as string | null,
};

export default function AnunciosScreen() {
  const c = useThemeColors();
  const [novedades, setNovedades] = useState<Novedad[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [existingFotoUrl, setExistingFotoUrl] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setNovedades(await getNovedades(false));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.9 });
    if (!result.canceled && result.assets[0]) {
      setForm((f) => ({ ...f, fotoUri: result.assets[0].uri }));
    }
  };

  const openCreate = () => {
    setEditId(null);
    setExistingFotoUrl(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (n: Novedad) => {
    setEditId(n.id);
    setExistingFotoUrl(n.fotoUrl);
    setForm({ titulo: n.titulo, contenido: n.contenido, activa: n.activa, fotoUri: null });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.titulo.trim() || !form.contenido.trim()) {
      Alert.alert("Campos requeridos", "Completá título y contenido.");
      return;
    }
    setSaving(true);
    try {
      let fotoUrl: string | null = existingFotoUrl;
      const novedadId = editId ?? nanoid(10);
      if (form.fotoUri) {
        fotoUrl = await uploadAnuncioPhoto(novedadId, form.fotoUri);
      }
      const data = { titulo: form.titulo.trim(), contenido: form.contenido.trim(), activa: form.activa, fotoUrl };
      if (editId) {
        await updateNovedad(editId, data);
      } else {
        await createNovedad(data);
      }
      await load();
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={["bottom"]}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 }}>
        <Text style={{ color: c.fg, fontSize: 18, fontWeight: "800" }}>Anuncios</Text>
        <Pressable onPress={openCreate} style={{ backgroundColor: c.lime, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Ionicons name="add" size={18} color="#020805" />
          <Text style={{ color: "#020805", fontWeight: "700", fontSize: 13 }}>Nuevo</Text>
        </Pressable>
      </View>

      {loading
        ? <ActivityIndicator color={c.lime} style={{ marginTop: 40 }} />
        : <FlashList
            data={novedades}
            estimatedItemSize={120}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item }) => (
              <View style={{ backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 14, marginBottom: 10 }}>
                <View style={{ flexDirection: "row", gap: 12 }}>
                  {item.fotoUrl && (
                    <Image source={{ uri: item.fotoUrl }} style={{ width: 72, height: 72, borderRadius: 10 }} contentFit="cover" />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: c.fg, fontWeight: "700", fontSize: 14 }}>{item.titulo}</Text>
                    <Text style={{ color: c.fgMuted, fontSize: 12, marginTop: 4 }} numberOfLines={2}>{item.contenido}</Text>
                    <View style={{ backgroundColor: item.activa ? c.limeAlpha(0.15) : c.limeAlpha(0.05), borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, alignSelf: "flex-start", marginTop: 6 }}>
                      <Text style={{ color: item.activa ? c.lime : c.fgMuted, fontSize: 10, fontWeight: "700" }}>{item.activa ? "ACTIVO" : "INACTIVO"}</Text>
                    </View>
                  </View>
                </View>
                <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                  <Pressable onPress={() => openEdit(item)} style={{ flex: 1, backgroundColor: c.bg, borderRadius: 10, paddingVertical: 8, alignItems: "center", borderWidth: 1, borderColor: c.border }}>
                    <Text style={{ color: c.fg, fontSize: 13, fontWeight: "600" }}>Editar</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => updateNovedad(item.id, { activa: !item.activa }).then(load)}
                    style={{ flex: 1, backgroundColor: c.bg, borderRadius: 10, paddingVertical: 8, alignItems: "center", borderWidth: 1, borderColor: c.border }}
                  >
                    <Text style={{ color: c.fg, fontSize: 13, fontWeight: "600" }}>{item.activa ? "Desactivar" : "Activar"}</Text>
                  </Pressable>
                </View>
              </View>
            )}
          />
      }

      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowForm(false)}>
        <View style={{ flex: 1, backgroundColor: c.bg }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20, borderBottomWidth: 1, borderColor: c.border }}>
            <Text style={{ color: c.fg, fontSize: 18, fontWeight: "800" }}>{editId ? "Editar Anuncio" : "Nuevo Anuncio"}</Text>
            <Pressable onPress={() => setShowForm(false)}><Ionicons name="close" size={24} color={c.fg} /></Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <Pressable onPress={pickImage} style={{ width: "100%", height: 140, borderRadius: 16, borderWidth: 1, borderColor: c.border, overflow: "hidden", marginBottom: 16, backgroundColor: c.surface, alignItems: "center", justifyContent: "center" }}>
              {form.fotoUri || existingFotoUrl
                ? <Image source={{ uri: form.fotoUri ?? existingFotoUrl! }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                : <><Ionicons name="image-outline" size={32} color={c.fgMuted} /><Text style={{ color: c.fgMuted, marginTop: 8 }}>Foto opcional</Text></>
              }
            </Pressable>
            {[{ field: "titulo", label: "Título *", multiline: false }, { field: "contenido", label: "Contenido *", multiline: true }].map(({ field, label, multiline }) => (
              <View key={field} style={{ marginBottom: 14 }}>
                <Text style={{ color: c.fgMuted, fontSize: 12, fontWeight: "600", marginBottom: 6, textTransform: "uppercase" }}>{label}</Text>
                <TextInput
                  value={(form as any)[field]}
                  onChangeText={(v) => setForm((f) => ({ ...f, [field]: v }))}
                  multiline={multiline}
                  style={{ backgroundColor: c.bg, borderRadius: 12, borderWidth: 1, borderColor: c.border, paddingHorizontal: 14, paddingVertical: 11, color: c.fg, fontSize: 15, minHeight: multiline ? 100 : undefined }}
                  placeholderTextColor={c.fgMuted}
                />
              </View>
            ))}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <Text style={{ color: c.fg, fontSize: 15, fontWeight: "600" }}>Activo</Text>
              <Switch value={form.activa} onValueChange={(v) => setForm((f) => ({ ...f, activa: v }))} />
            </View>
            <Pressable onPress={handleSave} disabled={saving} style={{ backgroundColor: c.lime, borderRadius: 16, paddingVertical: 16, alignItems: "center" }}>
              {saving ? <ActivityIndicator color="#020805" /> : <Text style={{ color: "#020805", fontWeight: "800", fontSize: 16 }}>Guardar</Text>}
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/(user)/admin/anuncios.tsx"
git commit -m "feat: Anuncios admin screen — CRUD with optional photo upload"
```

---

## Task 12: Final Wiring + Cleanup

**Files:**
- Modify: `app/(user)/admin/crm-menu.tsx` (rename/delete — replaced by crm-burgers)

- [ ] **Step 1: Remove crm-menu stub (replaced by crm-burgers)**

```bash
rm "app/(user)/admin/crm-menu.tsx"
```

- [ ] **Step 2: Remove crm-menu from _layout.tsx**

In `app/(user)/_layout.tsx`, remove:
```typescript
<Tabs.Screen name="admin/crm-menu" options={{ href: null, ...HEADER, title: "CRM Menú" }} />
```

- [ ] **Step 3: Verify app starts without errors**

```bash
npx expo start
```

Navigate to Config → Panel Admin. Verify all 6 entries appear and each screen loads.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: admin dashboard v2 — cleanup, remove crm-menu stub"
```

---

## Manual Steps (Firebase Console — do before testing push notifications)

1. Upgrade project `souche-9ff0b` to Blaze at https://console.firebase.google.com
2. Set Storage security rules:
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /comprobantes/{uid}/{allPaths=**} {
      allow write: if request.auth != null && request.auth.uid == uid;
      allow read: if request.auth != null;
    }
    match /menu/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /novedades/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```
3. Deploy Cloud Function: `firebase deploy --only functions`

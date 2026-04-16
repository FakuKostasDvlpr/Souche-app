/**
 * Firestore data layer — Souche App
 * Centralized types and CRUD functions for all collections.
 */

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
  type Unsubscribe,
  type DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface Torneo {
  id: string;
  nombre: string;
  fecha: string;           // display string, e.g. "15 Junio 2025"
  fechaTimestamp: Timestamp | null;
  lugar: string;
  precio: string;          // display string, e.g. "$5.000"
  precioNum: number;       // numeric for sorting/logic
  cuposMaximos: number;
  cuposOcupados: number;
  descripcion: string;
  reglas: string;
  activo: boolean;
  ganadorUid: string | null;
  puntosParticipacion: number;
  cerrado: boolean;
  creadoEn: Timestamp | null;
}

export type EntradaEstado = "pendiente" | "activo" | "rechazada" | "usado";

export interface Entrada {
  id: string;
  usuarioUid: string;
  usuarioNombre: string;
  usuarioEmail: string;
  torneoId: string;
  torneoNombre: string;
  fecha: string;
  lugar: string;
  estado: EntradaEstado;
  comprobanteFotoUrl: string | null;
  motivoRechazo: string | null;
  qrToken: string | null;
  creadoEn: Timestamp | null;
  confirmadoEn: Timestamp | null;
  usadoEn: Timestamp | null;
}

// Categorías base del sistema. El admin también puede definir tipos personalizados
// (strings libres) al crear una hamburguesa, que se usan como filtros en la sección Menú.
export type MenuCategoriaBase = "clasica" | "especial" | "veggie" | "bebida" | "extra";
export type MenuCategoria = MenuCategoriaBase | string; // string = tipo personalizado

export interface MenuItem {
  id: string;
  titulo: string;
  descripcion: string;
  precio: string;          // display string, e.g. "$6.500"
  precioNum: number;
  fotoUrl: string | null;
  categoria: MenuCategoria; // puede ser base o personalizada, e.g. "smash", "crispy"
  disponible: boolean;
  badge: string | null;    // e.g. "NUEVO", "POPULAR"
  creadoEn: Timestamp | null;
}

export interface Novedad {
  id: string;
  titulo: string;
  contenido: string;
  fotoUrl: string | null;
  activa: boolean;
  creadoEn: Timestamp | null;
}

export type PuntoTipo = "registro" | "runner" | "torneo" | "qr" | "ganador" | "perfil";

export interface HistorialPunto {
  id: string;
  puntos: number;
  motivo: string;
  tipo: PuntoTipo;
  fecha: Timestamp | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function withId<T>(data: DocumentData, id: string): T {
  return { ...data, id } as T;
}

// ─────────────────────────────────────────────────────────────────────────────
// Users
// ─────────────────────────────────────────────────────────────────────────────

export async function getAllUsers() {
  const snap = await getDocs(
    query(collection(db, "users"), orderBy("creadoEn", "desc"))
  );
  return snap.docs.map((d) => withId<DocumentData>(d.data(), d.id));
}

export function subscribeToUsers(
  cb: (users: DocumentData[]) => void
): Unsubscribe {
  return onSnapshot(
    query(collection(db, "users"), orderBy("creadoEn", "desc")),
    (snap) => cb(snap.docs.map((d) => withId<DocumentData>(d.data(), d.id)))
  );
}

export async function updateUserProfile(
  uid: string,
  data: Partial<Omit<DocumentData, "uid" | "creadoEn">>
) {
  await updateDoc(doc(db, "users", uid), data);
}

/** Add points and log the history entry atomically */
export async function addPuntosToUser(
  uid: string,
  puntos: number,
  motivo: string,
  tipo: PuntoTipo
) {
  await updateDoc(doc(db, "users", uid), {
    puntos: increment(puntos),
  });
  await addDoc(collection(db, "users", uid, "historialPuntos"), {
    puntos,
    motivo,
    tipo,
    fecha: serverTimestamp(),
  });
}

/** Mark a user as winner and grant points */
export async function setUserAsGanador(
  uid: string,
  torneoNombre: string,
  puntos: number,
  motivo: string
) {
  await updateDoc(doc(db, "users", uid), {
    ganador: true,
    torneoGanado: torneoNombre,
    puntos: increment(puntos),
  });
  await addDoc(collection(db, "users", uid, "historialPuntos"), {
    puntos,
    motivo: motivo || `Ganó ${torneoNombre}`,
    tipo: "ganador" as PuntoTipo,
    fecha: serverTimestamp(),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Historial de Puntos (subcollection)
// ─────────────────────────────────────────────────────────────────────────────

export async function getHistorialPuntos(uid: string): Promise<HistorialPunto[]> {
  const snap = await getDocs(
    query(
      collection(db, "users", uid, "historialPuntos"),
      orderBy("fecha", "desc"),
      limit(50)
    )
  );
  return snap.docs.map((d) => withId<HistorialPunto>(d.data(), d.id));
}

export function subscribeToHistorialPuntos(
  uid: string,
  cb: (historial: HistorialPunto[]) => void
): Unsubscribe {
  return onSnapshot(
    query(
      collection(db, "users", uid, "historialPuntos"),
      orderBy("fecha", "desc"),
      limit(50)
    ),
    (snap) =>
      cb(snap.docs.map((d) => withId<HistorialPunto>(d.data(), d.id)))
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Torneos
// ─────────────────────────────────────────────────────────────────────────────

export async function getTorneos(onlyActive = false): Promise<Torneo[]> {
  const q = onlyActive
    ? query(
        collection(db, "torneos"),
        where("activo", "==", true),
        orderBy("creadoEn", "desc")
      )
    : query(collection(db, "torneos"), orderBy("creadoEn", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => withId<Torneo>(d.data(), d.id));
}

export function subscribeToTorneos(
  onlyActive: boolean,
  cb: (torneos: Torneo[]) => void
): Unsubscribe {
  const q = onlyActive
    ? query(
        collection(db, "torneos"),
        where("activo", "==", true),
        orderBy("creadoEn", "desc")
      )
    : query(collection(db, "torneos"), orderBy("creadoEn", "desc"));
  return onSnapshot(q, (snap) =>
    cb(snap.docs.map((d) => withId<Torneo>(d.data(), d.id)))
  );
}

export async function getTorneo(id: string): Promise<Torneo | null> {
  const snap = await getDoc(doc(db, "torneos", id));
  if (!snap.exists()) return null;
  return withId<Torneo>(snap.data(), snap.id);
}

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

export async function updateTorneo(
  id: string,
  data: Partial<Omit<Torneo, "id" | "creadoEn">>
) {
  await updateDoc(doc(db, "torneos", id), data);
}

export async function incrementCuposOcupados(torneoId: string) {
  await updateDoc(doc(db, "torneos", torneoId), {
    cuposOcupados: increment(1),
  });
}

export async function updateExpoPushToken(uid: string, token: string) {
  await updateDoc(doc(db, "users", uid), { expoPushToken: token });
}

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

// ─────────────────────────────────────────────────────────────────────────────
// Entradas
// ─────────────────────────────────────────────────────────────────────────────

export async function createEntrada(
  data: Omit<Entrada, "id" | "creadoEn" | "confirmadoEn" | "usadoEn" | "qrToken" | "motivoRechazo">
): Promise<string> {
  const ref = await addDoc(collection(db, "entradas"), {
    ...data,
    estado: "pendiente",
    qrToken: null,
    motivoRechazo: null,
    confirmadoEn: null,
    usadoEn: null,
    creadoEn: serverTimestamp(),
  });
  return ref.id;
}

export async function getEntradasByUser(uid: string): Promise<Entrada[]> {
  const snap = await getDocs(
    query(
      collection(db, "entradas"),
      where("usuarioUid", "==", uid),
      orderBy("creadoEn", "desc")
    )
  );
  return snap.docs.map((d) => withId<Entrada>(d.data(), d.id));
}

export function subscribeToEntradasByUser(
  uid: string,
  cb: (entradas: Entrada[]) => void
): Unsubscribe {
  return onSnapshot(
    query(
      collection(db, "entradas"),
      where("usuarioUid", "==", uid),
      orderBy("creadoEn", "desc")
    ),
    (snap) => cb(snap.docs.map((d) => withId<Entrada>(d.data(), d.id)))
  );
}

export function subscribeToPendingEntradas(
  cb: (entradas: Entrada[]) => void
): Unsubscribe {
  return onSnapshot(
    query(
      collection(db, "entradas"),
      where("estado", "==", "pendiente"),
      orderBy("creadoEn", "desc")
    ),
    (snap) => cb(snap.docs.map((d) => withId<Entrada>(d.data(), d.id)))
  );
}

export function subscribeToAllEntradas(
  cb: (entradas: Entrada[]) => void
): Unsubscribe {
  return onSnapshot(
    query(collection(db, "entradas"), orderBy("creadoEn", "desc")),
    (snap) => cb(snap.docs.map((d) => withId<Entrada>(d.data(), d.id)))
  );
}

/** Confirm entrada: set estado to "activo" and generate QR token */
export async function confirmarEntrada(id: string, qrToken: string) {
  await updateDoc(doc(db, "entradas", id), {
    estado: "activo",
    qrToken,
    motivoRechazo: null,
    confirmadoEn: serverTimestamp(),
  });
}

export async function rechazarEntrada(id: string, motivo: string) {
  await updateDoc(doc(db, "entradas", id), {
    estado: "rechazada",
    motivoRechazo: motivo,
  });
}

/** Used when staff scans QR at the door */
export async function getEntradaByQRToken(qrToken: string): Promise<Entrada | null> {
  const snap = await getDocs(
    query(collection(db, "entradas"), where("qrToken", "==", qrToken))
  );
  if (snap.empty) return null;
  return withId<Entrada>(snap.docs[0].data(), snap.docs[0].id);
}

export async function marcarEntradaUsada(id: string) {
  await updateDoc(doc(db, "entradas", id), {
    estado: "usado",
    usadoEn: serverTimestamp(),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Menu
// ─────────────────────────────────────────────────────────────────────────────

export async function getMenuItems(onlyDisponible = false): Promise<MenuItem[]> {
  const q = onlyDisponible
    ? query(
        collection(db, "menu"),
        where("disponible", "==", true),
        orderBy("creadoEn", "desc")
      )
    : query(collection(db, "menu"), orderBy("creadoEn", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => withId<MenuItem>(d.data(), d.id));
}

export function subscribeToMenuItems(
  onlyDisponible: boolean,
  cb: (items: MenuItem[]) => void
): Unsubscribe {
  const q = onlyDisponible
    ? query(
        collection(db, "menu"),
        where("disponible", "==", true),
        orderBy("creadoEn", "desc")
      )
    : query(collection(db, "menu"), orderBy("creadoEn", "desc"));
  return onSnapshot(q, (snap) =>
    cb(snap.docs.map((d) => withId<MenuItem>(d.data(), d.id)))
  );
}

export async function createMenuItem(
  data: Omit<MenuItem, "id" | "creadoEn">
): Promise<string> {
  const ref = await addDoc(collection(db, "menu"), {
    ...data,
    creadoEn: serverTimestamp(),
  });
  return ref.id;
}

export async function updateMenuItem(
  id: string,
  data: Partial<Omit<MenuItem, "id" | "creadoEn">>
) {
  await updateDoc(doc(db, "menu", id), data);
}

export async function deleteMenuItem(id: string) {
  await deleteDoc(doc(db, "menu", id));
}

/**
 * Returns all unique categories currently in the menu collection,
 * sorted alphabetically. Used to build the filter bar in the Menú screen.
 * Includes both base categories and any custom ones the admin created.
 */
export async function getMenuCategorias(): Promise<string[]> {
  const snap = await getDocs(collection(db, "menu"));
  const cats = new Set<string>();
  snap.docs.forEach((d) => {
    const cat = d.data().categoria as string | undefined;
    if (cat) cats.add(cat);
  });
  return Array.from(cats).sort();
}

/**
 * Filter menu items by category. Pass null to get all items.
 */
export async function getMenuItemsByCategoria(
  categoria: string | null,
  onlyDisponible = true
): Promise<MenuItem[]> {
  const constraints = [];
  if (onlyDisponible) constraints.push(where("disponible", "==", true));
  if (categoria) constraints.push(where("categoria", "==", categoria));
  constraints.push(orderBy("creadoEn", "desc"));
  const snap = await getDocs(query(collection(db, "menu"), ...constraints));
  return snap.docs.map((d) => withId<MenuItem>(d.data(), d.id));
}

// ─────────────────────────────────────────────────────────────────────────────
// Novedades
// ─────────────────────────────────────────────────────────────────────────────

export async function getNovedades(onlyActivas = true): Promise<Novedad[]> {
  const q = onlyActivas
    ? query(
        collection(db, "novedades"),
        where("activa", "==", true),
        orderBy("creadoEn", "desc")
      )
    : query(collection(db, "novedades"), orderBy("creadoEn", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => withId<Novedad>(d.data(), d.id));
}

export function subscribeToNovedades(
  cb: (novedades: Novedad[]) => void
): Unsubscribe {
  return onSnapshot(
    query(
      collection(db, "novedades"),
      where("activa", "==", true),
      orderBy("creadoEn", "desc")
    ),
    (snap) => cb(snap.docs.map((d) => withId<Novedad>(d.data(), d.id)))
  );
}

export async function createNovedad(
  data: Omit<Novedad, "id" | "creadoEn">
): Promise<string> {
  const ref = await addDoc(collection(db, "novedades"), {
    ...data,
    creadoEn: serverTimestamp(),
  });
  return ref.id;
}

export async function updateNovedad(
  id: string,
  data: Partial<Omit<Novedad, "id" | "creadoEn">>
) {
  await updateDoc(doc(db, "novedades", id), data);
}

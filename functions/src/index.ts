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

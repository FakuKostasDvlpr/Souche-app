import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

export const onEntradaUpdate = onDocumentUpdated(
  "entradas/{entradaId}",
  async (event) => {
    try {
      const before = event.data?.before.data();
      const after = event.data?.after.data();
      if (!before || !after) return;
      if (before.estado === after.estado) return;

      const estadoAfter = after.estado as string;
      if (estadoAfter !== "activo" && estadoAfter !== "rechazada") return;

      const uid = after.usuarioUid as string | undefined;
      const torneoNombre = after.torneoNombre as string | undefined;
      if (!uid || !torneoNombre) return;

      const userSnap = await db.collection("users").doc(uid).get();
      const token: string | undefined = userSnap.data()?.expoPushToken;
      if (!token) return;

      const title =
        estadoAfter === "activo" ? "Entrada confirmada!" : "Entrada rechazada";
      const body =
        estadoAfter === "activo"
          ? `Tu entrada para ${torneoNombre} fue aprobada.`
          : `Tu comprobante de ${torneoNombre} fue rechazado.`;

      const res = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: token,
          title,
          body,
          data: { entradaId: event.params.entradaId },
        }),
      });
      if (!res.ok) {
        console.error(`Expo push API error ${res.status}:`, await res.text());
        return;
      }
      const json = await res.json() as { data?: Array<{ status: string; message?: string }> };
      const receipt = json?.data?.[0];
      if (receipt?.status === "error") {
        console.error("Expo push notification error:", receipt.message);
      }
    } catch (e) {
      console.error("onEntradaUpdate error:", e);
    }
  }
);

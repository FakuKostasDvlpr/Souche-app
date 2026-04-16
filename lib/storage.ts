import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";
import { storage } from "@/lib/firebase";

async function uploadImage(path: string, uri: string): Promise<string> {
  if (!uri) throw new Error("Image URI is required");
  const response = await fetch(uri);
  if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`);
  const blob = await response.blob();
  if (!blob.size) throw new Error("Image blob is empty");
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
  return uploadImage(`comprobantes/${uid}/${entradaId}.jpg`, uri);
}

export async function uploadBurgerPhoto(
  menuItemId: string,
  uri: string
): Promise<string> {
  return uploadImage(`menu/${menuItemId}.jpg`, uri);
}

export async function uploadAnuncioPhoto(
  novedadId: string,
  uri: string
): Promise<string> {
  return uploadImage(`novedades/${novedadId}.jpg`, uri);
}

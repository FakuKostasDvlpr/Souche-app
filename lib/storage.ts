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

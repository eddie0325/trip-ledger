import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "./firebase";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export function validateReceiptFile(file: File): string | null {
  if (!file.type.startsWith("image/")) return "請選擇圖片檔案";
  if (file.size > MAX_FILE_SIZE) return "圖片大小不能超過 10MB";
  return null;
}

export async function uploadReceipt(tripCode: string, file: File): Promise<string> {
  const extension = file.name.includes(".") ? file.name.split(".").pop() : "jpg";
  const path = `receipts/${tripCode}/${crypto.randomUUID()}.${extension}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

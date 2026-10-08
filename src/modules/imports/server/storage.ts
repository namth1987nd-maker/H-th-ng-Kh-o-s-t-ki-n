import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

// File gốc lưu theo SHA-256: storage/imports/<sha>.xlsx — truy ngược được khi kiểm định.
const root = () => path.resolve(process.env.STORAGE_DIR ?? "./storage", "imports");

export const extOf = (fileName: string) => path.extname(fileName).toLowerCase();

export const uploadPath = (shaHex: string, ext: string) => path.join(root(), `${shaHex}${ext}`);

export async function saveUpload(shaHex: string, ext: string, buf: Buffer): Promise<string> {
  await mkdir(root(), { recursive: true });
  const p = uploadPath(shaHex, ext);
  await writeFile(p, buf);
  return p;
}

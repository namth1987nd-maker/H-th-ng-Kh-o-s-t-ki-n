import { createHmac } from "node:crypto";
import { toNFC } from "@/core/lib/text";

/**
 * Băm mã người học bằng HMAC-SHA256. Khóa nằm ở biến môi trường, ngoài DB:
 * DB chỉ chứa băm nên không lộ danh tính, nhưng vẫn phát hiện được phiếu trùng.
 */
export function respondentHash(studentCode: string, secret = process.env.HASH_SECRET): Buffer {
  if (!secret) throw new Error("Thiếu HASH_SECRET");
  return createHmac("sha256", secret).update(toNFC(studentCode).toLowerCase()).digest();
}

/** Chuẩn hóa Unicode về NFC, bỏ khoảng trắng thừa. Dùng cho mọi chuỗi nhập vào. */
export function toNFC(s: string): string {
  return s.normalize("NFC").replace(/\s+/g, " ").trim();
}

/** Khóa so khớp tên (staff_alias.alias_norm): NFC, bỏ dấu, chữ thường, đ → d. */
export function normalizeName(s: string): string {
  return toNFC(s)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase();
}

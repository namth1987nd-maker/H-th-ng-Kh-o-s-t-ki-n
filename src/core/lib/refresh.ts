import { revalidatePath } from "next/cache";

/**
 * Gọi trong Server Action sau khi dữ liệu thay đổi (lưu/sửa/xóa/nhập):
 * xóa trang đã lưu tạm ở trình duyệt (staleTimes) → mọi trang hiện số liệu mới.
 */
export function refreshAll(): void {
  revalidatePath("/", "layout");
}

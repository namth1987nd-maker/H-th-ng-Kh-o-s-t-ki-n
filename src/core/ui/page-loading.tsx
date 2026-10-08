/**
 * Khung chờ hiển thị NGAY khi chuyển trang (Next.js loading.tsx), trong lúc server dựng trang thật.
 * Header + sidebar giữ nguyên, chỉ phần nội dung hiện khung xám — người dùng thấy đã chuyển trang lập tức.
 */
export default function PageLoading() {
  return (
    <div className="animate-pulse" role="status" aria-label="Đang tải">
      <div className="mb-2 h-7 w-64 rounded bg-slate-200" />
      <div className="mb-8 h-4 w-96 max-w-full rounded bg-slate-100" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-28 rounded border border-border bg-card" />
        ))}
      </div>
      <div className="mt-6 space-y-2">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-10 rounded border border-border bg-card" />
        ))}
      </div>
      <span className="sr-only">Đang tải…</span>
    </div>
  );
}

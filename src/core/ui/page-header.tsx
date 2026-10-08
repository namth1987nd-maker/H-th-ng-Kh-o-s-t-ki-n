export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <header className="mb-6">
      <h1 className="text-2xl font-semibold">{title}</h1>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
    </header>
  );
}

/** Khung chờ cho trang chưa cài đặt: ghi rõ cần gì để làm tiếp. */
export function Todo({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded border border-dashed border-border bg-card p-6 text-sm text-muted">
      <p className="mb-2 font-medium text-foreground">Chưa cài đặt</p>
      {children}
    </div>
  );
}

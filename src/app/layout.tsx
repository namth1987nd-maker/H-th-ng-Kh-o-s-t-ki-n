import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Khảo sát lấy ý kiến phản hồi",
  description: "Quản lý và phân tích khảo sát lấy ý kiến phản hồi phục vụ kiểm định chất lượng",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}

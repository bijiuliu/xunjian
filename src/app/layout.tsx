import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";

const basePath = process.env.PAGES_BASE_PATH ?? "";

export const metadata: Metadata = {
  title: "夜班巡检",
  description: "夜班巡检记录工具",
  manifest: `${basePath}/manifest.webmanifest`,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="zh-CN"
    >
      <body>{children}<Toaster position="top-center" richColors /></body>
    </html>
  );
}


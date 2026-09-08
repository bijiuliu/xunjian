import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";

const basePath = process.env.PAGES_BASE_PATH ?? "";

export const metadata: Metadata = {
  title: "夜班巡检",
  description: "夜班巡检记录工具",
  manifest: `${basePath}/manifest.webmanifest`,
  icons: {
    icon: [
      {
        url: `${basePath}/favicon.ico?v=xunjian-20260908`,
        sizes: "16x16 32x32 48x48",
        type: "image/x-icon",
      },
      {
        url: `${basePath}/icons/xunjian-pwa-192.png?v=xunjian-20260908`,
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: `${basePath}/icons/xunjian-pwa-512.png?v=xunjian-20260908`,
        sizes: "512x512",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: `${basePath}/apple-touch-icon.png?v=xunjian-20260908`,
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
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

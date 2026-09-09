import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "sonner";

const basePath = process.env.PAGES_BASE_PATH ?? "";

export const metadata: Metadata = {
  metadataBase: new URL("https://ybxunjian.github.io"),
  title: "夜班巡检",
  description: "清晰记录、跨端同步并可靠追溯每一次夜班巡检。",
  manifest: `${basePath}/manifest.webmanifest`,
  openGraph: {
    type: "website",
    locale: "zh_CN",
    siteName: "夜班巡检",
    title: "夜班巡检",
    description: "让每一次巡检，清晰留在当下。",
  },
  twitter: {
    card: "summary_large_image",
    title: "夜班巡检",
    description: "让每一次巡检，清晰留在当下。",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f1f37",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN">
      <body>
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}

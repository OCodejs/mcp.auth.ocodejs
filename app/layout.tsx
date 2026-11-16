import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OCODEJS — Học lập trình thực chiến",
  description: "Nền tảng học lập trình thực chiến OCODEJS — học, xây dựng và phát triển sản phẩm.",
  applicationName: "OCodeJS",
  robots: { index: true, follow: true }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 0.95,
  minimumScale: 0.95,
  maximumScale: 0.95,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#000000"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}

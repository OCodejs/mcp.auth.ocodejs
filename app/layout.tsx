import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OCodeJS — Auth",
  description: "Sign in or create your OCodeJS account.",
  applicationName: "OCodeJS",
  robots: { index: false, follow: false }
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
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}

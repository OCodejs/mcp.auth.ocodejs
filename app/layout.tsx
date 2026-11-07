import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Velclaw Identity",
  description: "Secure identity and authentication for Velclaw."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><body>{children}</body></html>;
}
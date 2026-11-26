import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { cookies } from "next/headers";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Vikings Athletes", template: "%s · Vikings Athletes" },
  description: "Ton niveau, ta progression, ta communauté Vikings.",
  applicationName: "Vikings Athletes",
  appleWebApp: { capable: true, title: "Vikings", statusBarStyle: "black-translucent" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#050505",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const theme = (await cookies()).get("va_theme")?.value === "light" ? "light" : "dark";
  return (
    <html lang="fr" data-theme={theme}>
      <body className={`${GeistSans.variable} ${GeistMono.variable} aurora min-h-dvh antialiased`}>
        <div className="watermark" aria-hidden />
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}

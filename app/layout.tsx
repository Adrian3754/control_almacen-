import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import WorkspaceNavigation from "@/components/WorkspaceNavigation";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "M. López",
  description: "Gestión de almacén de M. López",
  manifest: "/manifest.json",
  icons: {
    icon: "/logo-mlopez.png",
    apple: "/logo-mlopez.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-screen w-full overflow-x-hidden bg-slate-50 text-slate-900">
        <WorkspaceNavigation>{children}</WorkspaceNavigation>
      </body>
    </html>
  );
}
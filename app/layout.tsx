import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import Header from "../components/Header";
import AuthGuard from "../components/AuthGuard2";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// 1. Viewport exportado de forma independiente (Estándar de Next.js)
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

// 2. Metadata limpia de la app
export const metadata: Metadata = {
  title: "Control de Almacén",
  description: "Sistema de administración de tarimas e inventario",
  manifest: "/manifest.json", // 👈 Vinculación para habilitar la PWA
};

const navItems = [
  { href: "/", label: "Inicio" },
  { href: "/sorteo", label: "Sorteo" },
  { href: "/inventario", label: "Inventario" },
  { href: "/lotes", label: "Lotes" },
  { href: "/movimientos", label: "Movimientos" },
  { href: "/tarimas", label: "Tarimas" },
  { href: "/reportes", label: "Reportes" },
  { href: "/login", label: "Login" },
];

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
      {/* 3. Agregado overflow-x-hidden y w-full para bloquear el scroll blanco a la derecha */}
      <body className="min-h-screen w-full overflow-x-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50 text-slate-900">
        <AuthGuard />
        <Header />

        {/* Contenido principal */}
        <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-white/80 backdrop-blur p-6 sm:p-8 shadow-sm border border-slate-100">
            {children}
          </div>
        </main>

        {/* Footer */}
        <footer className="mt-12 border-t border-slate-200 bg-white/50 py-6 text-center text-sm text-slate-600">
          <p>© 2026 Control de Almacén. Todos los derechos reservados.</p>
        </footer>
      </body>
    </html>
  );
}
"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  clearEmployeeSessionAction,
} from "@/components/actions/auth.actions";
import {
  clearEmployeeSession,
  getEmployeeSession,
  type EmployeeSession,
} from "@/lib/employeeSession";

const navigationItems = [
  { href: "/dashboard", label: "Inicio", icon: "🏠", minLevel: 3 },
  { href: "/menu", label: "Menú de módulos", icon: "☷", minLevel: 3 },
  { href: "/lotes", label: "Lotes", icon: "📋", minLevel: 3 },
  { href: "/movimientos", label: "Movimientos", icon: "🔄", minLevel: 3 },
  { href: "/inventario", label: "Materiales y compras", icon: "🧰", minLevel: 3 },
  { href: "/cortes", label: "Cortes", icon: "🌿", minLevel: 3 },
  { href: "/tarimas", label: "Tarimas", icon: "📦", minLevel: 3 },
  { href: "/calidad/muestreo", label: "Calidad", icon: "✅", minLevel: 3 },
  { href: "/sorteo", label: "Sorteo", icon: "🎯", minLevel: 3 },
  { href: "/cuentas", label: "Cuentas", icon: "🧾", minLevel: 3 },
  { href: "/profile", label: "Mi perfil", icon: "👤", minLevel: 3 },
  { href: "/reportes", label: "Reportes", icon: "📊", minLevel: 2 },
  { href: "/produccion", label: "Producción", icon: "⚙️", minLevel: 1 },
  { href: "/settings", label: "Configuración", icon: "🛠️", minLevel: 1 },
  { href: "/settings/usuarios", label: "Usuarios y permisos", icon: "👥", minLevel: 1 },
] as const;

function isActivePath(pathname: string, href: string) {
  if (href === "/settings") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function WorkspaceNavigation({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<EmployeeSession | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  useEffect(() => {
    const updateSession = () => {
      setSession(getEmployeeSession());
      setSessionChecked(true);
    };

    Promise.resolve().then(updateSession);
    window.addEventListener("employeeSessionChanged", updateSession);
    window.addEventListener("storage", updateSession);

    return () => {
      window.removeEventListener("employeeSessionChanged", updateSession);
      window.removeEventListener("storage", updateSession);
    };
  }, []);

  const isStandalonePage = pathname === "/" || pathname === "/login";

  useEffect(() => {
    if (!isStandalonePage && sessionChecked && !session) {
      router.replace("/login");
    }
  }, [isStandalonePage, router, session, sessionChecked]);

  if (isStandalonePage) return children;

  if (!sessionChecked || !session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <p className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600 shadow-sm">
          {sessionChecked ? "Redirigiendo al inicio de sesión..." : "Verificando sesión..."}
        </p>
      </main>
    );
  }

  const userLevel = Number(session.nivel_jerarquia ?? 3);
  const visibleItems = navigationItems.filter(
    (item) => userLevel <= item.minLevel
  );

  const handleLogout = async () => {
    setLogoutError("");
    try {
      await clearEmployeeSessionAction();
      clearEmployeeSession();
      setSession(null);
      setMobileMenuOpen(false);
      router.replace("/login");
    } catch (error: unknown) {
      console.error("No se pudo cerrar la sesión del servidor:", error);
      setLogoutError("No se pudo cerrar la sesión. Revisa tu conexión e inténtalo otra vez.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50/50 via-slate-50 to-amber-50/30 lg:flex">
      {mobileMenuOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside
        id="workspace-navigation"
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-slate-200 bg-white shadow-xl transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:max-w-none lg:translate-x-0 lg:shadow-none ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5">
          <Link
            href="/dashboard"
            className="flex min-w-0 items-center gap-3"
            onClick={() => setMobileMenuOpen(false)}
          >
            <Image
              src="/logo-mlopez.png"
              alt="Logotipo de M. López"
              width={44}
              height={44}
              className="h-11 w-11 shrink-0 rounded-xl object-contain"
            />
            <span className="min-w-0">
              <span className="block truncate font-bold text-slate-900">
                M. López
              </span>
              <span className="block text-xs text-slate-500">
                Menú principal
              </span>
            </span>
          </Link>
          <button
            type="button"
            aria-label="Cerrar menú"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>

        <nav
          aria-label="Navegación principal"
          className="flex-1 space-y-1 overflow-y-auto px-3 py-5"
        >
          <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Módulos
          </p>
          {visibleItems.map((item) => {
            const active = isActivePath(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                  active
                    ? "bg-emerald-50 text-emerald-800"
                    : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-900"
                }`}
              >
                <span className="w-6 text-center text-base" aria-hidden="true">
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-100 p-4">
          {logoutError ? (
            <p role="alert" className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {logoutError}
            </p>
          ) : null}
          <div className="mb-3 rounded-xl bg-slate-50 px-3 py-3">
            <p className="truncate text-sm font-semibold text-slate-800">
              {session?.nombre || session?.numero_empleado || "Usuario"}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {session?.rol || "Sesión de almacén"}
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
          >
            <span className="w-6 text-center" aria-hidden="true">
              ↪
            </span>
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
          <button
            type="button"
            aria-controls="workspace-navigation"
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-lg text-slate-700 hover:bg-slate-50"
          >
            {mobileMenuOpen ? "✕" : "☰"}
          </button>
          <Image
            src="/logo-mlopez.png"
            alt="Logotipo de M. López"
            width={36}
            height={36}
            className="h-9 w-9 shrink-0 rounded-lg object-contain"
          />
          <span className="truncate font-semibold text-slate-800">
            {navigationItems.find((item) => isActivePath(pathname, item.href))
              ?.label || "M. López"}
          </span>
        </header>
        {children}
      </div>
    </div>
  );
}

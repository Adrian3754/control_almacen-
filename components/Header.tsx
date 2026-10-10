"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { EmployeeSession, getEmployeeSession, clearEmployeeSession } from "@/lib/employeeSession";
import DatabaseConnectionStatus from "@/components/DatabaseConnectionStatus";

// Niveles jerárquicos:
// 1 = Administrador (acceso a todo)
// 2 = Supervisor (acceso limitado)
// 3 = Operador (acceso mínimo)

const navItems = [
  // Acceso: Todos (1, 2, 3)
  { href: "/", label: "Inicio", minLevel: 3 },
  { href: "/sorteo", label: "Sorteo", minLevel: 3 },
  { href: "/calidad/muestreo", label: "Calidad/Muestreo", minLevel: 3 },
  { href: "/lotes", label: "Lotes", minLevel: 3 },
  { href: "/movimientos", label: "Movimientos", minLevel: 3 },
  { href: "/tarimas", label: "Tarimas", minLevel: 3 },
  { href: "/cuentas", label: "Cuentas", minLevel: 3 },
  // Acceso: Solo Admin (1) y Supervisor (2)
  { href: "/reportes", label: "Reportes", minLevel: 2 },
  // Acceso: Solo Admin (1)
  { href: "/produccion", label: "Producción", minLevel: 1 }, // <-- Aquí está el nuevo módulo
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<EmployeeSession | null>(() => getEmployeeSession());
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const loadSession = () => {
      const current = getEmployeeSession();
      setSession(current);
    };

    loadSession();

    const handleSessionChange = () => {
      loadSession();
    };

    window.addEventListener("employeeSessionChanged", handleSessionChange);
    window.addEventListener("storage", handleSessionChange);
    return () => {
      window.removeEventListener("employeeSessionChanged", handleSessionChange);
      window.removeEventListener("storage", handleSessionChange);
    };
  }, []);

  const handleLogout = () => {
    clearEmployeeSession();
    setSession(null);
    setUserMenuOpen(false);
    router.push("/login");
  };

  const isAdmin = Number(session?.nivel_jerarquia) === 1;

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur-md">
      <div className="mx-auto px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <Link href="/" className="block">
              <h1 className="text-lg sm:text-2xl font-bold bg-linear-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                📦 Control de Almacén
              </h1>
              <p className="text-xs text-slate-500 mt-1 hidden sm:block">Sistema de gestión integral</p>
            </Link>
            <DatabaseConnectionStatus />
          </div>

          {/* Desktop nav: visible only when session exists; items filtered by level */}
          {session && (
            <nav className="hidden md:flex flex-1 flex-wrap items-center justify-end gap-2">
              {navItems
                .filter((item) => {
                  const userLevel = session?.nivel_jerarquia ?? 99;
                  return userLevel <= item.minLevel;
                })
                .map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="px-3 py-2 rounded-lg text-sm font-medium text-slate-700 transition-all duration-150 hover:bg-blue-50 hover:text-blue-600"
                  >
                    {item.label}
                  </Link>
                ))}

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((c) => !c)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-100"
                >
                  <span className="sr-only">Abrir menú de usuario</span>
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-3 w-56 rounded-3xl border border-slate-200 bg-white p-3 shadow-xl">
                    <div className="mb-3 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                      {session?.nombre || session?.numero_empleado || "Usuario"}
                      <div className="text-xs text-slate-500 mt-1">Nivel {session?.nivel_jerarquia ?? "?"} • {session?.rol ?? "Sin rol"}</div>
                    </div>

                    {isAdmin && (
                      <Link href="/settings" onClick={() => setUserMenuOpen(false)} className="block rounded-2xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">
                        Configuración
                      </Link>
                    )}

                    <Link href="/profile" onClick={() => setUserMenuOpen(false)} className="block rounded-2xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">
                      Mi perfil
                    </Link>

                    <button type="button" onClick={handleLogout} className="mt-2 w-full rounded-2xl bg-slate-100 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-200">
                      Cerrar sesión
                    </button>
                  </div>
                )}
              </div>
            </nav>
          )}

          {/* Login link when no session */}
          {!session && (
            <Link href="/login" className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-sky-700">
              Ingresar
            </Link>
          )}

          {/* Mobile controls: only show when session exists */}
          {session && (
            <div className="md:hidden flex flex-wrap items-center gap-2 justify-end w-full">
              <div className="relative">
                <button
                  type="button"
                  aria-expanded={userMenuOpen}
                  aria-label="Abrir menú de usuario"
                  onClick={() => {
                    setUserMenuOpen((c) => !c);
                    setOpen(false);
                  }}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-white/80 p-2 text-slate-700 shadow-sm ring-1 ring-slate-100 hover:bg-white"
                >
                  <span className="sr-only">Abrir menú de usuario</span>
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 top-full z-50 mt-2 w-52 rounded-3xl border border-slate-200 bg-white p-3 shadow-xl">
                    {isAdmin && (
                      <Link href="/settings" onClick={() => setUserMenuOpen(false)} className="block rounded-2xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">
                        Configuración
                      </Link>
                    )}

                    <Link href="/profile" onClick={() => setUserMenuOpen(false)} className="block rounded-2xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">
                      Mi perfil
                    </Link>

                    <button type="button" onClick={() => { setUserMenuOpen(false); handleLogout(); }} className="mt-2 w-full rounded-2xl bg-slate-100 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-200">
                      Cerrar sesión
                    </button>
                  </div>
                )}
              </div>

              <button aria-expanded={open} aria-label="Abrir menú" onClick={() => setOpen((s) => !s)} className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-white/80 p-2 text-slate-700 shadow-sm ring-1 ring-slate-100 hover:bg-white">
                <span className="sr-only">Abrir menú</span>
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  {open ? (
                    <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          )}

          {/* Mobile login button when no session */}
          {!session && (
            <Link href="/login" className="md:hidden inline-flex h-10 min-w-[8rem] items-center justify-center rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-sky-700">
              Ingresar
            </Link>
          )}
        </div>

        {/* Mobile menu card (left) with animation */}
        <div className="md:hidden fixed inset-0 z-40 pointer-events-none">
          {/* Backdrop */}
          {open && (
            <button aria-label="Cerrar menú" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/20 backdrop-blur-sm pointer-events-auto transition-opacity duration-300" />
          )}

          {/* Menu Card */}
          <aside className={`fixed right-0 top-16 h-[calc(100vh-4rem)] w-72 max-w-[90vw] bg-white shadow-2xl rounded-l-2xl border border-slate-200 p-6 transform transition-all duration-300 ease-out pointer-events-auto overflow-y-auto ${open ? "translate-x-0 opacity-100 visible" : "translate-x-full opacity-0 invisible"}`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-slate-900">Navegación</h2>
              <button aria-label="Cerrar menú" onClick={() => setOpen(false)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>

            <nav className="flex flex-col gap-1">
              {navItems.filter((item) => {
                const userLevel = session?.nivel_jerarquia ?? 99;
                return userLevel <= item.minLevel;
              }).map((item) => (
                <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="px-4 py-3 rounded-lg text-sm font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors duration-150">{item.label}</Link>
              ))}

              {session ? (
                <>
                  {isAdmin && (
                    <Link href="/settings" onClick={() => setOpen(false)} className="px-4 py-3 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors duration-150">Configuración</Link>
                  )}
                  <Link href="/profile" onClick={() => setOpen(false)} className="px-4 py-3 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors duration-150">Mi perfil</Link>
                  <button type="button" onClick={() => { setOpen(false); handleLogout(); }} className="px-4 py-3 rounded-lg text-left text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors duration-150">Cerrar sesión</button>
                </>
              ) : (
                <Link href="/login" onClick={() => setOpen(false)} className="px-4 py-3 rounded-lg text-sm font-medium text-sky-700 hover:bg-sky-50 transition-colors duration-150">Ingresar</Link>
              )}
            </nav>
          </aside>
        </div>

        {/* Prevent body scrolling when panel is open */}
        {typeof window !== "undefined" && (
          <BodyScrollLock open={open} />
        )}
      </div>
    </header>
  );
}

function BodyScrollLock({ open }: { open: boolean }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    if (open) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);
  return null;
}
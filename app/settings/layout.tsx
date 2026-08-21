"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getEmployeeSession } from "@/lib/employeeSession";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState(() => getEmployeeSession());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const current = getEmployeeSession();
    if (!current) {
      router.replace("/login");
      return;
    }
    setSession(current);
  }, [router]);

  const isActive = (path: string) => pathname === path;

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* SIDEBAR PARA ESCRITORIO */}
      <aside className="w-72 border-r border-slate-200/80 bg-white p-6 hidden md:flex flex-col justify-between shadow-sm">
        <div>
          {/* Cabecera del Sidebar */}
          <div className="mb-8 px-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 bg-purple-50 px-2.5 py-1 rounded-md border border-purple-100">
              Administración
            </span>
            <h2 className="text-xl font-bold text-slate-900 mt-2">Panel de Control</h2>
            <p className="text-xs text-slate-500 mt-0.5">Gestión interna y accesos</p>
          </div>

          {/* Menú de Navegación */}
          <nav className="space-y-6">
            {session?.nivel_jerarquia === 1 && (
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-2">Módulos</p>
                <div className="space-y-1.5">
                  <div className="rounded-2xl bg-purple-50/80 border border-purple-100 p-3.5 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-purple-900">
                      <span>⚙️</span> Configuración
                    </div>
                    <nav className="pl-4 space-y-1 border-l-2 border-purple-200 ml-2">
                      <Link 
                        href="/settings" 
                        className={`block rounded-xl px-3 py-2 text-xs font-medium transition-all ${
                          isActive("/settings") 
                            ? "bg-purple-600 text-white shadow-sm shadow-purple-600/20 font-semibold" 
                            : "text-slate-600 hover:bg-purple-100/50 hover:text-purple-900"
                        }`}
                      >
                        General
                      </Link>
                      <Link 
                        href="/settings/usuarios" 
                        className={`block rounded-xl px-3 py-2 text-xs font-medium transition-all ${
                          isActive("/settings/usuarios") 
                            ? "bg-purple-600 text-white shadow-sm shadow-purple-600/20 font-semibold" 
                            : "text-slate-600 hover:bg-purple-100/50 hover:text-purple-900"
                        }`}
                      >
                        Usuarios y Permisos
                      </Link>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </nav>
        </div>

        {/* Tarjeta inferior de sesión */}
        <div className="pt-4 border-t border-slate-100 px-2">
          <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-200/60">
            <div>
              <p className="text-xs font-bold text-slate-800 truncate max-w-[120px]">
                {session?.nombre || "Colaborador"}
              </p>
              <p className="text-[10px] text-slate-500 font-medium">Nivel {session?.nivel_jerarquia ?? "?"}</p>
            </div>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/10"></span>
          </div>
        </div>
      </aside>

      {/* CONTENEDOR PRINCIPAL */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* BARRA SUPERIOR MÓVIL (Visible solo en pantallas chicas) */}
        <header className="md:hidden flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-purple-700 font-bold text-base">⚙️ Panel</span>
          </div>
          <button 
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm"
          >
            {mobileMenuOpen ? "✕ Cerrar" : "☰ Menú"}
          </button>
        </header>

        {/* MENÚ MÓVIL DESPLEGABLE */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-slate-200 p-4 space-y-3 shadow-lg z-20">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Módulos</p>
            <div className="space-y-1">
              <Link 
                href="/settings" 
                onClick={() => setMobileMenuOpen(false)}
                className={`block rounded-xl px-4 py-2.5 text-sm font-medium ${isActive("/settings") ? "bg-purple-600 text-white" : "text-slate-700 hover:bg-slate-100"}`}
              >
                General
              </Link>
              <Link 
                href="/settings/usuarios" 
                onClick={() => setMobileMenuOpen(false)}
                className={`block rounded-xl px-4 py-2.5 text-sm font-medium ${isActive("/settings/usuarios") ? "bg-purple-600 text-white" : "text-slate-700 hover:bg-slate-100"}`}
              >
                Usuarios y Permisos
              </Link>
            </div>
          </div>
        )}

        {/* CONTENIDO DE LA PÁGINA */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
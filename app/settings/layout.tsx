"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getEmployeeSession } from "@/lib/employeeSession";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [session, setSession] = useState(() => getEmployeeSession());

  useEffect(() => {
    const current = getEmployeeSession();
    if (!current) {
      router.replace("/login");
      return;
    }
    setSession(current);
  }, [router]);

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <aside className="w-64 border-r border-slate-200 bg-white p-6 hidden md:block">
        <div className="mb-8">
          <h2 className="text-xl font-bold text-purple-700">Panel de control</h2>
          <p className="text-xs text-slate-400 mt-1">Nivel {session?.nivel_jerarquia ?? "?"}</p>
        </div>

        <nav className="space-y-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Módulos</p>

          {session?.nivel_jerarquia === 1 && (
            <div>
              <div className="rounded-xl bg-purple-50 p-3 text-sm font-medium text-purple-700">⚙️ Configuración / Permisos</div>
              <nav className="mt-3 space-y-2">
                <Link href="/settings" className="block rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">General</Link>
                <Link href="/settings/usuarios" className="block rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">Usuarios</Link>
              </nav>
            </div>
          )}
        </nav>
      </aside>

      <main className="flex-1 p-6 sm:p-8">
        {children}
      </main>
    </div>
  );
}

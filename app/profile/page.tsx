"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getEmployeeSession, saveEmployeeSession, clearEmployeeSession } from "@/lib/employeeSession";

export default function ProfilePage() {
  const router = useRouter();
  const [session, setSession] = useState(() => getEmployeeSession());
  const [nombre, setNombre] = useState(session?.nombre ?? "");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const current = getEmployeeSession();
    if (!current) {
      router.replace("/login");
      return;
    }
    setSession(current);
    setNombre(current.nombre ?? "");
  }, [router]);

  const handleSave = () => {
    if (!session) return;

    const updated = {
      ...session,
      // Mantenemos el número de empleado intacto y limpiamos los espacios del nombre
      nombre: nombre.trim() || session.numero_empleado,
    };

    saveEmployeeSession(updated);
    setSession(updated);
    setMessage("Perfil actualizado correctamente.");
  };

  const handleLogout = () => {
    clearEmployeeSession();
    router.push("/login");
  };

  if (!session) {
    return null;
  }

  return (
    <main className="min-h-screen p-6 sm:p-8 bg-slate-50 text-slate-900">
      <div className="max-w-3xl mx-auto space-y-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-2xl font-semibold text-emerald-800">
              {session.nombre?.charAt(0).toUpperCase() ?? session.numero_empleado.charAt(0)}
            </div>
            <div>
              <h1 className="text-3xl font-semibold text-slate-900">Mi perfil</h1>
              <p className="text-sm text-slate-600">Revisa tu sesión activa y actualiza tu nombre visible.</p>
            </div>
          </div>

          <div className="mt-8 space-y-6">
            {/* Campo Deshabilitado (Solo Lectura) */}
            <div>
              <label className="block text-sm font-medium text-slate-400">Código de empleado (No modificable)</label>
              <input
                type="text"
                value={session.numero_empleado}
                disabled
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-400 cursor-not-allowed outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Nombre visible</label>
              <input
                type="text"
                value={nombre}
                onChange={(event) => setNombre(event.target.value)}
                placeholder="Ej. Ana García"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={handleSave}
                className="rounded-full bg-emerald-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-900"
              >
                Guardar cambios
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Cerrar sesión
              </button>
            </div>

            {message && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {message}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
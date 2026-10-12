"use client";

import Image from "next/image";
import { ChangeEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getEmployeeSession, saveEmployeeSession, clearEmployeeSession } from "@/lib/employeeSession";

export default function ProfilePage() {
  const router = useRouter();
  const [session, setSession] = useState(() => getEmployeeSession());
  const [nombre, setNombre] = useState(session?.nombre ?? "");
  const [telefono, setTelefono] = useState(session?.telefono ?? "");
  const [email, setEmail] = useState(session?.email ?? "");
  const [foto, setFoto] = useState(session?.foto ?? "");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!session) {
      router.replace("/login");
    }
  }, [router, session]);

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      setFoto(result);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!session) return;

    const updated = {
      ...session,
      nombre: nombre.trim() || session.numero_empleado,
      telefono: telefono.trim(),
      email: email.trim(),
      foto: foto.trim(),
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
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900 sm:p-8">
      <div className="mx-auto max-w-3xl space-y-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-emerald-100 text-2xl font-semibold text-emerald-800">
              {foto ? (
                <Image src={foto} alt="Foto de perfil" fill unoptimized className="object-cover" />
              ) : (
                <span>{session.nombre?.charAt(0).toUpperCase() ?? session.numero_empleado.charAt(0)}</span>
              )}
            </div>
            <div>
              <h1 className="text-3xl font-semibold text-slate-900">Mi perfil</h1>
              <p className="text-sm text-slate-600">Revisa tu sesión activa y actualiza tu información visible.</p>
            </div>
          </div>

          <div className="mt-8 space-y-6">
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4">
              <label className="flex cursor-pointer items-center justify-between gap-3 text-sm font-medium text-slate-700">
                <span>Foto de perfil</span>
                <span className="rounded-full bg-emerald-800 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white">
                  Subir imagen
                </span>
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="mt-3 block w-full text-sm text-slate-500 file:mr-4 file:rounded-full file:border-0 file:bg-emerald-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-emerald-800 hover:file:bg-emerald-200"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400">Código de empleado (No modificable)</label>
              <input
                type="text"
                value={session.numero_empleado}
                disabled
                className="mt-2 w-full cursor-not-allowed rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-400 outline-none"
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

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">Teléfono</label>
                <input
                  type="tel"
                  value={telefono}
                  onChange={(event) => setTelefono(event.target.value)}
                  placeholder="Ej. 55 1234 5678"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Correo electrónico</label>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Ej. ana@empresa.com"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                />
              </div>
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
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { clearEmployeeSession, getEmployeeSession, saveEmployeeSession } from "@/lib/employeeSession";
import { validateEmpleadoLoginAction } from "@/components/actions/auth.actions";

export default function LoginPage() {
  const router = useRouter();
  const [codigo, setCodigo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const current = getEmployeeSession();
    if (!current) return;

    let active = true;
    validateEmpleadoLoginAction(current.numero_empleado)
      .then(() => {
        if (active) router.replace("/inventario");
      })
      .catch((err: unknown) => {
        clearEmployeeSession();
        if (active) {
          setError(err instanceof Error ? err.message : "No se pudo validar la sesión.");
        }
      });

    return () => {
      active = false;
    };
  }, [router]);

  async function handleLogin() {
    const empleadoCode = codigo.trim();

    if (!empleadoCode) {
      setError("Ingresa el código de empleado del gafete.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const perfil = await validateEmpleadoLoginAction(empleadoCode);
      saveEmployeeSession({
        numero_empleado: perfil.numero_empleado ?? empleadoCode,
        nombre: perfil.nombre ?? perfil.numero_empleado ?? empleadoCode,
        cargo: perfil.cargo ?? undefined,
        rol: perfil.rol ?? undefined,
        nivel_jerarquia: perfil.nivel_jerarquia ?? undefined,
        telefono: perfil.telefono ?? "",
        email: "",
        foto: "",
        loggedAt: new Date().toISOString(),
      });
      router.push("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#ecfdf5,#f8fafc_60%,#fffbeb)] px-4 py-8">
      <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white/90 p-6 shadow-[0_20px_70px_rgba(15,23,42,0.12)] backdrop-blur sm:p-8">
        <div className="text-center">
          <Image
            src="/logo-mlopez.png"
            alt="Logotipo de M. López"
            width={80}
            height={80}
            className="mx-auto mb-4 h-20 w-20 rounded-2xl object-contain"
            priority
          />
          <h1 className="text-2xl font-semibold text-slate-900">Ingreso al Panel de control</h1>
          <p className="mt-2 text-sm text-slate-600">
            Escanea o escribe el código de la tarjeta del empleado para entrar.
          </p>
        </div>

        <div className="mt-8 space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Código de empleado</span>
            <input
              type="text"
              value={codigo}
              onChange={(event) => setCodigo(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleLogin();
              }}
              placeholder="Ej. EMP-001"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
            />
          </label>

          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <button
            type="button"
            onClick={handleLogin}
            disabled={loading}
            className="w-full rounded-full bg-emerald-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Entrar al sistema"}
          </button>
        </div>

        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Usa las credenciales creadas desde la sección de usuarios o un administrador directo.
        </div>
      </div>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getEmployeeSession } from "@/lib/employeeSession";

// Definición de tipos para claridad del código
interface Usuario {
  id: number;
  nombre: string;
  rol: string;
  nivel_jerarquia: number;
}

export default function SettingsPage() {
  const router = useRouter();
  // Inicializamos en null para evitar advertencias de hidratación en Next.js
  const [session, setSession] = useState<any>(null);

  // 1. Estado para simular nuestra base de datos de usuarios
  const [usuarios, setUsuarios] = useState<Usuario[]>([
    { id: 1, nombre: "Alejandro Pérez", rol: "Administrador", nivel_jerarquia: 1 },
    { id: 2, nombre: "María López", rol: "Supervisor", nivel_jerarquia: 2 },
    { id: 3, nombre: "Carlos Ruiz", rol: "Operador", nivel_jerarquia: 3 },
  ]);

  useEffect(() => {
    const current = getEmployeeSession();
    if (!current) {
      router.replace("/login");
      return;
    }
    if (current.nivel_jerarquia !== 1) {
      router.replace("/dashboard");
      return;
    }
    setSession(current);
  }, [router]);

  // 2. Función para actualizar el nivel de un usuario
  const handleCambiarNivel = (id: number, nuevoNivel: number) => {
    setUsuarios((prevUsuarios) =>
      prevUsuarios.map((user) => {
        if (user.id === id) {
          // Asignamos un rol automático según el nivel seleccionado
          let nuevoRol = "Operador";
          if (nuevoNivel === 1) nuevoRol = "Administrador";
          if (nuevoNivel === 2) nuevoRol = "Supervisor";

          return { ...user, nivel_jerarquia: nuevoNivel, rol: nuevoRol };
        }
        return user;
      })
    );

    // NOTA: Aquí realizarías la llamada a la base de datos (Supabase / API)
  };

  if (!session) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-transparent text-slate-900">
      {/* CONTENIDO PRINCIPAL DE LA PÁGINA */}
      <main className="flex-1 p-6 sm:p-8">
        <div className="mx-auto max-w-5xl space-y-6 sm:space-y-8">
          
          <section className="rounded-3xl border border-emerald-100 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-semibold text-slate-900">Configuración de permisos</h1>
                <p className="mt-2 text-slate-600">
                  Administra el acceso a módulos sensibles. Solo usuarios con nivel jerárquico 1 pueden ver esta página.
                </p>
              </div>
              <div className="rounded-3xl bg-slate-50 px-4 py-3 text-sm text-slate-700 border border-slate-200 flex flex-wrap gap-x-3">
                <span>Tu nivel: <strong>{session.nivel_jerarquia}</strong></span>
                <span className="text-slate-300">|</span>
                <span>Rol: <strong>{session.rol ?? "Desconocido"}</strong></span>
              </div>
            </div>

            {/* TABLA DE GESTIÓN DE USUARIOS Y SUS PERMISOS */}
            <div className="mt-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Control de Usuarios del Sistema</h2>
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-emerald-50/70 text-xs uppercase text-emerald-950/80 border-b border-emerald-100">
                    <tr>
                      <th className="px-6 py-4">Usuario</th>
                      <th className="px-6 py-4">Rol Asignado</th>
                      <th className="px-6 py-4">Nivel de Jerarquía</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {usuarios.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50 transition">
                        <td className="px-6 py-4 font-medium text-slate-900">{user.nombre}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            user.nivel_jerarquia === 1 ? 'bg-emerald-100 text-emerald-800' :
                            user.nivel_jerarquia === 2 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-800'
                          }`}>
                            {user.rol}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <select
                            value={user.nivel_jerarquia}
                            onChange={(e) => handleCambiarNivel(user.id, Number(e.target.value))}
                            className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                          >
                            <option value={1}>Nivel 1 (Acceso Total)</option>
                            <option value={2}>Nivel 2 (Acceso Operativo)</option>
                            <option value={3}>Nivel 3 (Acceso Básico)</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* REGLAS INFORMATIVAS */}
            <div className="mt-8 rounded-3xl border border-emerald-200 bg-emerald-50/70 p-5">
              <h3 className="text-lg font-semibold text-emerald-950">¿Cómo funcionan estos permisos en el menú?</h3>
              <ul className="mt-4 space-y-3 text-sm text-slate-700">
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-700"></span>
                  <strong>Nivel 1:</strong> Visualiza el panel lateral completo (Dashboard, Reportes, Configuración).
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <strong>Nivel 2:</strong> Visualiza únicamente Dashboard y Reportes Operativos.
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                  <strong>Nivel 3:</strong> Solo puede ver el Dashboard básico.
                </li>
              </ul>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
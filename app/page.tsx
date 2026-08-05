"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { getEmployeeSession } from "@/lib/employeeSession";
import { EmployeeSession } from "@/lib/employeeSession";
import { fetchTarimas } from "@/services/tarimas";
import { fetchInventoryItems } from "@/services/inventario";
import { fetchMovimientos } from "@/services/movimientos";

// 🚀 Server Action para conteo exacto de lotes en la BD
import { getLotesCountByEstadoAction } from "@/components/actions/lotes.actions"; 

const Icons = {
  tarima: "📦",
  kilo: "❄️",
  lote: "📊",
  movimiento: "🔄",
  inventario: "📈",
  usuario: "👤",
  clock: "⏰",
  checkmark: "✅",
  downloading: "⏳", 
};

export default function Home() {
  const [session, setSession] = useState<EmployeeSession | null>(null);
  const [stats, setStats] = useState({
    kilosDisponibles: 0,
    kilosCuartoFrio: 0,
    lotesPorDescargar: 0, 
    lotesDescargados: 0,  
    movimientos: 0,
  });
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true);
        
        const [tarimas, inventory, movimientos, conteoLotes] = await Promise.all([
          fetchTarimas(),
          fetchInventoryItems(),
          fetchMovimientos(),
          getLotesCountByEstadoAction(),
        ]);

        const kilosNetos = movimientos.reduce((acc, m) => {
          const kilos = Number(m.kilos || 0);
          if ((m.tipo || "").toLowerCase() === "entrada") return acc + kilos;
          if ((m.tipo || "").toLowerCase() === "salida") return acc - kilos;
          return acc + kilos;
        }, 0);

        const totalKilos = movimientos.length ? kilosNetos : tarimas.reduce((sum, t) => sum + (t.weight || 0), 0);

        const kilosCuartoFrio = movimientos
          .filter((m) => (m.ubicacion || "").toLowerCase().includes("cuarto frio") || (m.ubicacion || "").toLowerCase().includes("cuarto frío"))
          .reduce((acc, m) => {
            const kilos = Number(m.kilos || 0);
            return (m.tipo || "").toLowerCase() === "salida" ? acc - kilos : acc + kilos;
          }, 0);

        setStats({
          kilosDisponibles: Math.max(0, Math.round(totalKilos)),
          kilosCuartoFrio: Math.max(0, Math.round(kilosCuartoFrio)),
          lotesPorDescargar: conteoLotes.porDescargar, 
          lotesDescargados: conteoLotes.descargados,   
          movimientos: movimientos.length,
        });

      } catch (error) {
        console.error("Error loading stats:", error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  const isAdmin = Number(session?.nivel_jerarquia) === 1;
  const isSupervisor = Number(session?.nivel_jerarquia) === 2;

  const quickLinks = [
    { href: "/inventario", label: "Nuevo Inventario", icon: "📝", color: "blue", show: true },
    { href: "/lotes", label: "Ver Lotes", icon: "📋", color: "purple", show: true },
    { href: "/movimientos", label: "Registrar Movimiento", icon: "➕", color: "green", show: true },
    { href: "/tarimas", label: "Gestionar Tarimas", icon: "🎯", color: "orange", show: true },
    { href: "/repostes", label: "Reportes", icon: "📊", color: "red", show: isAdmin || isSupervisor },
    { href: "/settings/usuarios", label: "Usuarios", icon: "👥", color: "indigo", show: isAdmin },
  ];

  const colorClasses: Record<string, string> = {
    blue: "from-blue-500 to-blue-600 hover:shadow-blue-500/50",
    purple: "from-purple-500 to-purple-600 hover:shadow-purple-500/50",
    green: "from-green-500 to-green-600 hover:shadow-green-500/50",
    orange: "from-orange-500 to-orange-600 hover:shadow-orange-500/50",
    red: "from-red-500 to-red-600 hover:shadow-red-500/50",
    indigo: "from-indigo-500 to-indigo-600 hover:shadow-indigo-500/50",
  };

  return (
    <main className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
        
        {/* Bienvenida */}
        <div className="mb-6 sm:mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-5 sm:p-8 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl sm:text-4xl font-bold text-slate-900 tracking-tight break-words">
                  Hola, {session?.nombre || session?.numero_empleado || "Usuario"} 👋
                </h1>
                <p className="text-slate-600 mt-1 sm:mt-2 text-base sm:text-lg">
                  Bienvenido a Control de Almacén
                </p>
              </div>
              <div className="hidden md:block text-6xl opacity-20 select-none">📦</div>
            </div>

            {/* Información de usuario responsiva (Adaptada a 3 columnas) */}
            {session && (
              <div className="mt-5 sm:mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Rol</p>
                  <p className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5 truncate">{session.rol || "N/A"}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Número de Empleado</p>
                  <p className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5">{session.numero_empleado}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Estado</p>
                  <p className="text-lg sm:text-xl font-bold text-green-600 flex items-center gap-2 mt-0.5">
                    {Icons.checkmark} Activo
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* KPIs Grid Adaptable (1 col en móvil, 2 en tablet, 4 en PC) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8 sm:mb-10">
          {[
            { icon: Icons.kilo, label: "Kilos Disponibles (Total)", value: loading ? "..." : `${stats.kilosDisponibles} Kg`, color: "blue" },
            { icon: Icons.kilo, label: "Kilos en Cuarto Frío", value: loading ? "..." : `${stats.kilosCuartoFrio} Kg`, color: "green" },
            { icon: Icons.downloading, label: "Lotes Por Descargar", value: loading ? "..." : stats.lotesPorDescargar, color: "orange" },
            { icon: Icons.lote, label: "Lotes Descargados", value: loading ? "..." : stats.lotesDescargados, color: "purple" },
          ].map((stat, idx) => (
            <div key={idx} className="bg-white rounded-2xl shadow-sm p-5 sm:p-6 border border-slate-200 hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-slate-500 text-xs sm:text-sm font-medium truncate">{stat.label}</p>
                  <p className={`text-2xl sm:text-3xl lg:text-4xl font-bold mt-1 tracking-tight truncate ${
                    stat.color === "green" ? "text-green-600" : 
                    stat.color === "blue" ? "text-blue-600" : 
                    stat.color === "purple" ? "text-purple-600" : "text-orange-600"
                  }`}>
                    {stat.value}
                  </p>
                </div>
                <div className="text-4xl sm:text-5xl opacity-25 shrink-0 select-none">{stat.icon}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Acciones Rápidas (Grid auto-adaptable con control de desborde de texto) */}
        <div className="mb-8 sm:mb-10">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-4 sm:mb-6">Acciones Rápidas</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {quickLinks
              .filter((link) => link.show)
              .map((link, idx) => (
                <Link
                  key={idx}
                  href={link.href}
                  className={`group bg-linear-to-r ${colorClasses[link.color]} text-white rounded-xl p-4 sm:p-6 shadow-md hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer`}
                >
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <span className="text-3xl sm:text-4xl shrink-0 select-none">{link.icon}</span>
                    <span className="font-semibold text-base sm:text-lg tracking-wide truncate group-hover:scale-[1.02] transition-transform duration-200">
                      {link.label}
                    </span>
                  </div>
                </Link>
              ))}
          </div>
        </div>

        {/* Información del sistema (Colapsa a 1 columna en móvil de manera limpia) */}
        <div className="bg-white rounded-2xl shadow-sm p-5 sm:p-6 border border-slate-200">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-4">Información del Sistema</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 text-xs sm:text-sm">
            <div className="border-b sm:border-b-0 sm:border-r border-slate-100 pb-3 sm:pb-0 sm:pr-4">
              <p className="text-slate-400 font-medium mb-1">Última Sesión</p>
              <p className="text-slate-800 font-semibold truncate">
                {session?.loggedAt ? new Date(session.loggedAt).toLocaleString("es-MX") : "N/A"}
              </p>
            </div>
            <div className="border-b sm:border-b-0 sm:border-r border-slate-100 pb-3 sm:pb-0 sm:pr-4">
              <p className="text-slate-400 font-medium mb-1">Módulos Disponibles</p>
              <p className="text-slate-800 font-semibold">7 módulos</p>
            </div>
            <div>
              <p className="text-slate-400 font-medium mb-1">Estado</p>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shrink-0"></div>
                <p className="text-slate-800 font-semibold">En línea</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}
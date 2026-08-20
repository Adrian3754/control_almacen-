"use client";

import { useEffect, useState } from "react";
import { getReportesAction, type Reporte } from "@/components/actions/reportes.actions";
import ModalCorteDiario from "@/components/ui/forms/ModalCorteDiario";

export default function ReportesPage() {
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [totals, setTotals] = useState({ tarimas: 0, peso: 0, movimientos: 0 });
  const [loading, setLoading] = useState(true);
  const [filtroActivo, setFiltroActivo] = useState<"todos" | "7dias" | "mes">("todos");
  const [cortes, setCortes] = useState<any[]>([]);
  const [loadingCortes, setLoadingCortes] = useState(true);

  // 1. Estado para controlar la visibilidad del modal de cierre
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadReportes() {
      try {
        setLoading(true);
        const data = await getReportesAction(filtroActivo);
        if (mounted) {
          setReportes(data.reportes);
          setTotals(data.totals);
        }
      } catch (err) {
        console.error("Error al sincronizar reportes:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    async function loadCortes() {
      try {
        setLoadingCortes(true);
        const res = await fetch("/api/cortes");
        const json = await res.json();
        if (json.ok) {
          setCortes(json.data || []);
        }
      } catch (err) {
        console.error("Error al cargar cortes:", err);
        setCortes([]);
      } finally {
        setLoadingCortes(false);
      }
    }

    loadReportes();
    loadCortes();
    return () => {
      mounted = false;
    };
  }, [filtroActivo]);

  // Función para refrescar los datos de la tabla tras finalizar con éxito el corte diario
  const handleCorteExitoso = () => {
    setIsModalOpen(false);
    // Vuelve a disparar la consulta para traer los paneles actualizados / vacíos de la planta
    setFiltroActivo((prev) => (prev === "todos" ? "todos" : "todos")); 
  };

  return (
    <main className="min-h-screen bg-transparent">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        
        {/* Encabezado Principal */}
        <section className="mb-6 rounded-2xl bg-slate-50 border border-slate-200 p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-xl sm:text-3xl font-bold text-slate-900 tracking-tight">Reportes de Almacén</h1>
              <p className="mt-1 text-sm text-slate-600">
                Monitorea el flujo de tarimas creadas, pesajes acumulados y movimientos logísticos de la fruta.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {/* 2. 🔥 BOTÓN DE CIERRE GENERAL: Abre la secuencia del modal con un aviso visual */}
              <button 
                onClick={() => setIsModalOpen(true)}
                className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 active:scale-98 shadow-xs flex items-center gap-2"
              >
                <span>🔒</span> Realizar Corte Diario
              </button>
              
              <button className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 active:scale-98">
                Exportar PDF
              </button>
              <button className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 active:scale-98">
                Exportar Excel
              </button>
            </div>
          </div>
        </section>

        {/* Tarjetas de Indicadores Clave */}
        <section className="grid gap-4 grid-cols-1 md:grid-cols-3 mb-6">
          <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs">
            <p className="text-xs sm:text-sm font-medium text-slate-500 uppercase tracking-wider">Tarimas generadas</p>
            <p className="mt-2 text-2xl sm:text-3xl font-bold text-slate-900">{totals.tarimas}</p>
          </div>
          <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs">
            <p className="text-xs sm:text-sm font-medium text-slate-500 uppercase tracking-wider">Kilos movidos</p>
            <p className="mt-2 text-2xl sm:text-3xl font-bold text-amber-600">{totals.peso.toLocaleString("es-MX")} Kg</p>
          </div>
          <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs">
            <p className="text-xs sm:text-sm font-medium text-slate-500 uppercase tracking-wider">Movimientos totales</p>
            <p className="mt-2 text-2xl sm:text-3xl font-bold text-emerald-600">{totals.movimientos}</p>
          </div>
        </section>

        {/* Tabla Dinámica */}
        <section className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-6 shadow-xs">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">Historial Reciente</h2>
              <p className="text-xs sm:text-sm text-slate-500">Últimos informes e incidencias generadas en planta.</p>
            </div>

            {/* Filtros por Rango de Fecha */}
            <div className="flex flex-wrap gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200 self-start md:self-auto">
              <button
                onClick={() => setFiltroActivo("todos")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${filtroActivo === "todos" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
              >
                Todos
              </button>
              <button
                onClick={() => setFiltroActivo("7dias")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${filtroActivo === "7dias" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
              >
                Últimos 7 días
              </button>
              <button
                onClick={() => setFiltroActivo("mes")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${filtroActivo === "mes" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
              >
                Este mes
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs sm:text-sm">
              <thead className="bg-slate-800 text-white select-none">
                <tr>
                  <th className="px-4 py-3 font-medium tracking-wide">ID</th>
                  <th className="px-4 py-3 font-medium tracking-wide">Fecha</th>
                  <th className="px-4 py-3 font-medium tracking-wide">Tipo de Registro</th>
                  <th className="px-4 py-3 font-medium tracking-wide">Total Acumulado</th>
                  <th className="px-4 py-3 font-medium tracking-wide">Descripción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-slate-400 font-medium">Cargando informes de almacén...</td>
                  </tr>
                ) : reportes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-slate-400">No hay reportes registrados para este periodo.</td>
                  </tr>
                ) : (
                  reportes.map((reporte) => (
                    <tr key={reporte.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3.5 font-bold text-slate-900"># {reporte.id}</td>
                      <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">{reporte.fecha}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold ${
                          reporte.tipo === "Tarimas" ? "bg-blue-50 text-blue-700 border border-blue-100" :
                          reporte.tipo === "Peso" ? "bg-amber-50 text-amber-700 border border-amber-100" :
                          "bg-emerald-50 text-emerald-700 border border-emerald-100"
                        }`}>
                          {reporte.tipo}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-slate-800">
                        {reporte.tipo === "Peso" ? `${reporte.total.toLocaleString("es-MX")} Kg` : reporte.total}
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 min-w-[200px]">{reporte.descripcion}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-8 rounded-2xl bg-white border border-slate-200 p-4 sm:p-6 shadow-xs">
          <div className="mb-5">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">Cortes realizados</h2>
            <p className="text-xs sm:text-sm text-slate-500">Historial de los cortes de producción ya efectuados.</p>
          </div>

          {loadingCortes ? (
            <div className="text-sm text-slate-500">Cargando cortes...</div>
          ) : cortes.length === 0 ? (
            <div className="text-sm text-slate-500">No hay cortes realizados todavía.</div>
          ) : (
            <div className="space-y-4">
              {cortes.map((corte) => (
                <div key={corte.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-800">Corte #{corte.id}</p>
                      <p className="text-xs text-slate-500">{new Date(corte.fecha_corte).toLocaleString("es-MX")}</p>
                    </div>
                    <div className="flex gap-3 text-sm">
                      <span className="rounded-full bg-emerald-100 text-emerald-700 px-2.5 py-1 font-semibold">{Number(corte.total_kilos || 0).toFixed(2)} kg</span>
                      <span className="rounded-full bg-slate-200 text-slate-700 px-2.5 py-1 font-semibold">{Number(corte.total_movimientos || 0)} movimientos</span>
                    </div>
                  </div>

                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden bg-slate-100 text-slate-800">
                      <thead className="bg-slate-800 text-white">
                        <tr>
                          <th className="px-3 py-2">Operador</th>
                          <th className="px-3 py-2">Pesajes</th>
                          <th className="px-3 py-2">Total KG</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-300 bg-slate-100 text-slate-800">
                        {(() => {
                          const resumenPorOperador = new Map<string, { count: number; peso: number }>();

                          for (const item of corte.detalle_pesajes || []) {
                            const nombre = item.nombre || "Sin nombre";
                            const actual = resumenPorOperador.get(nombre) || { count: 0, peso: 0 };
                            actual.count += 1;
                            actual.peso += Number(item.peso || 0);
                            resumenPorOperador.set(nombre, actual);
                          }

                          return Array.from(resumenPorOperador.entries()).map(([nombre, valores]) => (
                            <tr key={`${corte.id}-${nombre}`} className="hover:bg-slate-200">
                              <td className="px-3 py-2 text-slate-800">{nombre}</td>
                              <td className="px-3 py-2 font-semibold text-slate-800">{valores.count}</td>
                              <td className="px-3 py-2 font-semibold text-slate-800">{Number(valores.peso).toFixed(2)} kg</td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      <ModalCorteDiario
        isOpen={isModalOpen}
        onClose={handleCorteExitoso}
        datosSugeridos={{
          lotesContados: (totals as any).lotesContados || 0, // 👈 Ahora viene directo, limpio y sin filtros raros
          kilosMuestreados: totals.peso,
          tarimasCreadas: totals.tarimas,
          movimientosRegistrados: totals.movimientos,
        }}
      />

      </div>
    </main>
  );
}
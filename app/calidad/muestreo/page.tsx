"use client";

import { useEffect, useMemo, useState } from "react";
import { getMuestreosAction, type MuestreoItem } from "@/components/actions/calidad.actions"; 
import CalidadForm from "@/components/ui/forms/CalidadForm"; 

export default function ControlCalidadPage() {
  const [items, setItems] = useState<MuestreoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadItems() {
      try {
        setLoading(true);
        const data = await getMuestreosAction();
        if (mounted) {
          setItems(data);
        }
      } catch (err) {
        console.error("Error cargando historial de muestreos:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadItems();
    return () => {
      mounted = false;
    };
  }, []);

  const stats = useMemo(() => {
    const totalMuestreos = items.length;
    
    // Cálculos para el porcentaje bueno
    const sumaPorcentajeBueno = items.reduce((acc, item) => acc + (item.porcentajeBueno || 0), 0);
    const promedioCalidadBueno = totalMuestreos > 0 ? (sumaPorcentajeBueno / totalMuestreos).toFixed(1) : "0";
    
    // 👇 Nuevos cálculos para el porcentaje malo (merma)
    const sumaPorcentajeMalo = items.reduce((acc, item) => acc + (item.porcentajeMalo || 0), 0);
    const promedioCalidadMalo = totalMuestreos > 0 ? (sumaPorcentajeMalo / totalMuestreos).toFixed(1) : "0";

    const mesasCriticas = items.filter((item) => item.porcentajeMalo > 15).length;

    return { totalMuestreos, promedioCalidadBueno, promedioCalidadMalo, mesasCriticas };
  }, [items]);

  return (
    <main className="min-h-screen bg-transparent">
      <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
        
        {/* Encabezado Principal */}
        <section className="mb-6 rounded-2xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/60 p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Registro de Control de Calidad / Muestreo
              </h1>
              <p className="mt-1 sm:mt-2 text-sm sm:text-base text-slate-600">
                Monitorea el peso y rendimiento de la yaca por mesas de trabajo y lotes de origen.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="w-full sm:w-auto shrink-0 rounded-xl bg-emerald-800 px-5 py-3 text-sm font-semibold text-white shadow-xs transition hover:bg-emerald-900 active:scale-98 text-center"
            >
              Nuevo Registro
            </button>
          </div>
        </section>

        {/* Tarjetas de Indicadores Clave - Ajustada a 4 columnas */}
        <section className="mb-6 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <p className="text-xs sm:text-sm font-medium text-slate-500 uppercase tracking-wider">Muestreos Realizados</p>
            <p className="mt-2 text-2xl sm:text-3xl font-bold text-slate-900">{stats.totalMuestreos}</p>
          </div>
          
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <p className="text-xs sm:text-sm font-medium text-slate-500 uppercase tracking-wider">Promedio de Peso Bueno de los Muestreos </p>
            <p className="mt-2 text-2xl sm:text-3xl font-bold text-emerald-600">{stats.promedioCalidadBueno}%</p>
          </div>

          {/* 🔴 Nueva Tarjeta: Promedio de Peso Malo */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <p className="text-xs sm:text-sm font-medium text-slate-500 uppercase tracking-wider">Promedio de Peso Malo de los Muestreos</p>
            <p className="mt-2 text-2xl sm:text-3xl font-bold text-amber-600">{stats.promedioCalidadMalo}%</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <p className="text-xs sm:text-sm font-medium text-slate-500 uppercase tracking-wider">Mesas Críticas (&gt;15% Malo)</p>
            <p className="mt-2 text-2xl sm:text-3xl font-bold text-rose-600">{stats.mesasCriticas}</p>
          </div>
        </section>

        {/* Tabla con Columna Lote integrada */}
        <section className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-xs sm:p-6">
          <div className="mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">Datos del Muestreo Activo</h2>
            <p className="text-xs sm:text-sm text-slate-500">Historial de pesajes vinculados a su lote correspondiente.</p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-[1050px] w-full divide-y divide-slate-200 text-left text-xs sm:text-sm">
              <thead className="bg-emerald-950 text-white select-none">
                <tr>
                  <th className="px-4 py-3 font-medium tracking-wide text-slate-100">Fecha</th>
                  <th className="px-4 py-3 font-medium tracking-wide text-slate-100">Hora</th>
                  <th className="px-4 py-3 font-medium tracking-wide text-slate-100 bg-slate-700/50">Lote de Origen</th>
                  <th className="px-4 py-3 font-medium tracking-wide text-slate-100 text-center">N° Mesa</th>
                  <th className="px-4 py-3 font-medium tracking-wide text-slate-100">Peso Muestra</th>
                  <th className="px-4 py-3 font-medium tracking-wide text-slate-100">Peso Bueno</th>
                  <th className="px-4 py-3 font-medium tracking-wide text-slate-100">Peso Malo</th>
                  <th className="px-4 py-3 font-medium tracking-wide text-slate-100">% Bueno</th>
                  <th className="px-4 py-3 font-medium tracking-wide text-slate-100">% Malo</th>
                  <th className="px-4 py-3 font-medium tracking-wide text-slate-100">Observaciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-slate-400 font-medium">Cargando registros...</td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-slate-400">No hay muestreos registrados hoy.</td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors duration-150">
                      <td className="px-4 py-3.5 text-slate-900 font-medium whitespace-nowrap">{item.fecha}</td>
                      <td className="px-4 py-3.5 text-slate-500 whitespace-nowrap">{item.hora}</td>
                      
                      <td className="px-4 py-3.5 font-bold text-slate-900 whitespace-nowrap bg-slate-50/30">
                        <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800 border border-amber-100">
                          🏷️ {item.codigoLote}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-center font-bold text-slate-700">{item.numeroMesa}</td>
                      <td className="px-4 py-3.5 font-medium text-slate-800">{item.pesoMuestra} g</td>
                      <td className="px-4 py-3.5 text-emerald-600 font-semibold">{item.pesoBueno} g</td>
                      <td className="px-4 py-3.5 text-rose-600 font-semibold">{item.pesoMalo} g</td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                          {item.porcentajeBueno}%
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          item.porcentajeMalo > 15 ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-700"
                        }`}>
                          {item.porcentajeMalo}%
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 max-w-[160px] truncate" title={item.observaciones ?? undefined}>
                        {item.observaciones || "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Modal con Formulario */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-xs overflow-y-auto">
            <div className="my-8 w-full max-w-2xl rounded-2xl bg-white p-5 sm:p-7 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Agregar Registro de Muestreo</h2>
                  <p className="mt-1 text-xs sm:text-sm text-slate-500">Selecciona el lote e ingresa los pesajes de la mesa.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 active:scale-90 text-lg font-medium"
                >
                  ×
                </button>
              </div>
              <div className="mt-5 max-h-[70vh] overflow-y-auto pr-1">
                <CalidadForm
                  onCreated={(nuevo: MuestreoItem) => {
                    setItems([nuevo, ...items]);
                    setModalOpen(false);
                  }}
                  onCancel={() => setModalOpen(false)}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </main> 
  );
}
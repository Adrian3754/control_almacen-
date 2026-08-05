"use client";

import { useEffect, useState, useMemo } from "react";
import type { Lote } from "@/components/actions/lotes.actions";
import type { Tarima } from "@/components/actions/tarima.actions"; 
import { getMovimientosByLoteAction, type MovimientoLote } from "@/components/actions/movimiento_loteaction";

interface MovimientosModalProps {
  isOpen: boolean;
  onClose: () => void;
  lote: Lote | null;
  tarimas: Tarima[]; 
}

export default function MovimientosModal({ isOpen, onClose, lote, tarimas }: MovimientosModalProps) {
  const [movimientos, setMovimientos] = useState<MovimientoLote[]>([]);
  const [loading, setLoading] = useState(false);

  // Hook 1: Cargar historial desde la BD
  useEffect(() => {
    async function cargarHistorial() {
      if (!isOpen || !lote?.id) return;
      try {
        setLoading(true);
        const data = await getMovimientosByLoteAction(lote.id);
        setMovimientos(data);
      } catch (error) {
        console.error("❌ Error al traer el historial del modal:", error);
      } finally {
        setLoading(false);
      }
    }

    cargarHistorial();
  }, [isOpen, lote]);

  // Hook 2: Sumar los kilos repartidos en tarimas
  const kilosProcesados = useMemo(() => {
    return movimientos
      .filter((m) => m.tipoMovimiento === "REPARTO_TARIMA")
      .reduce((sum, m) => sum + m.kilos, 0);
  }, [movimientos]);

  // Hook 3: Obtener el ingreso inicial
  const ingresoInicial = useMemo(() => {
    const movimientoIngreso = movimientos.find((m) => m.tipoMovimiento === "INGRESO");
    if (movimientoIngreso) {
      return movimientoIngreso.kilos;
    }
    return (lote?.kilos ?? 0) + kilosProcesados;
  }, [movimientos, lote, kilosProcesados]);

  // 🛡️ ✅ AQUÍ DEBE IR EL RETURN TEMPRANO. Abajo de todos los Hooks.
  if (!isOpen || !lote) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm px-4">
      <div className="w-full max-w-3xl rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-200 sm:p-8 flex flex-col max-h-[85vh]">
        
        {/* Encabezado */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Historial de Movimientos</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Camión / Lote: <span className="font-bold text-slate-800">{lote.camion}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-2xl font-semibold px-2"
          >
            ×
          </button>
        </div>

        {/* Resumen de Kilos */}
        <div className="mt-4 grid gap-4 grid-cols-3 bg-slate-50 border border-slate-200 rounded-2xl p-4">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Ingreso Inicial</p>
            <p className="mt-1 text-xl font-bold text-slate-900">{ingresoInicial} kg</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Repartido en Tarimas</p>
            <p className="mt-1 text-xl font-bold text-sky-600">-{kilosProcesados} kg</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider font-semibold">Remanente en Camión</p>
            <p className="mt-1 text-xl font-bold text-emerald-600">{lote.kilos} kg</p>
          </div>
        </div>

        {/* Tabla */}
        <div className="mt-6 overflow-y-auto flex-1 border border-slate-100 rounded-2xl">
          {loading ? (
            <div className="text-center py-12 text-sm text-slate-400 animate-pulse">
              Consultando bitácora de inventario...
            </div>
          ) : movimientos.length === 0 ? (
            <div className="text-center py-12 text-sm text-slate-400">
              Aún no se han generado movimientos ni extracciones para este camión.
            </div>
          ) : (
            <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs font-medium uppercase tracking-wider sticky top-0">
                <tr>
                  <th className="px-4 py-3">Referencia / Tarima</th>
                  <th className="px-4 py-3">Tipo Movimiento</th>
                  <th className="px-4 py-3">Detalles / Descripción</th>
                  <th className="px-4 py-3 text-right">Kilos Afectados</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                {movimientos.map((mov) => (
                  <tr key={mov.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-4 py-3.5 font-mono font-bold text-slate-900">
                      {mov.tarimaBarcode ? (
                        <span className="bg-sky-50 text-sky-700 px-2 py-0.5 rounded-md border border-sky-100">
                          {mov.tarimaBarcode}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Sistema</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        mov.tipoMovimiento === "REPARTO_TARIMA" 
                          ? "bg-rose-50 text-rose-700 border border-rose-100" 
                          : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                      }`}>
                        {mov.tipoMovimiento}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 text-xs max-w-xs truncate" title={mov.descripcion}>
                      {mov.descripcion}
                    </td>
                    <td className={`px-4 py-3.5 text-right font-semibold font-mono ${
                      mov.tipoMovimiento === "REPARTO_TARIMA" ? "text-rose-600" : "text-emerald-600"
                    }`}>
                      {mov.tipoMovimiento === "REPARTO_TARIMA" ? "-" : "+"}{mov.kilos} kg
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Botón de cierre */}
        <div className="mt-6 flex justify-end border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 shadow-sm active:scale-95"
          >
            Cerrar Vista
          </button>
        </div>

      </div>
    </div>
  );
}
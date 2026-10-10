"use client";

import { useEffect, useMemo, useState } from "react";
import { getLotesAction, createLoteAction, type Lote, type NewLote } from "@/components/actions/lotes.actions";
import { getTarimasAction, type Tarima } from "@/components/actions/tarima.actions";
import MovimientosModal from "@/components/modals/MovimientosModal";

type Estado = "Descargado" | "Descargando" | "En ruta";
const initialProduct = "Yaca";

export default function LotesPage() {
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [tarimas, setTarimas] = useState<Tarima[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Control de Modales
  const [modalOpen, setModalOpen] = useState(false);
  const [movimientosModalOpen, setMovimientosModalOpen] = useState(false);
  const [selectedLote, setSelectedLote] = useState<Lote | null>(null);

  // Inputs Formulario Manuales
  const [camionInput, setCamionInput] = useState("");
  const [kilosInput, setKilosInput] = useState<number | "">(""); 

  // Carga inicial de datos desde Supabase / Servidor
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [lotesData, tarimasData] = await Promise.all([
          getLotesAction(),
          getTarimasAction()
        ]);
        setLotes(lotesData);
        setTarimas(tarimasData);
      } catch (error) {
        console.error("❌ Error cargando datos:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Sumatoria global de los kilos que quedan en inventario
  const totalKilos = useMemo(() => {
    return lotes.reduce((sum, lote) => sum + (lote.kilos || 0), 0);
  }, [lotes]);

  // Manejador para enviar el nuevo registro con datos manuales
  async function crearLote() {
    const camionNombre = camionInput.trim();
    const kilosNumericos = Number(kilosInput);

    if (!camionNombre || kilosNumericos <= 0) return;

    const item: NewLote = {
      camion: camionNombre,          // Identificador ingresado por el usuario
      fecha: new Date().toLocaleDateString("es-ES"),
      producto: initialProduct,       // Fijo por defecto 'Yaca'
      kilos: kilosNumericos,
      estado: "Descargando",          // Inicia directamente en proceso de descarga
    };

    try {
      const nuevo = await createLoteAction(item);
      setLotes([nuevo, ...lotes]);
      setModalOpen(false);
      setCamionInput("");
      setKilosInput("");
    } catch (error) {
      console.error("❌ Error al crear lote:", error);
    }
  }

  return (
    <main className="min-h-screen bg-transparent">
      <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
        
        {/* Sección del Panel de Control Superior (Header) */}
        <section className="mb-6 rounded-3xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/60 p-5 shadow-sm sm:mb-8 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-slate-900">Lotes por camión</h1>
              <p className="mt-2 text-slate-600">Aquí puedes ver cuántos kilos tiene cada lote por camión y su estado actual.</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-3xl bg-white px-5 py-4 shadow-sm border border-slate-200">
                <p className="text-sm text-slate-500">Kilos totales en lotes</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">{totalKilos} kg</p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="min-h-11 rounded-xl bg-emerald-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-900 shadow-sm active:scale-95"
              >
                Crear nuevo lote
              </button>
            </div>
          </div>
        </section>

        {/* Tabla Principal de Visualización */}
        <section className="rounded-3xl bg-white border border-emerald-100 p-4 shadow-sm sm:p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-emerald-50/70">
                <tr>
                  <th className="px-4 py-3 font-medium text-slate-600">Camión / Lote</th>
                  <th className="px-4 py-3 font-medium text-slate-600">Fecha</th>
                  <th className="px-4 py-3 font-medium text-slate-600">Kilos Actuales</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">Cargando datos de inventario...</td>
                  </tr>
                ) : lotes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">No hay lotes registrados en el sistema.</td>
                  </tr>
                ) : (
                  lotes.map((lote, idx) => (
                    <tr key={`${lote.camion}-${idx}`} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-4 font-semibold text-slate-800">{lote.camion}</td>
                      <td className="px-4 py-4 text-slate-600">{lote.fecha}</td>
                     
                      <td className="px-4 py-4 font-mono font-bold text-slate-900">{lote.kilos} kg</td>
                   
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Modal de Creación de Lote con Campos Manuales */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm px-4 py-6">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-200 sm:p-8">
              
              {/* Encabezado del Modal */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Registrar Entrada</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Ingresa manualmente el nombre del lote/camión y sus kilos iniciales para Yaca.
                  </p>
                </div>
                <button 
                  type="button" 
                  onClick={() => setModalOpen(false)} 
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition text-xl font-medium"
                >
                  ×
                </button>
              </div>

              {/* Formulario Manual */}
              <div className="mt-6 space-y-4">
                {/* Input para el Nombre del Lote / Camión */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Nombre o Identificador del Lote
                  </label>
                  <input 
                    type="text" 
                    autoFocus
                    value={camionInput} 
                    onChange={(e) => setCamionInput(e.target.value)} 
                    placeholder="Ej. Lote-45 o Camión Juan" 
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3.5 text-base font-semibold text-slate-900 placeholder-slate-400 outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-600/10"
                  />
                </div>

                {/* Input para los Kilos */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Kilos Iniciales del Lote
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-4 text-sm font-bold text-slate-400 pointer-events-none">KG</span>
                    <input 
                      type="number" 
                      min={1}
                      value={kilosInput} 
                      onChange={(e) => setKilosInput(e.target.value === "" ? "" : Number(e.target.value))} 
                      placeholder="Ej. 45000" 
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 pl-12 pr-4 py-3.5 text-base font-semibold text-slate-900 placeholder-slate-400 outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-600/10"
                    />
                  </div>
                </div>
              </div>

              {/* Botones de Confirmación */}
              <div className="mt-8 flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button 
                  type="button" 
                  onClick={() => setModalOpen(false)} 
                  className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-95"
                >
                  Cancelar
                </button>
                <button 
                  type="button" 
                  onClick={crearLote} 
                  className="inline-flex items-center justify-center rounded-xl bg-emerald-800 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-900 active:scale-95"
                >
                  Confirmar e Ingresar
                </button>
              </div>

            </div>
          </div>
        )}

        {/* Modal Separado de Auditoría e Historial de Movimientos */}
        <MovimientosModal 
          isOpen={movimientosModalOpen} 
          onClose={() => {
            setMovimientosModalOpen(false);
            setSelectedLote(null);
          }} 
          lote={selectedLote} 
          tarimas={tarimas} 
        />

      </div>
    </main>
  );
}
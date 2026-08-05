"use client";

import { useState, useEffect } from "react";
import { ejecutarCorteDiarioAction } from "@/components/actions/reportes.actions";

interface ModalCorteDiarioProps {
  isOpen: boolean;
  onClose: () => void;
  datosSugeridos?: {
    lotesContados: number;
    kilosMuestreados: number;
    tarimasCreadas: number;
    movimientosRegistrados: number;
  };
}

export default function ModalCorteDiario({ 
  isOpen, 
  onClose, 
  datosSugeridos 
}: ModalCorteDiarioProps) {
  
  const [step, setStep] = useState(1);
  const [guardando, setGuardando] = useState(false);

  // 1. Dejar los estados iniciales vacíos para evitar que congelen valores desactualizados en el montaje
  const [resumenLotes, setResumenLotes] = useState("");
  const [resumenCalidad, setResumenCalidad] = useState("");
  const [resumenTarimas, setResumenTarimas] = useState("");

  // 2. 🔥 Sincronización Real: Escucha activamente cuando el modal se abre O cuando los datos sugeridos cambian
  useEffect(() => {
    if (isOpen && datosSugeridos) {
      setResumenLotes(`Se procesaron ${datosSugeridos.lotesContados} lotes/camiones hoy sin incidencias.`);
      setResumenCalidad(`Mesas operando con normalidad. Peso total evaluado: ${datosSugeridos.kilosMuestreados.toLocaleString("es-MX")} Kg.`);
      setResumenTarimas(`Se armaron ${datosSugeridos.tarimasCreadas} tarimas listas para empaque.`);
    }
  }, [isOpen, datosSugeridos]);

  // Si no está abierto, no renderiza nada (Previene fugas visuales)
  if (!isOpen) return null;

  const handleSiguiente = () => setStep((prev) => prev + 1);
  const handleAtras = () => setStep((prev) => prev - 1);

  const handleFinalizarCorte = async () => {
    setGuardando(true);
    try {
      await ejecutarCorteDiarioAction({
        resumenLotes,
        resumenCalidad,
        resumenTarimas,
        totalTarimas: datosSugeridos?.tarimasCreadas ?? 0,
        totalKilosMuestreados: datosSugeridos?.kilosMuestreados ?? 0,
        totalMovimientos: datosSugeridos?.movimientosRegistrados ?? 0,
      });
      alert("🎉 ¡Corte diario realizado con éxito! Los paneles operativos han sido archivados.");
      onClose();
      setStep(1); 
    } catch (err) {
      alert("Hubo un error al procesar el cierre del día.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
      <div className="w-full max-w-lg rounded-3xl bg-white border border-slate-200 shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
        
        {/* Encabezado e Indicador de Pasos */}
        <div className="bg-slate-50 border-b border-slate-100 p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Cierre de Turno & Corte Diario</h3>
            <span className="text-xs font-bold text-slate-500 bg-slate-200/70 px-2.5 py-1 rounded-full">
              Paso {step} de 4
            </span>
          </div>
          <div className="w-full bg-slate-200 h-1.5 rounded-full mt-4 overflow-hidden">
            <div 
              className="bg-slate-900 h-1.5 transition-all duration-300" 
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        </div>

        {/* Contenido Dinámico del Paso Activo */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1">
          
          {/* PASO 1: CORTE DE LOTES */}
          {step === 1 && (
            <div className="space-y-4 animate-slide-in">
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
                <p className="text-xs font-bold text-amber-800 uppercase tracking-wide">1. Revisión de Lotes y Camiones</p>
                <p className="text-2xl font-black text-slate-900 mt-1">
                  {datosSugeridos?.lotesContados ?? 0} <span className="text-sm font-medium text-slate-500">Lotes hoy</span>
                </p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase">Notas o Incidencias de Lotes</label>
                <textarea
                  value={resumenLotes} 
                  onChange={(e) => setResumenLotes(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-sm focus:outline-slate-900 h-24 resize-none"
                />
              </div>
            </div>
          )}

          {/* PASO 2: CORTE DE CALIDAD (MUESTREO) */}
          {step === 2 && (
            <div className="space-y-4 animate-slide-in">
              <div className="rounded-xl bg-blue-50 border border-blue-200 p-4">
                <p className="text-xs font-bold text-blue-800 uppercase tracking-wide">2. Rendimiento de Calidad en Mesas</p>
                <p className="text-2xl font-black text-slate-900 mt-1">
                  {(datosSugeridos?.kilosMuestreados ?? 0).toLocaleString("es-MX")} <span className="text-sm font-medium text-slate-500">Kg Muestreados</span>
                </p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase">Observaciones de Calidad</label>
                <textarea
                  value={resumenCalidad} 
                  onChange={(e) => setResumenCalidad(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-sm focus:outline-slate-900 h-24 resize-none"
                />
              </div>
            </div>
          )}

          {/* PASO 3: TARIMAS Y MOVIMIENTOS */}
          {step === 3 && (
            <div className="space-y-4 animate-slide-in">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
                  <p className="text-xs font-bold text-emerald-800 uppercase tracking-wide">Tarimas Creadas</p>
                  <p className="text-2xl font-black text-slate-900 mt-1">{datosSugeridos?.tarimasCreadas ?? 0}</p>
                </div>
                <div className="rounded-xl bg-purple-50 border border-purple-200 p-4">
                  <p className="text-xs font-bold text-purple-800 uppercase tracking-wide">Movimientos</p>
                  <p className="text-2xl font-black text-slate-900 mt-1">{datosSugeridos?.movimientosRegistrados ?? 0}</p>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase">Resumen Logístico / Almacén</label>
                <textarea
                  value={resumenTarimas} 
                  onChange={(e) => setResumenTarimas(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-sm focus:outline-slate-900 h-24 resize-none"
                />
              </div>
            </div>
          )}

          {/* PASO 4: RESUMEN FINAL ANTES DE GUARDAR */}
          {step === 4 && (
            <div className="space-y-4 animate-slide-in">
              <div className="rounded-2xl border border-red-200 bg-red-50/50 p-4 text-center">
                <p className="text-sm font-bold text-red-900">⚠️ Atención Supervisor</p>
                <p className="text-xs text-red-700 mt-1">
                  Al confirmar el corte, los paneles operativos de hoy se archivarán. La mañana siguiente iniciará limpia desde cero.
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-2 text-xs">
                <p className="font-bold text-slate-700 text-sm border-b border-slate-200 pb-1">Verificación de Cierre:</p>
                <p><strong>Lotes:</strong> {resumenLotes || "Sin observaciones."}</p>
                <p><strong>Calidad:</strong> {resumenCalidad || "Sin observaciones."}</p>
                <p><strong>Logística:</strong> {resumenTarimas || "Sin observaciones."}</p>
              </div>
            </div>
          )}

        </div>

        {/* Botones de Control de la Secuencia */}
        <div className="bg-slate-50 border-t border-slate-100 p-4 flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={handleAtras} 
              disabled={guardando}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
            >
              Atrás
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
            >
              Cancelar
            </button>
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={handleSiguiente}
              className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800"
            >
              Siguiente Paso
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinalizarCorte} 
              disabled={guardando}
              className="rounded-xl bg-red-600 px-6 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50 flex items-center gap-1.5"
            >
              {guardando ? "Procesando Cierre..." : "Confirmar Cierre General"}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
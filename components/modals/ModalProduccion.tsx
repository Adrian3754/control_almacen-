"use client";

import React, { useState, useRef, useEffect } from 'react';

// -------------------------------------------------------------
// INTERFACES
// -------------------------------------------------------------
export interface Empleado { 
  id: string; 
  nombre: string; 
}

export interface Lote {
  camion: string;
  kilos: number;
}

export interface Movimiento {
  id: string;
  tarimaBarcode?: string;
  tipoMovimiento: string;
  descripcion: string;
  kilos: number;
}

export interface RegistroPesaje {
  id: string;
  numeroPesaje: number;
  fecha: string;
  empleadoId: string;
  nombre: string;
  lote: string;
  producto: string;
  peso: number;
}

export interface ModalProduccionProps {
  isOpen: boolean;
  onClose: () => void;
  onGuardarPesaje?: (registro: Omit<RegistroPesaje, 'id' | 'fecha' | 'numeroPesaje'>) => void;
  siguienteNumero?: number;
  lote?: Lote;
  ingresoInicial?: number;
  kilosProcesados?: number;
  loading?: boolean;
  movimientos?: Movimiento[];
}

// -------------------------------------------------------------
// COMPONENTE
// -------------------------------------------------------------
export default function ModalProduccion({ 
  isOpen, 
  onClose, 
  lote = { camion: "Sin especificar", kilos: 0 },
  ingresoInicial = 0,
  kilosProcesados = 0,
  loading = false,
  movimientos = [],
  siguienteNumero = 1,
  onGuardarPesaje
}: ModalProduccionProps) {
  
  const inputCodigoRef = useRef<HTMLInputElement>(null);
  const [codigoEmpleado, setCodigoEmpleado] = useState("");
  const [empleadoEncontrado, setEmpleadoEncontrado] = useState<Empleado | null>(null);
  const [esNuevoEmpleado, setEsNuevoEmpleado] = useState(false);
  const [nombreNuevoEmpleado, setNombreNuevoEmpleado] = useState("");
  
  const [pesoIngresado, setPesoIngresado] = useState("");
  
  const [esPareja, setEsPareja] = useState(false);
  const [codigoEmpleado2, setCodigoEmpleado2] = useState("");
  const [empleado2, setEmpleado2] = useState<Empleado | null>(null);

  // Buscar primer empleado
  const handleKeyDownCodigo = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && codigoEmpleado.trim() !== '') {
      if (codigoEmpleado === "123") {
        setEmpleadoEncontrado({ id: "123", nombre: "JUAN PÉREZ" });
        setEsNuevoEmpleado(false);
      } else {
        setEmpleadoEncontrado(null);
        setEsNuevoEmpleado(true);
      }
    }
  };

  // Buscar segundo empleado (pareja)
  useEffect(() => {
    if (codigoEmpleado2.trim().length >= 3) {
      setEmpleado2({ id: codigoEmpleado2, nombre: `OPERADOR ${codigoEmpleado2}` });
    } else {
      setEmpleado2(null);
    }
  }, [codigoEmpleado2]);

  const handleSubmit = () => {
    if (!pesoIngresado) return;

    if (onGuardarPesaje) {
      onGuardarPesaje({
        empleadoId: empleadoEncontrado ? empleadoEncontrado.id : codigoEmpleado,
        nombre: empleadoEncontrado ? empleadoEncontrado.nombre : nombreNuevoEmpleado || "Sin nombre",
        lote: lote.camion,
        producto: "Producto Base",
        peso: Number(pesoIngresado)
      });
    }

    limpiarFormulario();
    onClose();
  };

  const limpiarFormulario = () => {
    setCodigoEmpleado("");
    setEmpleadoEncontrado(null);
    setEsNuevoEmpleado(false);
    setNombreNuevoEmpleado("");
    setPesoIngresado("");
    setEsPareja(false);
    setCodigoEmpleado2("");
    setEmpleado2(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
      <div className="flex flex-col w-full max-w-2xl bg-white shadow-2xl rounded-2xl min-h-[400px] overflow-hidden border border-slate-200 mt-10 mb-10">
        
        {/* HEADER */}
        <div className="px-6 py-4 border-b border-slate-100 bg-white">
          <h2 className="text-xl font-bold text-slate-800">Nueva Captura #{siguienteNumero}</h2>
        </div>

        {/* CUERPO */}
        <div className="flex-1 p-4 overflow-y-auto bg-slate-50 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Operador principal */}
            <section className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
              <h3 className="mb-2 text-xs font-bold uppercase text-slate-500">👷 Empleado</h3>
              <input
                ref={inputCodigoRef}
                autoFocus
                type="text"
                value={codigoEmpleado}
                onChange={(e) => setCodigoEmpleado(e.target.value)}
                onKeyDown={handleKeyDownCodigo}
                disabled={!!empleadoEncontrado || esNuevoEmpleado}
                placeholder="Escanear código..."
                className="w-full px-4 py-3 text-lg text-slate-900 bg-slate-50 border-2 border-slate-200 rounded-lg focus:border-emerald-500 outline-none transition-all"
              />

              {esNuevoEmpleado && (
                <div className="mt-4">
                  <label className="block mb-2 text-sm font-semibold text-slate-600">
                    Nombre del empleado
                  </label>
                  <input
                    type="text"
                    value={nombreNuevoEmpleado}
                    onChange={(e) => setNombreNuevoEmpleado(e.target.value)}
                    placeholder="Ingresar nombre..."
                    className="w-full px-4 py-3 text-lg text-slate-900 bg-slate-50 border-2 border-slate-200 rounded-lg focus:border-emerald-500 outline-none transition-all"
                  />
                </div>
              )}
            </section>

            {/* Peso */}
            <section className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
              <h3 className="mb-2 text-xs font-bold uppercase text-slate-500">⚖ Peso (KG)</h3>
              <input
                type="number"
                step="0.01"
                value={pesoIngresado}
                onChange={(e) => setPesoIngresado(e.target.value)}
                placeholder="0.00"
                className="w-full py-5 text-4xl font-black text-center text-emerald-600 bg-emerald-50 border-2 border-emerald-200 rounded-lg outline-none"
              />
            </section>
          </div>

          {/* Segundo operador (pareja) */}
          {esPareja && (
            <section className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
              <h3 className="mb-2 text-xs font-bold uppercase text-slate-500">👥 Segundo empleado</h3>
              <input
                type="text"
                value={codigoEmpleado2}
                onChange={(e) => setCodigoEmpleado2(e.target.value)}
                placeholder="Escanear código..."
                className="w-full px-4 py-3 text-lg text-slate-900 bg-slate-50 border-2 border-slate-200 rounded-lg focus:border-emerald-500 outline-none transition-all"
              />
              {empleado2 && (
                <p className="mt-2 text-sm text-emerald-600 font-semibold">
                  {empleado2.nombre}
                </p>
              )}
            </section>
          )}

          {/* Toggle para activar pareja */}
            <div 
            onClick={() => setEsPareja(!esPareja)} 
            className={`relative inline-flex h-6 w-11 items-center rounded-full cursor-pointer transition-colors ${
                esPareja ? "bg-emerald-600" : "bg-slate-300"
            }`}
            >
            <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                esPareja ? "translate-x-6" : "translate-x-1"
                }`}
            />
            </div>
            <span className="ml-3 text-sm font-medium text-slate-700">Registrar en pareja</span>
{/* RESUMEN - Integrado y con cálculo correcto */}
{pesoIngresado && (
  <section className="p-4 bg-slate-800 rounded-xl text-white shadow-lg">
    <div className="flex justify-between items-center mb-3">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Resumen de carga</h3>
      <span className="text-xl font-black">{pesoIngresado} KG</span>
    </div>
    
    <div className="space-y-2 border-t border-slate-700 pt-3">
      <div className="flex justify-between text-sm">
        <span className="text-slate-300">
          {empleadoEncontrado?.nombre || nombreNuevoEmpleado || "Operador 1"}
        </span>
        <strong className="text-emerald-400">
          {esPareja 
            ? (Number(pesoIngresado) / 2).toFixed(2) 
            : Number(pesoIngresado).toFixed(2)} KG
        </strong>
      </div>
      
      {esPareja && (
        <div className="flex justify-between text-sm">
          <span className="text-slate-300">
            {empleado2?.nombre || "Operador 2"}
          </span>
          <strong className="text-blue-400">
            {(Number(pesoIngresado) / 2).toFixed(2)} KG
          </strong>
        </div>
      )}
    </div>
  </section>
)}
        </div>

        {/* FOOTER */}
              {/* FOOTER DEL MODAL */}
      <div className="flex justify-end gap-3 p-5 bg-white border-t border-slate-200 rounded-b-2xl">
        
      </div>
        <div className="p-4 bg-white border-t border-slate-100 flex gap-3">
          <button 
            onClick={() => { limpiarFormulario(); onClose(); }} 
            className="flex-1 py-3 text-base font-bold text-slate-600 bg-slate-100 rounded-xl"
          >
            Cancelar
          </button>
        <button 
          onClick={handleSubmit} 
          //disabled={!pesoIngresado || (esNuevoEmpleado && !nombreEmpleado)}
          className="flex-1 py-3 text-base font-bold text-white bg-emerald-600 rounded-xl shadow-md shadow-emerald-200"
        >
          Guardar Registro
        </button>
      </div>
    </div>
  </div>
);


}
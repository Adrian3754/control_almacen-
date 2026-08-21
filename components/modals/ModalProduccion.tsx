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
  existingNames?: string[];
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
  onGuardarPesaje,
  existingNames = []
}: ModalProduccionProps) {
  
  const inputCodigoRef = useRef<HTMLInputElement>(null);
  const [codigoEmpleado, setCodigoEmpleado] = useState("");
  const [empleadoEncontrado, setEmpleadoEncontrado] = useState<Empleado | null>(null);
  const [esNuevoEmpleado, setEsNuevoEmpleado] = useState(false);
  const [nombreNuevoEmpleado, setNombreNuevoEmpleado] = useState("");
  const [searchBy, setSearchBy] = useState<'codigo' | 'nombre'>('codigo');

  const [pesoIngresado, setPesoIngresado] = useState("");

  const normalizeText = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  const nombresCoincidentes = existingNames.filter((nombre) => {
    const consulta = normalizeText(nombreNuevoEmpleado);
    if (!consulta) return false;
    return normalizeText(nombre).includes(consulta);
  }).slice(0, 6);

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

  // Si se cambia el método de búsqueda, limpiar estados relevantes
  useEffect(() => {
    setCodigoEmpleado("");
    setEmpleadoEncontrado(null);
    setEsNuevoEmpleado(false);
    setNombreNuevoEmpleado("");
  }, [searchBy]);

  useEffect(() => {
    if (searchBy !== 'nombre') return;

    const consulta = normalizeText(nombreNuevoEmpleado);
    if (!consulta) {
      setEmpleadoEncontrado(null);
      setEsNuevoEmpleado(false);
      return;
    }

    const coincidencias = existingNames.filter((nombre) => normalizeText(nombre).includes(consulta));

    if (coincidencias.length === 1) {
      const nombre = coincidencias[0];
      setEmpleadoEncontrado({ id: nombre, nombre });
      setEsNuevoEmpleado(false);
      return;
    }

    if (coincidencias.length > 1) {
      setEmpleadoEncontrado(null);
      setEsNuevoEmpleado(true);
    }
  }, [searchBy, nombreNuevoEmpleado, existingNames]);

  const handleSubmit = () => {
    if (!pesoIngresado) return;

    if (onGuardarPesaje) {
      onGuardarPesaje({
        empleadoId: empleadoEncontrado ? empleadoEncontrado.id : codigoEmpleado,
        nombre: empleadoEncontrado ? empleadoEncontrado.nombre : nombreNuevoEmpleado || codigoEmpleado || "Sin nombre",
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

            {/* Método de búsqueda */}
            <section className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
              <h3 className="mb-2 text-xs font-bold uppercase text-slate-500">👷 Buscar empleado</h3>
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => setSearchBy('codigo')}
                  className={`px-3 py-1 rounded-md text-sm ${searchBy === 'codigo' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                  Código
                </button>
                <button
                  onClick={() => setSearchBy('nombre')}
                  className={`px-3 py-1 rounded-md text-sm ${searchBy === 'nombre' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                  Nombre
                </button>
              </div>

              {searchBy === 'codigo' ? (
                <>
                  <input
                    ref={inputCodigoRef}
                    autoFocus
                    type="text"
                    value={codigoEmpleado}
                    onChange={(e) => setCodigoEmpleado(e.target.value)}
                    onKeyDown={handleKeyDownCodigo}
                    disabled={!!empleadoEncontrado}
                    placeholder="Escanear código y presionar Enter..."
                    className="w-full px-4 py-3 text-lg text-slate-900 bg-slate-50 border-2 border-slate-200 rounded-lg focus:border-emerald-500 outline-none transition-all"
                  />
                  {empleadoEncontrado && (
                    <p className="mt-2 text-sm text-emerald-600 font-semibold">{empleadoEncontrado.nombre}</p>
                  )}
                </>
              ) : (
                <>
                  <label className="block mb-2 text-sm font-semibold text-slate-600">Nombre</label>
                  <input
                    type="text"
                    value={nombreNuevoEmpleado}
                    onChange={(e) => setNombreNuevoEmpleado(e.target.value)}
                    placeholder="Ingresar nombre completo..."
                    className="w-full px-4 py-3 text-lg text-slate-900 bg-slate-50 border-2 border-slate-200 rounded-lg focus:border-emerald-500 outline-none transition-all"
                  />

                  {nombresCoincidentes.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {nombresCoincidentes.map((nombre) => (
                        <button
                          key={nombre}
                          type="button"
                          onClick={() => {
                            setNombreNuevoEmpleado(nombre);
                            setEmpleadoEncontrado({ id: nombre, nombre });
                            setEsNuevoEmpleado(false);
                          }}
                          className="w-full rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-left text-sm font-medium text-emerald-700 hover:bg-emerald-100"
                        >
                          {nombre}
                        </button>
                      ))}
                    </div>
                  )}
                </>
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

          {/* RESUMEN */}
          {pesoIngresado && (
            <section className="p-4 bg-slate-800 rounded-xl text-white shadow-lg">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Resumen de carga</h3>
                <span className="text-xl font-black">{pesoIngresado} KG</span>
              </div>

              <div className="space-y-2 border-t border-slate-700 pt-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-300">{empleadoEncontrado?.nombre || nombreNuevoEmpleado || "Operador"}</span>
                  <strong className="text-emerald-400">{Number(pesoIngresado).toFixed(2)} KG</strong>
                </div>
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
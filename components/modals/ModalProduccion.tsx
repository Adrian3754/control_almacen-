"use client";

import React, { useState, useRef, useEffect } from 'react';

// -------------------------------------------------------------
// INTERFACES
// -------------------------------------------------------------
export interface Empleado { 
  id: string; 
  nombre: string; 
  numero_empleado?: string | null;
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

export interface EmpleadoProduccion {
  id: string;
  nombre: string | null;
  numero_empleado?: string | null;
}

export interface ModalProduccionProps {
  isOpen: boolean;
  onClose: () => void;
  onGuardarPesaje?: (registro: Omit<RegistroPesaje, 'id' | 'fecha' | 'numeroPesaje'>) => void;
  onEditarPesaje?: (id: string, cambios: Partial<RegistroPesaje>) => Promise<void> | void;
  historialRegistros?: RegistroPesaje[];
  siguienteNumero?: number;
  lote?: Lote;
  ingresoInicial?: number;
  kilosProcesados?: number;
  loading?: boolean;
  movimientos?: Movimiento[];
  existingNames?: string[];
  empleadosDisponibles?: EmpleadoProduccion[];
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
  onEditarPesaje,
  historialRegistros = [],
  existingNames = [],
  empleadosDisponibles = []
}: ModalProduccionProps) {
  
  const inputCodigoRef = useRef<HTMLInputElement>(null);
  const [codigoEmpleado, setCodigoEmpleado] = useState("");
  const [empleadoEncontrado, setEmpleadoEncontrado] = useState<Empleado | null>(null);
  const [esNuevoEmpleado, setEsNuevoEmpleado] = useState(false);
  const [nombreNuevoEmpleado, setNombreNuevoEmpleado] = useState("");

  const [pesoIngresado, setPesoIngresado] = useState("");
  const [historialAbierto, setHistorialAbierto] = useState(false);
  const [edicionHistorial, setEdicionHistorial] = useState<Record<string, string>>({});

  const normalizeText = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  const empleadosCoincidentes = (empleadosDisponibles.length > 0 ? empleadosDisponibles : existingNames.map((nombre) => ({
    id: nombre,
    nombre,
    numero_empleado: "",
  }))).filter((empleado) => {
    const consulta = (codigoEmpleado || "").replace(/\D/g, "").slice(-3);
    if (!consulta || consulta.length < 3) return false;

    const numero = (empleado.numero_empleado || "").replace(/\D/g, "");
    return numero.length >= 3 && numero.slice(-3) === consulta;
  }).slice(0, 8);

  const buscarEmpleadoPorCodigo = (valor: string) => {
    const consulta = valor.replace(/\D/g, "").slice(-3);
    if (!consulta || consulta.length < 3) return null;

    return (empleadosDisponibles.length > 0 ? empleadosDisponibles : []).find((empleado) => {
      const numero = (empleado.numero_empleado || "").replace(/\D/g, "");
      return numero.length >= 3 && numero.slice(-3) === consulta;
    }) || null;
  };

  const seleccionarEmpleado = (empleado: { id: string; nombre: string | null; numero_empleado?: string | null }) => {
    const nombre = empleado.nombre || 'Sin nombre';
    setNombreNuevoEmpleado(nombre);
    setEmpleadoEncontrado({
      id: empleado.numero_empleado || empleado.id,
      nombre,
      numero_empleado: empleado.numero_empleado || empleado.id,
    });
    setEsNuevoEmpleado(false);
    setHistorialAbierto(true);
  };

  // Buscar primer empleado
  const handleKeyDownCodigo = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && codigoEmpleado.trim() !== '') {
      const empleado = buscarEmpleadoPorCodigo(codigoEmpleado);

      if (empleado) {
        seleccionarEmpleado(empleado);
        setCodigoEmpleado(empleado.numero_empleado || empleado.id);
        return;
      }

      setEmpleadoEncontrado(null);
      setEsNuevoEmpleado(true);
    }
  };

  const manejarCambioCodigo = (valor: string) => {
    const soloDigitos = valor.replace(/\D/g, "").slice(-3);
    setCodigoEmpleado(valor);

    const empleado = buscarEmpleadoPorCodigo(valor);
    if (empleado) {
      setNombreNuevoEmpleado(empleado.nombre || 'Sin nombre');
      setEmpleadoEncontrado({
        id: empleado.numero_empleado || empleado.id,
        nombre: empleado.nombre || 'Sin nombre',
        numero_empleado: empleado.numero_empleado || empleado.id,
      });
      setEsNuevoEmpleado(false);
      return;
    }

    setNombreNuevoEmpleado("");
    setEmpleadoEncontrado(null);
    setEsNuevoEmpleado(false);

    if (soloDigitos.length === 3) {
      setCodigoEmpleado(soloDigitos);
    }
  };

  const empleadoActivo = empleadoEncontrado ? empleadoEncontrado.nombre : nombreNuevoEmpleado || "";
  const empleadoNumeroActivo = empleadoEncontrado?.numero_empleado || codigoEmpleado || "";

  const historialEmpleado = React.useMemo(() => {
    if (!empleadoActivo) return [];
    const nombreNormalizado = normalizeText(empleadoActivo);
    return historialRegistros.filter((registro) => normalizeText(registro.nombre || "").includes(nombreNormalizado)).slice(0, 10);
  }, [empleadoActivo, historialRegistros]);

  const guardarHistorial = async (registro: RegistroPesaje) => {
    const valorNuevo = Number(edicionHistorial[registro.id] ?? registro.peso);
    if (!onEditarPesaje) return;

    await onEditarPesaje(registro.id, {
      nombre: registro.nombre,
      lote: registro.lote,
      producto: registro.producto,
      peso: valorNuevo,
    });
  };

  const handleSubmit = () => {
    if (!pesoIngresado) return;

    const numeroEmpleadoGuardado = empleadoNumeroActivo || codigoEmpleado || "Sin número";

    if (onGuardarPesaje) {
      onGuardarPesaje({
        empleadoId: numeroEmpleadoGuardado,
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
    <>
      {historialAbierto && empleadoActivo && historialEmpleado.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Historial de {empleadoActivo}</h3>
                <p className="text-xs text-slate-500">Edita los pesos si necesitas corregir alguno.</p>
              </div>
              <button
                type="button"
                onClick={() => setHistorialAbierto(false)}
                className="rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-600"
              >
                Cerrar
              </button>
            </div>

            <div className="max-h-[70vh] space-y-3 overflow-y-auto p-4">
              {historialEmpleado.map((registro) => (
                <div key={registro.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{registro.fecha}</p>
                      <p className="text-sm text-slate-600">Lote: {registro.lote || 'Sin especificar'}</p>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">{Number(registro.peso).toFixed(2)} KG</span>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <input
                      type="number"
                      step="0.01"
                      value={edicionHistorial[registro.id] ?? String(registro.peso)}
                      onChange={(event) => setEdicionHistorial((prev) => ({ ...prev, [registro.id]: event.target.value }))}
                      className="w-28 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-emerald-500"
                    />
                    <span className="text-sm text-slate-500">kg</span>
                    <button
                      type="button"
                      onClick={() => guardarHistorial(registro)}
                      className="ml-auto rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white"
                    >
                      Guardar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    <div className="fixed inset-0 z-40 flex items-start justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
      <div className="flex flex-col w-full max-w-2xl bg-white shadow-2xl rounded-2xl min-h-[25rem] overflow-hidden border border-slate-200 mt-10 mb-10">
        
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
              <div className="grid grid-cols-1 gap-3">
                <label className="block space-y-1">
                  <span className="text-xs font-bold uppercase text-slate-500">Últimos 3 dígitos del despulpador</span>
                  <input
                    ref={inputCodigoRef}
                    autoFocus
                    type="text"
                    value={codigoEmpleado}
                    onChange={(e) => manejarCambioCodigo(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const empleado = buscarEmpleadoPorCodigo(codigoEmpleado);
                        if (empleado) {
                          seleccionarEmpleado(empleado);
                          setCodigoEmpleado(empleado.numero_empleado || empleado.id);
                        }
                      }
                    }}
                    placeholder="Ej. 008"
                    className="w-full px-4 py-3 text-lg text-slate-900 bg-slate-50 border-2 border-slate-200 rounded-lg focus:border-emerald-500 outline-none transition-all"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-xs font-bold uppercase text-slate-500">Nombre</span>
                  <input
                    type="text"
                    value={nombreNuevoEmpleado}
                    readOnly
                    disabled
                    placeholder="Se llenará automáticamente"
                    className="w-full px-4 py-3 text-lg text-slate-900 bg-slate-100 border-2 border-slate-200 rounded-lg outline-none cursor-not-allowed"
                  />
                </label>

                {empleadosCoincidentes.length > 0 && (
                  <div className="space-y-2">
                    {empleadosCoincidentes.map((empleado) => (
                      <button
                        key={`${empleado.id}-${empleado.nombre || "sin-nombre"}`}
                        type="button"
                        onClick={() => {
                          seleccionarEmpleado(empleado);
                          setCodigoEmpleado(empleado.numero_empleado || empleado.id);
                          setHistorialAbierto(false);
                        }}
                        className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-left text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
                      >
                        {empleado.nombre || "Sin nombre"}
                      </button>
                    ))}
                  </div>
                )}

                {empleadoActivo && historialEmpleado.length > 0 && (
                  <div>
                    <button
                      type="button"
                      onClick={() => setHistorialAbierto(true)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                    >
                      Ver historial de {empleadoActivo}
                    </button>
                  </div>
                )}
              </div>
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
                  <span className="text-slate-300">{empleadoEncontrado?.nombre || nombreNuevoEmpleado || "Despulpador"}</span>
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
    </>
);


}
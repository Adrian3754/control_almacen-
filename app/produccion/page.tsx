"use client";

import ModalProduccion, { RegistroPesaje } from '@/components/modals/ModalProduccion';
import { getDespulpadoresAction } from '@/components/actions/usuarios.actions';
import { exportToCSV } from '@/lib/excel';
import React, { useState, useMemo, useEffect } from 'react';
import { operatorSummaryRows } from '@/lib/excel';

const normalizeOperatorName = (value: string) => {
  return (value || 'Sin nombre')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
};

const showToast = (message: string, type: 'success' | 'error' = 'success') => {
  if (typeof window === 'undefined') return;

  const existing = document.getElementById('production-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'production-toast';
  toast.textContent = message;
  toast.style.position = 'fixed';
  toast.style.right = '24px';
  toast.style.bottom = '24px';
  toast.style.zIndex = '9999';
  toast.style.padding = '12px 16px';
  toast.style.borderRadius = '12px';
  toast.style.fontSize = '14px';
  toast.style.fontWeight = '600';
  toast.style.boxShadow = '0 10px 25px rgba(15, 23, 42, 0.18)';
  toast.style.color = '#fff';
  toast.style.background = type === 'success' ? '#16a34a' : '#dc2626';

  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
};

export default function ProduccionPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [registros, setRegistros] = useState<RegistroPesaje[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historialOperador, setHistorialOperador] = useState<{ nombre: string; entries: RegistroPesaje[] } | null>(null);
  const [pesoEditado, setPesoEditado] = useState<Record<string, string>>({});
  const [empleadosProduccion, setEmpleadosProduccion] = useState<Array<{ id: string; nombre: string; numero_empleado: string }>>([]);
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; title: string; message: string; onConfirm: () => Promise<void> | void } | null>(null);

  useEffect(() => {
    const cargarEmpleadosProduccion = async () => {
      try {
        const usuarios = await getDespulpadoresAction();
        const lista = usuarios
          .filter((usuario) => usuario.nombre_completo)
          .map((usuario) => ({
            id: String(usuario.id_despulpador ?? usuario.id ?? ''),
            nombre: String(usuario.nombre_completo || 'Sin nombre'),
            numero_empleado: String(usuario.id_despulpador ?? usuario.id ?? '').trim(),
          }))
          .filter((usuario) => usuario.id && usuario.nombre);

        setEmpleadosProduccion(lista);
      } catch (err) {
        console.error('Error cargando usuarios de producción:', err);
        setEmpleadosProduccion([]);
      }
    };

    cargarEmpleadosProduccion();
  }, []);

  const editarRegistro = async (id: string, cambios: Partial<RegistroPesaje>) => {
    try {
      setLoading(true);
      const res = await fetch('/api/produccion', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...cambios })
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || 'No se pudo actualizar el pesaje.');
      }

      await cargarRegistros();
      showToast('Pesaje actualizado correctamente.', 'success');
    } catch (err) {
      console.error('Error actualizando pesaje:', err);
      showToast(err instanceof Error ? err.message : 'No se pudo actualizar el pesaje.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const abrirHistorialOperador = (nombre: string) => {
    const entries = [...registros]
      .filter((registro) => normalizeOperatorName(registro.nombre || 'Sin nombre') === normalizeOperatorName(nombre))
      .sort((a, b) => Number(new Date(b.fecha || 0)) - Number(new Date(a.fecha || 0)));

    setHistorialOperador({ nombre, entries });
    setPesoEditado({});
  };

  const guardarPesoDesdeHistorial = async (registro: RegistroPesaje) => {
    const nuevoPeso = Number(pesoEditado[registro.id] ?? registro.peso);

    if (Number.isNaN(nuevoPeso)) {
      showToast('El peso no es válido.', 'error');
      return;
    }

    await editarRegistro(registro.id, {
      nombre: registro.nombre,
      lote: registro.lote,
      producto: registro.producto,
      peso: nuevoPeso,
    });

    if (historialOperador) {
      const siguiente = {
        nombre: historialOperador.nombre,
        entries: historialOperador.entries.map((item) =>
          item.id === registro.id ? { ...item, peso: nuevoPeso } : item
        )
      };
      setHistorialOperador(siguiente);
    }
  };

  const siguienteNumeroPesaje = registros.length + 1;

  useEffect(() => {
    cargarRegistros();
  }, []);

  const cargarRegistros = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/produccion');
      const json = await res.json();

      if (!res.ok || !json.ok) {
        throw new Error(json.error || 'No se pudieron cargar los pesajes.');
      }

      setRegistros(json.data || []);
      setError(null);
    } catch (err) {
      console.error('Error cargando pesajes:', err);
      setError(err instanceof Error ? err.message : 'Error cargando pesajes.');
      setRegistros([]);
    } finally {
      setLoading(false);
    }
  };

  const agregarRegistro = async (nuevoDato: Omit<RegistroPesaje, 'id' | 'fecha' | 'numeroPesaje'>) => {
    try {
      setLoading(true);
      const res = await fetch('/api/produccion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...nuevoDato,
          fecha: new Date().toISOString(),
          numeroPesaje: registros.length + 1,
        })
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || 'No se pudo guardar el pesaje.');
      }

      setRegistros(prev => [json.data, ...prev]);
      setError(null);
    } catch (err) {
      console.error('Error guardando pesaje:', err);
      setError(err instanceof Error ? err.message : 'Error guardando pesaje.');
    } finally {
      setLoading(false);
    }
  };

  const calcularTotales = (items: RegistroPesaje[]) => {
    const map = new Map<string, { nombre: string; count: number; peso: number }>();

    items.forEach(r => {
      const nombreOriginal = (r.nombre || 'Sin nombre').trim() || 'Sin nombre';
      const key = normalizeOperatorName(nombreOriginal);
      const cur = map.get(key) ?? { nombre: nombreOriginal, count: 0, peso: 0 };

      cur.count += 1;
      cur.peso += Number(r.peso ?? 0);
      if (!cur.nombre || cur.nombre === 'Sin nombre') {
        cur.nombre = nombreOriginal;
      }

      map.set(key, cur);
    });

    return Array.from(map.values()).map(v => ({ nombre: v.nombre, count: v.count, peso: v.peso }));
  };

  const abrirConfirmacionEliminar = (title: string, message: string, onConfirm: () => Promise<void> | void) => {
    setHistorialOperador(null);
    setConfirmDelete({ open: true, title, message, onConfirm });
  };

  const manejarCorteTurno = async () => {
    if (registros.length === 0) {
      showToast('No hay pesajes para realizar el corte.', 'error');
      return;
    }

    const confirmarCorte = window.confirm('¿Realizar corte de turno?');
    if (!confirmarCorte) {
      return;
    }

    try {
      const totales = calcularTotales(registros);
      totales.sort((a, b) => b.peso - a.peso);
      const rows = operatorSummaryRows(totales);
      const filename = `corte_resumen_${new Date().toISOString().replace(/[:.]/g,'-')}.csv`;
      exportToCSV(filename, rows);
    } catch (e) {
      console.error('Error exportando CSV', e);
    }

    try {
      const res = await fetch('/api/produccion/corte', {
        method: 'POST',
      });
      const json = await res.json();

      if (!res.ok || !json.ok) {
        throw new Error(json.message || 'Error al guardar el corte en el servidor.');
      }

      await cargarRegistros();
      showToast('Corte realizado correctamente.', 'success');
    } catch (err) {
      console.error(err);
      showToast(err instanceof Error ? err.message : 'Error al enviar datos al servidor.', 'error');
    }
  };

  const eliminarRegistro = async (id: string) => {
    abrirConfirmacionEliminar(
      'Eliminar pesaje',
      '¿Deseas eliminar este pesaje? Esta acción no se puede deshacer.',
      async () => {
        try {
          setLoading(true);
          const res = await fetch(`/api/produccion?id=${encodeURIComponent(id)}`, {
            method: 'DELETE',
          });
          const json = await res.json();

          if (!res.ok || !json.ok) {
            throw new Error(json.error || 'No se pudo eliminar el pesaje.');
          }

          await cargarRegistros();
          showToast('Pesaje eliminado correctamente.', 'success');
        } catch (err) {
          console.error('Error eliminando pesaje:', err);
          showToast(err instanceof Error ? err.message : 'No se pudo eliminar el pesaje.', 'error');
        } finally {
          setLoading(false);
          setConfirmDelete(null);
        }
      }
    );
  };

  // Mapa de número por operador (conteo incremental por empleado)
  const numeroPorOperador = useMemo(() => {
    const map = new Map<string, number>();
    const counts = new Map<string, number>();
    // Iterar de más antiguo a más nuevo para contar secuencialmente
    [...registros].reverse().forEach(r => {
      const nombre = r.nombre || 'Sin nombre';
      const c = (counts.get(nombre) || 0) + 1;
      counts.set(nombre, c);
      map.set(r.id, c);
    });
    return map;
  }, [registros]);

  return (
    // Se añade min-h-screen y bg-slate-50 para cubrir toda la página
    <div className="min-h-screen w-full bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Panel de Producción</h1>
            <p className="text-slate-500">Gestión de pesajes y lotes.</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={manejarCorteTurno}
              disabled={registros.length === 0 || loading}
              className="bg-white border border-slate-300 text-slate-700 px-4 py-2.5 rounded-lg font-medium hover:bg-slate-50 disabled:opacity-50"
            >
              Hacer Corte
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              disabled={loading}
              className="bg-emerald-600 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-emerald-700 shadow-sm disabled:opacity-60"
            >
              Capturar Pesaje
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Totales por operador */}
        <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {calcularTotales(registros).map(t => {
            const registrosOperador = registros.filter(r => normalizeOperatorName(r.nombre || 'Sin nombre') === normalizeOperatorName(t.nombre));
            return (
              <div
                key={t.nombre}
                onClick={() => abrirHistorialOperador(t.nombre)}
                className="cursor-pointer p-3 bg-white rounded-lg border shadow-sm flex justify-between items-center gap-3 transition hover:border-emerald-200 hover:shadow-md"
              >
                <div>
                  <div className="text-sm font-medium text-slate-600">{t.nombre}</div>
                  <div className="text-xs text-slate-400">{t.count} pesajes</div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className="text-lg font-bold text-emerald-600">{t.peso.toFixed(2)} KG</div>
                  </div>

                  {registrosOperador.length > 0 && (
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        const ids = registrosOperador.map(r => r.id);
                        abrirConfirmacionEliminar(
                          'Eliminar pesajes',
                          `¿Deseas eliminar ${ids.length} pesaje${ids.length > 1 ? 's' : ''} de ${t.nombre}?`,
                          async () => {
                            try {
                              setLoading(true);
                              const responses = await Promise.all(
                                ids.map(id => fetch(`/api/produccion?id=${encodeURIComponent(id)}`, { method: 'DELETE' }))
                              );

                              const failed = responses.find(r => !r.ok);
                              if (failed) {
                                const json = await failed.json().catch(() => ({}));
                                throw new Error(json.error || 'No se pudo eliminar el pesaje.');
                              }

                              await cargarRegistros();
                              showToast('Pesajes eliminados correctamente.', 'success');
                            } catch (err) {
                              console.error('Error eliminando pesajes:', err);
                              showToast(err instanceof Error ? err.message : 'No se pudo eliminar el pesaje.', 'error');
                            } finally {
                              setLoading(false);
                              setConfirmDelete(null);
                            }
                          }
                        );
                      }}
                      aria-label={`Eliminar pesajes de ${t.nombre}`}
                      disabled={loading}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
                        <path d="M3 6h18" />
                        <path d="M8 6V4h8v2" />
                        <path d="M19 6l-1 14H6L5 6" />
                        <path d="M10 11v6M14 11v6" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Total global de KG */}
        <div className="mb-6">
          <div className="p-3 bg-white rounded-lg border shadow-sm inline-flex items-center gap-4">
            <div className="text-sm text-slate-500">Total kilos (todos los operadores)</div>
            <div className="text-xl font-bold text-emerald-600">{calcularTotales(registros).reduce((s, t) => s + t.peso, 0).toFixed(2)} KG</div>
          </div>
        </div>

        {registros.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
            No hay pesajes registrados.
          </div>
        )}

        {historialOperador && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Historial de {historialOperador.nombre}</h3>
                  <p className="text-xs text-slate-500">Haz clic en un registro para corregir el peso.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setHistorialOperador(null)}
                  className="rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-600"
                >
                  Cerrar
                </button>
              </div>

              <div className="max-h-[70vh] space-y-3 overflow-y-auto p-4">
                {historialOperador.entries.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                    No hay pesajes para este operador.
                  </div>
                ) : (
                  historialOperador.entries.map((registro) => (
                    <div key={registro.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{registro.fecha}</p>
                          <p className="text-sm text-slate-600">Lote: {registro.lote || 'Sin especificar'}</p>
                        </div>
                        <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                          {Number(registro.peso).toFixed(2)} KG
                        </span>
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        <input
                          type="number"
                          step="0.01"
                          value={pesoEditado[registro.id] ?? String(registro.peso)}
                          onChange={(event) =>
                            setPesoEditado((prev) => ({ ...prev, [registro.id]: event.target.value }))
                          }
                          className="w-28 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-emerald-500"
                        />
                        <span className="text-sm text-slate-500">kg</span>
                        <button
                          type="button"
                          onClick={() => guardarPesoDesdeHistorial(registro)}
                          className="ml-auto rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white"
                        >
                          Guardar
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {confirmDelete?.open && (
          <div className="fixed inset-x-0 top-4 z-50 flex justify-center px-3 sm:px-4">
            <div className="w-full max-w-[92vw] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.18)] sm:max-w-md">
              <div className="bg-linear-to-r from-red-50 to-rose-50 px-4 pb-3 pt-4 sm:px-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600 ring-6 ring-red-50">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
                      <path d="M12 9v4" />
                      <path d="M12 17h.01" />
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-bold text-slate-800">{confirmDelete.title}</h3>
                    <p className="mt-1 text-sm leading-5 text-slate-600">{confirmDelete.message}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-2 bg-white px-4 py-3 sm:flex-row sm:justify-end sm:px-5">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (confirmDelete.onConfirm) {
                      confirmDelete.onConfirm();
                    }
                  }}
                  className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-red-200 transition hover:bg-red-700"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        )}

        <ModalProduccion 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          onGuardarPesaje={agregarRegistro}
          onEditarPesaje={editarRegistro}
          historialRegistros={registros}
          siguienteNumero={siguienteNumeroPesaje}
          existingNames={Array.from(new Set(registros.map(r => r.nombre).filter(Boolean)))}
          empleadosDisponibles={empleadosProduccion.map((usuario) => ({
            id: usuario.id,
            nombre: usuario.nombre || 'Sin nombre',
            numero_empleado: usuario.numero_empleado || '',
          }))}
        />
      </div>  
    </div>
  );
}
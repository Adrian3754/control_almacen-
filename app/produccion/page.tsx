"use client";

import ModalProduccion, { RegistroPesaje } from '@/components/modals/ModalProduccion';
import { exportToCSV } from '@/lib/excel';
import React, { useState, useMemo, useEffect } from 'react';
import { operatorSummaryRows } from '@/lib/excel';

export default function ProduccionPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [registros, setRegistros] = useState<RegistroPesaje[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    const map = new Map<string, { count: number; peso: number }>();
    items.forEach(r => {
      const key = r.nombre || 'Sin nombre';
      const cur = map.get(key) ?? { count: 0, peso: 0 };
      cur.count += 1;
      cur.peso += Number(r.peso ?? 0);
      map.set(key, cur);
    });
    return Array.from(map.entries()).map(([nombre, v]) => ({ nombre, ...v }));
  };

  const manejarCorteTurno = async () => {
    if (registros.length === 0) {
      alert('No hay pesajes para realizar el corte.');
      return;
    }

    if (!window.confirm('¿Realizar corte de turno?')) {
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
      alert('Corte realizado correctamente.');
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Error al enviar datos al servidor.');
    }
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
          {calcularTotales(registros).map(t => (
            <div key={t.nombre} className="p-3 bg-white rounded-lg border shadow-sm flex justify-between items-center">
              <div>
                <div className="text-sm font-medium text-slate-600">{t.nombre}</div>
                <div className="text-xs text-slate-400">{t.count} pesajes</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-emerald-600">{t.peso.toFixed(2)} KG</div>
              </div>
            </div>
          ))}
        </div>

        {/* Total global de KG */}
        <div className="mb-6">
          <div className="p-3 bg-white rounded-lg border shadow-sm inline-flex items-center gap-4">
            <div className="text-sm text-slate-500">Total kilos (todos los operadores)</div>
            <div className="text-xl font-bold text-emerald-600">{calcularTotales(registros).reduce((s, t) => s + t.peso, 0).toFixed(2)} KG</div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">

          </div>
        </div>

        <ModalProduccion 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          onGuardarPesaje={agregarRegistro}
          siguienteNumero={siguienteNumeroPesaje}
        />
      </div>
    </div>
  );
}
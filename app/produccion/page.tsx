"use client";

import ModalProduccion, { RegistroPesaje } from '@/components/modals/ModalProduccion';
import React, { useState } from 'react';

export default function ProduccionPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [registros, setRegistros] = useState<RegistroPesaje[]>([]);

  const siguienteNumeroPesaje = registros.length + 1;

  const agregarRegistro = (nuevoDato: Omit<RegistroPesaje, 'id' | 'fecha' | 'numeroPesaje'>) => {
    const registroCompleto: RegistroPesaje = {
      ...nuevoDato,
      id: Math.random().toString(36).substring(2, 9),
      fecha: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      numeroPesaje: siguienteNumeroPesaje
    };
    setRegistros([registroCompleto, ...registros]);
  };

  const manejarCorteTurno = () => {
    if (registros.length === 0) return;
    if (window.confirm("¿Realizar corte de turno?")) {
      setRegistros([]);
    }
  };

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
              disabled={registros.length === 0}
              className="bg-white border border-slate-300 text-slate-700 px-4 py-2.5 rounded-lg font-medium hover:bg-slate-50 disabled:opacity-50"
            >
              Hacer Corte
            </button>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-emerald-600 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-emerald-700 shadow-sm"
            >
              Capturar Pesaje #{siguienteNumeroPesaje}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Nº</th>
                <th className="px-6 py-4">Hora</th>
                <th className="px-6 py-4">Operador</th>
                <th className="px-6 py-4">Lote</th>
                <th className="px-6 py-4 text-right">Peso (KG)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {registros.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">No hay registros aún.</td>
                </tr>
              ) : (
                registros.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-bold text-slate-900">#{r.numeroPesaje}</td>
                    <td className="px-6 py-4">{r.fecha}</td>
                    <td className="px-6 py-4 text-slate-900 font-medium">{r.nombre}</td>
                    <td className="px-6 py-4">{r.lote}</td>
                    <td className="px-6 py-4 text-right font-bold text-emerald-600">{r.peso.toFixed(2)} KG</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
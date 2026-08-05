"use client";

import { useState, useEffect } from "react";
import { getLotesAction, type Lote } from "@/components/actions/lotes.actions";
import { createMuestreoAction, type MuestreoItem } from "@/components/actions/calidad.actions";

type Props = {
  onCreated: (item: MuestreoItem) => void;
  onCancel?: () => void;
};

export default function CalidadForm({ onCreated, onCancel }: Props) {
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [loadingLotes, setLoadingLotes] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  const [form, setForm] = useState({
    loteId: "", 
    numeroMesa: "",
    pesoMuestra: "",
    pesoBueno: "",
    pesoMalo: "",
    porcentajeBueno: 0,
    porcentajeMalo: 0,
    observaciones: ""
  });

  useEffect(() => {
    async function cargarLotes() {
      try {
        setLoadingLotes(true);
        const data = await getLotesAction();
        const lotesActivos = data.filter(l => l.kilos > 0 && l.estado !== "Descargado");
        setLotes(lotesActivos.length > 0 ? lotesActivos : data);
        
        if (data.length > 0) {
          setForm(prev => ({ ...prev, loteId: String(data[0].id) }));
        }
      } catch (err) {
        console.error("❌ Error cargando lotes en el formulario:", err);
        setErrorForm("No se pudieron cargar los lotes de yaca.");
      } finally {
        setLoadingLotes(false);
      }
    }
    cargarLotes();
  }, []);

  useEffect(() => {
    const pMuestra = parseFloat(form.pesoMuestra) || 0;
    const pBueno = parseFloat(form.pesoBueno) || 0;
    const pMalo = parseFloat(form.pesoMalo) || 0;

    if (pMuestra > 0) {
      setForm(prev => ({
        ...prev,
        porcentajeBueno: Math.round((pBueno / pMuestra) * 100),
        porcentajeMalo: Math.round((pMalo / pMuestra) * 100)
      }));
    }
  }, [form.pesoMuestra, form.pesoBueno, form.pesoMalo]);

  const handlePesoBuenoChange = (valor: string) => {
    const pMuestra = parseFloat(form.pesoMuestra) || 0;
    const pBueno = parseFloat(valor) || 0;

    if (pMuestra > 0 && valor !== "") {
      const pMaloCalculado = Math.max(0, pMuestra - pBueno);
      setForm(prev => ({
        ...prev,
        pesoBueno: valor,
        pesoMalo: pMaloCalculado % 1 === 0 ? String(pMaloCalculado) : pMaloCalculado.toFixed(2)
      }));
    } else {
      setForm(prev => ({ ...prev, pesoBueno: valor }));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.loteId) {
      setErrorForm("Por favor, selecciona un lote de origen.");
      return;
    }

    setSubmitting(true);
    setErrorForm(null);

    try {
      const loteObj = lotes.find(l => String(l.id) === form.loteId);
      const codigoVisual = loteObj ? `${loteObj.camion} — ${loteObj.producto}` : "Sin Lote";

      const nuevoRegistro = await createMuestreoAction({
        loteId: Number(form.loteId),
        codigoLote: codigoVisual, 
        numeroMesa: Number(form.numeroMesa),
        pesoMuestra: Number(form.pesoMuestra),
        pesoBueno: Number(form.pesoBueno || 0),
        pesoMalo: Number(form.pesoMalo || 0),
        porcentajeBueno: form.porcentajeBueno,
        porcentajeMalo: form.porcentajeMalo,
        observaciones: form.observaciones.trim() || null,
      });

      onCreated(nuevoRegistro);
    } catch (err: any) {
      console.error("❌ Error al guardar muestreo:", err);
      setErrorForm(err.message || "Ocurrió un error al guardar el registro.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
      {errorForm && (
        <div className="sm:col-span-2 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700 border border-rose-100">
          ⚠️ {errorForm}
        </div>
      )}

      <div className="sm:col-span-2">
        <label className="block text-sm font-medium text-slate-700">Lote / Camión de Origen</label>
        {loadingLotes ? (
          <div className="mt-1 h-10 w-full animate-pulse rounded-xl bg-slate-100 border border-slate-200" />
        ) : (
          <select
            required
            className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-slate-900 bg-white shadow-xs focus:border-sky-500 focus:outline-hidden"
            value={form.loteId}
            onChange={e => setForm({ ...form, loteId: e.target.value })}
          >
            <option value="" disabled>-- Selecciona procedencia de la fruta --</option>
            {lotes.map((l) => (
              <option key={l.id} value={l.id}>
                Lote {l.id}: {l.camion} — {l.producto} ({l.kilos} kg disponibles)
              </option>
            ))}
          </select>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">Número de Mesa</label>
        <input 
          type="number" required
          className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-slate-900 focus:border-sky-500 focus:outline-hidden"
          value={form.numeroMesa}
          onChange={e => setForm({...form, numeroMesa: e.target.value})}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Peso Total Muestra (G)</label>
        <input 
          type="number" required step="0.01"
          className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-slate-900 focus:border-sky-500 focus:outline-hidden"
          value={form.pesoMuestra}
          onChange={e => setForm({...form, pesoMuestra: e.target.value})}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Peso Bueno (G)</label>
        <input 
          type="number" required step="0.01"
          className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-slate-900 focus:border-sky-500 focus:outline-hidden"
          value={form.pesoBueno} 
          onChange={e => handlePesoBuenoChange(e.target.value)} 
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Peso Malo (G)</label>
        <input 
          type="number" required step="0.01"
          className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-slate-900 focus:border-sky-500 focus:outline-hidden bg-slate-50 font-medium"
          value={form.pesoMalo}
          onChange={e => setForm({...form, pesoMalo: e.target.value})} 
        />
      </div>
      
      <div className="sm:col-span-2 grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-dashed border-slate-200">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Porcentaje Bueno</p>
          <p className="text-xl font-bold text-emerald-600">{form.porcentajeBueno}%</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Porcentaje Malo</p>
          <p className="text-xl font-bold text-rose-600">{form.porcentajeMalo}%</p>
        </div>
      </div>

      <div className="sm:col-span-2">
        <label className="block text-sm font-medium text-slate-700">Observaciones</label>
        <textarea 
          className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 h-20 text-slate-900 resize-none focus:border-sky-500 focus:outline-hidden"
          value={form.observaciones}
          onChange={e => setForm({...form, observaciones: e.target.value})}
        />
      </div>
      
      <div className="sm:col-span-2 flex justify-end gap-3 mt-4">
        <button 
          type="button" 
          onClick={onCancel} 
          disabled={submitting}
          className="rounded-full px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
        >
          Cancelar
        </button>
        <button 
          type="submit" 
          disabled={submitting || loadingLotes}
          className="rounded-full bg-sky-600 px-5 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
        >
          {submitting ? "Guardando..." : "Guardar Registro"}
        </button>
      </div>
    </form>
  );
}
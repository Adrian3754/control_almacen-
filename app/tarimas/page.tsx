"use client";

import JsBarcode from "jsbarcode";
import { useEffect, useMemo, useState, useRef } from "react";
import { getTarimasAction, createTarimaAction, type Tarima, type NewTarimaData } from "@/components/actions/tarima.actions";
import { getLotesAction, registrarDescargaParcialAction, type Lote } from "@/components/actions/lotes.actions";

export default function TarimasPage() {
  const [tarimas, setTarimas] = useState<Tarima[]>([]);
  const [lotes, setLotes] = useState<Lote[]>([]); 
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string>("");
  const [errorAlert, setErrorAlert] = useState<string>("");
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  
  // Inputs del formulario controlados
  const [loteId, setLoteId] = useState<string>(""); 
  const [description, setDescription] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [weight, setWeight] = useState<number>(600);
  const [generatedTarima, setGeneratedTarima] = useState<Tarima | null>(null);

  const activeSvgRef = useRef<SVGSVGElement | null>(null);

  const barcodeCallbackRef = (node: SVGSVGElement | null) => {
    activeSvgRef.current = node;
    if (node && generatedTarima) {
      try {
        JsBarcode(node, generatedTarima.barcode, {
          format: "CODE128",
          displayValue: true,
          fontSize: 14,
          height: 60,
          width: 2,
        });
      } catch (err) {
        console.error("Error generando código de barras:", err);
      }
    }
  };

  // Carga y mapeo inicial de los datos directo a los estados de React
  async function loadData() {
    setLoading(true);
    try {
      const [tarimasData, lotesData] = await Promise.all([
        getTarimasAction(),
        getLotesAction()
      ]);
      
      setTarimas(tarimasData);

      // CORRECCIÓN: Filtro con minúsculas corregido y mapeado a la propiedad '.kilos'
      const activos = lotesData.filter(l => {
        const estadoLimpio = l.estado?.trim().toLowerCase();
        // Evaluamos de forma segura los estados válidos
        const estadoValido = estadoLimpio === "descargando" || estadoLimpio === "en descarga";
        const tieneKilos = Number(l.kilos) > 0;

        return estadoValido && tieneKilos;
      });
      
      setLotes(activos);  
    } catch (err) {
      console.error("Error al sincronizar datos iniciales:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const stats = useMemo(
    () => ({
      total: tarimas.length,
      abiertas: tarimas.filter((item) => item.status === "Abierta").length,
      cerradas: tarimas.filter((item) => item.status === "Cerrada").length,
    }),
    [tarimas]
  );

  async function generarTarima() {
    if (!loteId.trim()) {
      setErrorAlert("Debe especificar o seleccionar el Lote de Yaca de origen.");
      return;
    }
    if (quantity < 1 || weight < 1) {
      setErrorAlert("La cantidad de frutos y el peso deben ser mayores a cero.");
      return;
    }

    const loteSeleccionado = lotes.find(l => l.id === loteId);
    if (loteSeleccionado && weight > loteSeleccionado.kilos) {
      setErrorAlert(`⚠️ No puedes registrar una tarima de ${weight} kg porque al lote seleccionado solo le quedan ${loteSeleccionado.kilos} kg disponibles.`);
      return;
    }

    setErrorAlert(""); 

    const nuevaTarima: NewTarimaData = {
      weight,
      status: "Abierta",
      description: description.trim() || `Procesamiento de yaca correspondiente al lote con ID: ${loteId}`,
      product: "Yaca",
      quantity,
      lote_id: loteId, 
    };

    try {
      // 1. Insertamos la tarima en su base de datos
      // ⚡ El TRIGGER de PostgreSQL se ejecuta aquí internamente y descuenta los kilos.
      const resultado = await createTarimaAction(nuevaTarima);
      
      // 2. Modificamos el estado local para pintar los cambios al instante
      setTarimas([resultado, ...tarimas]);
      setGeneratedTarima(resultado);
      setMessage(`✅ Tarima registrada con éxito. El inventario del lote se actualizó automáticamente.`);
      setModalOpen(false);

      // Limpieza de inputs restableciendo valores base
      setDescription("");
      setQuantity(1);
      setWeight(600);
      setLoteId(""); // Se limpia la selección para evitar confusiones en el pesaje continuo
      
      // Sincronizamos la lista desplegable trayendo los balances remanentes actualizados
      const nuevosLotes = await getLotesAction();
      
      // Filtro consistente usando '.kilos' y strings limpios
      const nuevosActivos = nuevosLotes.filter(l => {
        const estadoLimpio = l.estado?.trim().toLowerCase();
        const estadoValido = estadoLimpio === "descargando" || estadoLimpio === "en descarga";
        const tieneKilos = Number(l.kilos) > 0;

        return estadoValido && tieneKilos;
      });

      setLotes(nuevosActivos);

    } catch (err: any) {
      setErrorAlert(err.message || "Ocurrió un error inesperado al resguardar la información.");
    }
  }

  useEffect(() => {
    if (!message && !errorAlert) return;
    const identifier = setTimeout(() => {
      setMessage("");
      setErrorAlert("");
    }, 6000);
    return () => clearTimeout(identifier);
  }, [message, errorAlert]);

  function downloadBarcode() {
    if (!generatedTarima || !activeSvgRef.current) return;
    try {
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(activeSvgRef.current);
      const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Etiqueta-${generatedTarima.barcode}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error al descargar el SVG", err);
    }
  }

  return (
    <main className="min-h-screen bg-transparent">
      <div className="mx-auto max-w-7xl space-y-5 p-4 sm:space-y-6 sm:p-6 lg:p-8">
        
        {/* Notificaciones de Sistema */}
        {message && (
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-800 font-medium shadow-sm transition">
            {message}
          </div>
        )}
        {errorAlert && (
          <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-800 font-medium shadow-sm transition">
            ⚠️ {errorAlert}
          </div>
        )}

        <section className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/60 p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Control de Tarimas — Yaca</h1>
              <p className="mt-2 text-slate-600 text-sm">
                Gestión automatizada de embalaje de Yaca. El servidor calcula la secuencia consecutiva de etiquetas y descuenta del lote.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-4">
            <div className="flex flex-col gap-4 rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Embalar nueva tarima</h2>
                <p className="text-sm text-slate-500">Asigna peso, volumen e identifica el lote de la fruta recolectada.</p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-800 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-900"
              >
                + Generar Entrada de Tarima
              </button>
            </div>

            {/* Impresión / Vista Previa */}
            {generatedTarima && (
              <div className="rounded-3xl bg-white border border-slate-200 p-5 shadow-sm space-y-4">
                <h2 className="text-lg font-semibold text-emerald-950">Última Etiqueta Generada</h2>
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <p><span className="font-semibold text-slate-900">Código Asignado:</span> {generatedTarima.barcode}</p>
                  <p><span className="font-semibold text-slate-900">Producto:</span> {generatedTarima.product}</p>
                  <p><span className="font-semibold text-slate-900">Lote Origen:</span> {generatedTarima.lote_id}</p>
                  <p><span className="font-semibold text-slate-900">Peso Total:</span> {generatedTarima.weight} kg</p>
                </div>

                <div className="rounded-3xl bg-white p-4 shadow-inner flex justify-center border border-slate-100">
                  <svg ref={barcodeCallbackRef} className="w-full max-w-sm" />
                </div>

                <button
                  type="button"
                  onClick={downloadBarcode}
                  className="w-full rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 shadow-sm"
                >
                  Descargar Código de Barras Imprimible (.svg)
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Modal del Formulario */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm px-4">
            <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-200 sm:p-8">
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-2xl font-semibold text-slate-900">Registrar Pesaje de Tarima</h2>
                  <p className="mt-1 text-sm text-slate-500">El descuento en el lote origen se procesará de forma inmediata.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 text-2xl font-semibold px-2"
                >
                  ×
                </button>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-xs font-medium text-slate-600">Producto Destinado</span>
                  <input
                    type="text" disabled value="Yaca (Fijo)"
                    className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-sm font-semibold text-slate-700 outline-none cursor-not-allowed"
                  />
                </label>

                {/* Lista Desplegable Unificada */}
                <label className="space-y-1">
                  <span className="text-xs font-medium text-slate-600">Lote de Origen (Camión)</span>
                  <select
                    required
                    value={loteId}
                    onChange={(e) => setLoteId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10"
                  >
                    <option value="">-- Seleccionar Camión Activo --</option>
                    {lotes.length === 0 ? (
                      <option value="" disabled>No hay camiones en descarga disponibles</option>
                    ) : (
                      lotes.map((lote) => (
                        <option key={lote.id} value={lote.id}>
                          {/* CORRECCIÓN: Se renderiza usando '.kilos' */}
                          {lote.camion} — Disponible: {lote.kilos} kg
                        </option>
                      ))
                    )}
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="text-xs font-medium text-slate-600">Cantidad (Frutos / Bultos)</span>
                  <input
                    type="number" min={1} value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-xs font-medium text-slate-600">Peso Neto de Tarima (kg)</span>
                  <input
                    type="number" min={1} value={weight}
                    onChange={(e) => setWeight(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10"
                  />
                </label>

                <label className="sm:col-span-2 space-y-1">
                  <span className="text-xs font-medium text-slate-600">Notas u Observaciones de Calidad</span>
                  <textarea
                    placeholder="Escribe comentarios sobre las condiciones de la fruta si es necesario..." value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="min-h-16 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10"
                  />
                </label>
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={generarTarima}
                  className="min-h-11 rounded-xl bg-emerald-800 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-900"
                >
                  Validar y Registrar Tarima
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Indicadores */}
        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl bg-white border border-slate-200 p-5 shadow-sm">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Tarimas totales en stock</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{stats.total}</p>
          </div>
          <div className="rounded-3xl bg-white border border-slate-200 p-5 shadow-sm">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Tarimas abiertas / En revisión</p>
            <p className="mt-2 text-3xl font-bold text-amber-600">{stats.abiertas}</p>
          </div>
          <div className="rounded-3xl bg-white border border-slate-200 p-5 shadow-sm">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Tarimas despachadas</p>
            <p className="mt-2 text-3xl font-bold text-emerald-600">{stats.cerradas}</p>
          </div>
        </section>

        {/* Tabla */}
        <section className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900 mb-1">Historial de Trazabilidad</h2>
          <p className="text-xs text-slate-500 mb-4">Registro cronológico de tarimas de yaca processed.</p>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="text-center py-8 text-sm text-slate-400">Sincronizando inventario con base de datos...</div>
            ) : tarimas.length === 0 ? (
              <div className="text-center py-8 text-sm text-slate-400">No hay registros de tarimas de Yaca disponibles.</div>
            ) : (
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-600 font-medium text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3">Código Tarima</th>
                    <th className="px-4 py-3">Lote Procedencia</th>
                    <th className="px-4 py-3">Variedad / Producto</th>
                    <th className="px-4 py-3 text-center">Frutos Est.</th>
                    <th className="px-4 py-3 text-center">Peso Neto</th>
                    <th className="px-4 py-3 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {tarimas.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3.5 font-mono font-bold text-slate-900">{item.barcode}</td>
                      <td className="px-4 py-3.5"><span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-800">{item.lote_id}</span></td>
                      <td className="px-4 py-3.5 font-medium">{item.product}</td>
                      <td className="px-4 py-3.5 text-center">{item.quantity} pzas</td>
                      <td className="px-4 py-3.5 text-center font-semibold text-slate-900">{item.weight} kg</td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          item.status === "Abierta" ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        }`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

      </div>
    </main>
  );
}
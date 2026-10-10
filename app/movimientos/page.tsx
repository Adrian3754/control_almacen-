"use client";

import { useEffect, useMemo, useState } from "react";
import { 
  getMovimientosAction, 
  createMovimientoAction, 
  getTarimaByCodigoAction, 
  type Movimiento, 
  type NewMovimiento 
} from "@/components/actions/movimiento.actions";

type TipoMovimiento = "Entrada" | "Salida";
type Ubicacion = "Almacén" | "Cuarto frío";

export default function MovimientosPage() {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [tarima, setTarima] = useState("");
  const [barcodeSearch, setBarcodeSearch] = useState("");
  const [tipo, setTipo] = useState<TipoMovimiento>("Entrada");
  const [ubicacion, setUbicacion] = useState<Ubicacion>("Cuarto frío");
  const [kilos, setKilos] = useState<number | "">(0); 
  const [temperatura, setTemperatura] = useState<number | "">(8);
  
  // Estados sugeridos iniciales
  const [estado, setEstado] = useState("Listo / Maduro");
  const [observacion, setObservacion] = useState("Yaca en buen estado");
  
  const [isEditing, setIsEditing] = useState(false);
  const [, setEditingId] = useState<string | null>(null);

  // Cargar el historial de movimientos al iniciar
  useEffect(() => {
    let mounted = true;
    async function loadMovimientos() {
      try {
        setLoading(true);
        const data = await getMovimientosAction();
        if (mounted) setMovimientos(data);
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadMovimientos();
    return () => { mounted = false; };
  }, []);

  // EFECTO DE AUTO-COMPLETADO AUTOMÁTICO
  useEffect(() => {
    if (!barcodeSearch.trim()) return;

    let active = true;
    const delayDebounce = setTimeout(async () => {
      const tarimaEncontrada = await getTarimaByCodigoAction(barcodeSearch);
      
      if (tarimaEncontrada && active) {
        setTarima(tarimaEncontrada.barcode || "");
        setKilos(tarimaEncontrada.weight ?? 0); 
        setUbicacion((tarimaEncontrada.ubicacion as Ubicacion) || "Cuarto frío");
        setTemperatura(tarimaEncontrada.temperatura ?? 8);
        setEstado(tarimaEncontrada.estado === "Bueno" ? "Listo / Maduro" : "Falta Madurar (Verde)");
        setObservacion(
          tarimaEncontrada.estado === "Bueno" 
            ? "Yaca en buen estado" 
            : "Regresado a cámara por falta de maduración"
        );
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(delayDebounce);
    };
  }, [barcodeSearch]);

  // ESTADÍSTICAS REVISADAS (DISPONIBLES, VERDES Y MERMA TOTAL)
  const stats = useMemo(() => {
    const balanceTarimas = new Map<string, { 
      tarima: string; 
      kilos: number; 
      ubicacion: Ubicacion; 
      estado: string; 
    }>();

    let kilosMermas = 0; 
    let kilosDevueltosVerdes = 0;

    [...movimientos].reverse().forEach((movimiento) => {
      const existe = balanceTarimas.get(movimiento.tarima);
      const est = movimiento.estado.toLowerCase();
      const mot = movimiento.motivo.toLowerCase();

      if (movimiento.tipo === "Entrada") {
        if (est.includes("verde") || est.includes("falta madur") || mot.includes("regres") || mot.includes("no madur") || mot.includes("verde")) {
          kilosDevueltosVerdes += movimiento.kilos;
        }

        balanceTarimas.set(movimiento.tarima, {
          tarima: movimiento.tarima,
          kilos: (existe ? existe.kilos : 0) + movimiento.kilos,
          ubicacion: movimiento.ubicacion as Ubicacion,
          estado: movimiento.estado
        });
      } 
      else if (movimiento.tipo === "Salida") {
        if (existe) {
          const nuevosKilos = existe.kilos - movimiento.kilos;
          
          if (
            est.includes("mal") || est.includes("pudra") || est.includes("podrid") || est.includes("sobre") || est.includes("pasado") ||
            mot.includes("pudra") || mot.includes("dañ") || mot.includes("merma") || mot.includes("sobre") || mot.includes("maduradzo")
          ) {
            kilosMermas += movimiento.kilos;
          }

          balanceTarimas.set(movimiento.tarima, {
            ...existe,
            kilos: nuevosKilos >= 0 ? nuevosKilos : 0, 
            estado: movimiento.estado 
          });
        }
      }
    });

    let enFrio = 0;
    let enAlmacen = 0;
    let kilosBuenos = 0;

    balanceTarimas.forEach((item) => {
      if (item.kilos <= 0) return;

      kilosBuenos += item.kilos;
      if (item.ubicacion === "Cuarto frío") {
        enFrio += item.kilos; // ⚡ Suma acumulada de kilos reales en frío
      } else if (item.ubicacion === "Almacén") {
        enAlmacen++; // Conteo de Tarimas
      }
    });

    return { enFrio, enAlmacen, kilosBuenos, kilosMermas, kilosDevueltosVerdes };
  }, [movimientos]);

  function resetForm() {
    setTarima("");
    setBarcodeSearch("");
    setTipo("Entrada");
    setUbicacion("Cuarto frío");
    setKilos(0);
    setTemperatura(8);
    setEstado("Listo / Maduro");
    setObservacion("Yaca en buen estado");
    setEditingId(null);
    setIsEditing(false);
  }

  function abrirModalNuevo() {
    resetForm();
    setModalOpen(true);
  }

  function editarMovimiento(item: Movimiento) {
    setEditingId(item.id);
    setIsEditing(true);
    setTarima(item.tarima);
    setBarcodeSearch(item.tarima);
    setTipo(item.tipo);
    setUbicacion(item.ubicacion);
    setKilos(item.kilos);
    setTemperatura(item.temperatura);
    setEstado(item.estado);
    setObservacion(item.motivo);
    setModalOpen(true);
  }

  function handleBarcodeKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
    }
  }

  async function registrarMovimiento() {
    const kilosNumerico = Number(kilos);
    const tempNumerica = Number(temperatura);

    if (!tarima.trim() || kilosNumerico <= 0 || tempNumerica <= 0) return;

    const motivo = observacion.trim() || "Sin motivo registrado";
    const item: NewMovimiento = {
      tarima: tarima.trim(),
      tipo,
      ubicacion,
      kilos: kilosNumerico,
      temperatura: tempNumerica,
      estado,
      motivo,
      fecha: new Date().toLocaleString("es-ES", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    try {
      const nuevo = await createMovimientoAction(item);
      setMovimientos([nuevo, ...movimientos]);
      setModalOpen(false);
      resetForm();
    } catch (err) {
      alert("Error al guardar el movimiento en el servidor.");
    }
  }

  const inputStyle = "w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-600/10 transition";

  return (
    <main className="min-h-screen bg-transparent">
      <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
        <section className="mb-6 rounded-3xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/60 p-5 shadow-sm sm:mb-8 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-slate-900">Movimientos de yaca</h1>
              <p className="mt-2 text-slate-600">
                Control de inventario, mermas por sobremaduración/daño y retornos de tarimas verdes.
              </p>
            </div>
            <button
              type="button"
              onClick={abrirModalNuevo}
              className="min-h-11 rounded-xl bg-emerald-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-900"
            >
              Registrar movimiento
            </button>
          </div>
        </section>

        {/* INDICADORES */}
        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Kilos en Cuarto Frío</p>
            <p className="mt-2 text-2xl font-bold text-emerald-800">
              {loading ? "..." : `${stats.enFrio} Kg`}
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">En Almacén</p>
            <p className="mt-2 text-2xl font-bold text-emerald-700">
              {loading ? "..." : `${stats.enAlmacen} Tarimas`}
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Kilos Disponibles (Buenos)</p>
            <p className="mt-2 text-2xl font-bold text-amber-600">
              {loading ? "..." : `${stats.kilosBuenos} kg`}
            </p>
          </div>
          <div className="rounded-3xl border border-amber-200 bg-amber-50/60 p-4 shadow-sm">
            <p className="text-xs font-medium text-amber-800 uppercase tracking-wider">Devueltos (Falta Madurar)</p>
            <p className="mt-2 text-2xl font-bold text-amber-700">
              {loading ? "..." : `${stats.kilosDevueltosVerdes} kg`}
            </p>
          </div>
          <div className="rounded-3xl border border-rose-200 bg-rose-50/50 p-4 shadow-sm">
            <p className="text-xs font-medium text-rose-700 uppercase tracking-wider">Kilos de Merma total</p>
            <p className="mt-2 text-2xl font-bold text-rose-600">
              {loading ? "..." : `${stats.kilosMermas} kg`}
            </p>
          </div>
        </section>

        {/* Tabla */}
        <section className="rounded-3xl border border-emerald-100 bg-white p-4 shadow-sm sm:p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Últimos movimientos</h2>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="text-center py-8 text-sm text-slate-500">Cargando...</div>
            ) : (
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-emerald-50/70">
                  <tr>
                    <th className="px-4 py-3 font-medium text-slate-600">Tarima</th>
                    <th className="px-4 py-3 font-medium text-slate-600">Tipo</th>
                    <th className="px-4 py-3 font-medium text-slate-600">Ubicación</th>
                    <th className="px-4 py-3 font-medium text-slate-600">Kilos</th>
                    <th className="px-4 py-3 font-medium text-slate-600">Temp.</th>
                    <th className="px-4 py-3 font-medium text-slate-600">Estado</th>
                    <th className="px-4 py-3 font-medium text-slate-600">Motivo</th>
                    <th className="px-4 py-3 font-medium text-slate-600">Fecha</th>
                    <th className="px-4 py-3 font-medium text-slate-600">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {movimientos.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-4 py-4 font-medium text-slate-800">{item.tarima}</td>
                      <td className="px-4 py-4 text-slate-600">{item.tipo}</td>
                      <td className="px-4 py-4 text-slate-600">{item.ubicacion}</td>
                      <td className="px-4 py-4 text-slate-600">{item.kilos} kg</td>
                      <td className="px-4 py-4 text-slate-600">{item.temperatura}°C</td>
                      <td className="px-4 py-4">
                        <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                          {item.estado}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-slate-600">{item.motivo}</td>
                      <td className="px-4 py-4 text-slate-600">{item.fecha}</td>
                      <td className="px-4 py-4">
                        <button
                          type="button"
                          onClick={() => editarMovimiento(item)}
                          className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* MODAL DE REGISTRO */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-200 sm:p-8">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-slate-900">{isEditing ? "Editar movimiento" : "Registrar movimiento"}</h2>
                  <p className="mt-1 text-sm text-slate-500">Clasifica el estado y destino de la fruta.</p>
                </div>
                <button type="button" onClick={() => { setModalOpen(false); resetForm(); }} className="text-2xl font-medium text-slate-400 hover:text-slate-600">×</button>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 sm:col-span-2">
                  <span className="text-sm font-semibold text-slate-700">Escanear código de barras</span>
                  <input
                    value={barcodeSearch}
                    onChange={(event) => setBarcodeSearch(event.target.value)}
                    onKeyDown={handleBarcodeKeyDown}
                    className={inputStyle}
                    placeholder="Escribe o pasa la pistola lectora..."
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Tarima</span>
                  <input value={tarima} onChange={(event) => setTarima(event.target.value)} className={inputStyle} />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Tipo de Acción</span>
                  <select value={tipo} onChange={(event) => setTipo(event.target.value as TipoMovimiento)} className={inputStyle}>
                    <option value="Entrada">Entrada (Ingreso)</option>
                    <option value="Salida">Salida (Proceso)</option>
                    <option value="Salida">Salida (Merma)</option>
                    <option value="Salida">Regreso por falta de maduración</option>
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Ubicación Física</span>
                  <select value={ubicacion} onChange={(event) => setUbicacion(event.target.value as Ubicacion)} className={inputStyle}>
                    <option value="Almacén">Almacén</option>
                    <option value="Cuarto frío">Cuarto frío</option>
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Kilos</span>
                  <input type="number" value={kilos} onChange={(event) => setKilos(event.target.value === "" ? "" : Number(event.target.value))} className={inputStyle} />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Temperatura</span>
                  <input type="number" value={temperatura} onChange={(event) => setTemperatura(event.target.value === "" ? "" : Number(event.target.value))} className={inputStyle} />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Estado Fisiológico / Calidad</span>
                  <select value={estado} onChange={(event) => setEstado(event.target.value)} className={inputStyle}>
                    <option value="Listo / Maduro">Listo / Maduro (Apto Proceso)</option>
                    <option value="Falta Madurar (Verde)">Falta Madurar (Regresa a Almacén)</option>
                    <option value="Sobremaduro / Merma">Sobremaduro (Descartado como Merma)</option>
                    <option value="Mal Estado / Podrido">Mal Estado / Podrido (Merma)</option>
                  </select>
                </label>

                <label className="sm:col-span-2 space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Motivo de movimiento</span>
                  <select 
                    value={observacion} 
                    onChange={(event) => setObservacion(event.target.value)}
                    className={`${inputStyle} mb-2`}
                  >
                    <option value="Yaca en buen estado">Yaca en buen estado</option>
                    <option value="Regresado a cámara por falta de maduración (Verde)">Regresado a cámara por falta de maduración (Verde)</option>
                    <option value="Descarte por fruta sobremadura / pasada">Descarte por fruta sobremadura / pasada</option>
                    <option value="Desecho por pudrición o daño severo">Desecho por pudrición o daño severo</option>
                  </select>
                  <textarea
                    value={observacion}
                    onChange={(event) => setObservacion(event.target.value)}
                    placeholder="O detalla un motivo manual..."
                    className="min-h-20 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-600/10 transition"
                  />
                </label>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => { setModalOpen(false); resetForm(); }} className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">Cancelar</button>
                <button type="button" onClick={registrarMovimiento} className="rounded-xl bg-emerald-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-900">Guardar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
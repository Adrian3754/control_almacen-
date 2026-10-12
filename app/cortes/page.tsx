"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  actualizarRegistroCorteAction,
  crearProveedorFrutaAction,
  crearRegistroCorteAction,
  eliminarRegistroCorteAction,
  getProveedoresFrutaAction,
  getRegistrosCorteAction,
  type ProveedorFruta,
  type RegistroCorte,
  type RegistroCorteInput,
} from "@/components/actions/cortes.actions";

function localDateValue() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function displayDate(value: string | null) {
  if (!value) return "—";
  return new Date(`${value}T00:00:00`).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function money(value: number) {
  return value.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function number(value: number, digits = 3) {
  return value.toLocaleString("es-MX", { maximumFractionDigits: digits });
}

const emptyForm = (): RegistroCorteInput => ({
  fecha: localDateValue(),
  lugar_origen: "",
  proveedor_id: "",
  factura_flete: "",
  fecha_pago_flete: "",
  viajes: 1,
  numero_lotes: 1,
  peso_kg: 0,
  peso_real_kg: 0,
  precio_unitario_kg: 11,
  factura_ruta: "",
  fecha_factura_ruta: "",
});

export default function CortesPage() {
  const [registros, setRegistros] = useState<RegistroCorte[]>([]);
  const [proveedores, setProveedores] = useState<ProveedorFruta[]>([]);
  const [form, setForm] = useState<RegistroCorteInput>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [nombreProveedor, setNombreProveedor] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingProveedor, setSavingProveedor] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let mounted = true;
    Promise.all([getRegistrosCorteAction(), getProveedoresFrutaAction()])
      .then(([cortes, listaProveedores]) => {
        if (mounted) {
          setRegistros(cortes);
          setProveedores(listaProveedores);
        }
      })
      .catch((loadError: unknown) => {
        if (mounted) {
          setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los cortes.");
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const mermaKg = useMemo(
    () => Math.round((Number(form.peso_kg || 0) * 0.05 + Number.EPSILON) * 1000) / 1000,
    [form.peso_kg]
  );
  const pesoDespuesMerma = useMemo(
    () => Math.round((Number(form.peso_kg || 0) - mermaKg + Number.EPSILON) * 1000) / 1000,
    [form.peso_kg, mermaKg]
  );
  const costoFlete = useMemo(
    () => Math.round((pesoDespuesMerma * 1.4 * 1.16 + Number.EPSILON) * 100) / 100,
    [pesoDespuesMerma]
  );
  const diferenciaKg = useMemo(
    () => Math.round(((Number(form.peso_real_kg || 0) - Number(form.peso_kg || 0)) + Number.EPSILON) * 1000) / 1000,
    [form.peso_kg, form.peso_real_kg]
  );
  const cantidadTotal = useMemo(
    () => Math.round((pesoDespuesMerma * Number(form.precio_unitario_kg || 0) + Number.EPSILON) * 100) / 100,
    [pesoDespuesMerma, form.precio_unitario_kg]
  );

  const filteredRegistros = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("es-MX");
    if (!term) return registros;

    return registros.filter((registro) =>
      [
        String(registro.numero_registro),
        registro.lugar_origen,
        registro.proveedor_nombre,
        String(registro.numero_lotes),
        registro.factura_flete ?? "",
        registro.factura_ruta ?? "",
      ].some((value) => value.toLocaleLowerCase("es-MX").includes(term))
    );
  }, [registros, search]);

  const totalKg = useMemo(
    () => registros.reduce((total, registro) => total + registro.peso_kg, 0),
    [registros]
  );
  const totalPagado = useMemo(
    () => registros.reduce((total, registro) => total + registro.cantidad_total, 0),
    [registros]
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      if (editingId) {
        await actualizarRegistroCorteAction(editingId, form);
      } else {
        await crearRegistroCorteAction(form);
      }
      setForm(emptyForm());
      setEditingId(null);
      setSuccess(editingId ? "Recepción actualizada correctamente." : "Recepción de fruta guardada correctamente.");
      setRegistros(await getRegistrosCorteAction());
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo guardar la recepción.");
    } finally {
      setSaving(false);
    }
  }

  function handleEditReception(registro: RegistroCorte) {
    setForm({
      fecha: registro.fecha,
      lugar_origen: registro.lugar_origen,
      proveedor_id: registro.proveedor_id,
      factura_flete: registro.factura_flete ?? "",
      fecha_pago_flete: registro.fecha_pago_flete ?? "",
      viajes: registro.viajes,
      numero_lotes: registro.numero_lotes,
      peso_kg: registro.peso_kg,
      peso_real_kg: registro.peso_real_kg,
      precio_unitario_kg: registro.precio_unitario_kg,
      factura_ruta: registro.factura_ruta ?? "",
      fecha_factura_ruta: registro.fecha_factura_ruta ?? "",
    });
    setEditingId(registro.id);
    setError("");
    setSuccess("");
    document.getElementById("recepcion-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleCancelEdit() {
    setEditingId(null);
    setForm(emptyForm());
    setError("");
    setSuccess("");
  }

  async function handleDeleteReception(registro: RegistroCorte) {
    const confirmed = window.confirm(
      `¿Eliminar la recepción No. ${registro.numero_registro} de ${registro.proveedor_nombre || registro.lugar_origen}? Esta acción no se puede deshacer.`
    );
    if (!confirmed) return;

    setDeletingId(registro.id);
    setError("");
    setSuccess("");
    try {
      await eliminarRegistroCorteAction(registro.id);
      setRegistros(await getRegistrosCorteAction());
      setSuccess(`Recepción No. ${registro.numero_registro} eliminada correctamente.`);
      if (editingId === registro.id) handleCancelEdit();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "No se pudo eliminar la recepción.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleCreateProveedor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingProveedor(true);
    setError("");
    setSuccess("");
    try {
      const proveedor = await crearProveedorFrutaAction(nombreProveedor);
      setProveedores((current) =>
        [...current, proveedor].sort((a, b) => a.nombre.localeCompare(b.nombre, "es-MX"))
      );
      setForm((current) => ({ ...current, proveedor_id: proveedor.id }));
      setNombreProveedor("");
      setSuccess("Proveedor agregado y seleccionado.");
    } catch (providerError) {
      setError(providerError instanceof Error ? providerError.message : "No se pudo agregar el proveedor.");
    } finally {
      setSavingProveedor(false);
    }
  }

  function updateForm<K extends keyof RegistroCorteInput>(
    key: K,
    value: RegistroCorteInput[K]
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  const inputClass =
    "mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-slate-900 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100";
  const labelClass = "text-sm font-medium text-slate-700";

  return (
    <main className="min-h-screen bg-transparent">
      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
        <section className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/60 p-5 shadow-sm sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-800">
                M. López · Recepción de fruta
              </p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Yaca recibida de campo a planta
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Registra viajes, lotes, pesos, merma, facturas y pagos. El número de registro se asigna automáticamente.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:min-w-72">
              <div className="rounded-2xl border border-white bg-white/90 p-4 shadow-xs">
                <p className="text-xs font-medium text-slate-500">Recepciones</p>
                <p className="mt-1 text-2xl font-bold text-emerald-900">{registros.length}</p>
              </div>
              <div className="rounded-2xl border border-white bg-white/90 p-4 shadow-xs">
                <p className="text-xs font-medium text-slate-500">Peso de campo</p>
                <p className="mt-1 text-xl font-bold text-amber-700">{number(totalKg)} kg</p>
              </div>
              <div className="col-span-2 rounded-2xl border border-white bg-white/90 p-4 shadow-xs">
                <p className="text-xs font-medium text-slate-500">Importe total calculado</p>
                <p className="mt-1 text-xl font-bold text-emerald-900">{money(totalPagado)}</p>
              </div>
            </div>
          </div>
        </section>

        <section id="recepcion-form" className="scroll-mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-slate-900">
              {editingId ? "Editar recepción" : "Nueva recepción"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              El 5% se calcula sobre el peso de campo; el flete incluye IVA del 16%. Los importes se recalculan al guardar.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className={labelClass}>
              Día *
              <input required type="date" value={form.fecha} onChange={(event) => updateForm("fecha", event.target.value)} className={inputClass} />
            </label>
            <label className={labelClass}>
              Lugar de origen *
              <input required maxLength={120} value={form.lugar_origen} onChange={(event) => updateForm("lugar_origen", event.target.value)} placeholder="Campo o comunidad" className={inputClass} />
            </label>
            <label className={labelClass}>
              Proveedor de fruta *
              <select required value={form.proveedor_id} onChange={(event) => updateForm("proveedor_id", event.target.value)} className={inputClass}>
                <option value="">Selecciona un proveedor</option>
                {proveedores.map((proveedor) => (
                  <option key={proveedor.id} value={proveedor.id}>{proveedor.nombre}</option>
                ))}
              </select>
            </label>

            <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
              <p className="text-xs font-medium text-emerald-900">Costo de flete calculado</p>
              <p className="mt-1 text-lg font-bold text-emerald-950">{money(costoFlete)}</p>
              <p className="text-xs text-emerald-800">Peso después de merma × $1.40 + IVA (16%)</p>
            </div>
            <label className={labelClass}>
              Folio factura de flete
              <input maxLength={80} value={form.factura_flete} onChange={(event) => updateForm("factura_flete", event.target.value)} placeholder="Folio" className={inputClass} />
            </label>
            <label className={labelClass}>
              Fecha de pago del flete
              <input type="date" value={form.fecha_pago_flete} onChange={(event) => updateForm("fecha_pago_flete", event.target.value)} className={inputClass} />
            </label>

            <label className={labelClass}>
              Viajes *
              <input required type="number" min="1" step="1" value={form.viajes} onChange={(event) => updateForm("viajes", Number(event.target.value))} className={inputClass} />
            </label>
            <label className={labelClass}>
              Número de lotes *
              <input required type="number" min="1" step="1" value={form.numero_lotes} onChange={(event) => updateForm("numero_lotes", Number(event.target.value))} className={inputClass} />
            </label>
            <label className={labelClass}>
              Peso de campo (kg) *
              <input required type="number" min="0.001" step="0.001" value={form.peso_kg || ""} onChange={(event) => updateForm("peso_kg", Number(event.target.value))} placeholder="0.000" className={inputClass} />
            </label>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs font-medium text-amber-900">5% de merma (calculado)</p>
              <p className="mt-1 text-lg font-bold text-amber-950">{number(mermaKg)} kg</p>
              <p className="text-xs text-amber-800">Peso de campo × 0.05</p>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
              <p className="text-xs font-medium text-emerald-900">Peso después de descontar merma</p>
              <p className="mt-1 text-lg font-bold text-emerald-950">{number(pesoDespuesMerma)} kg</p>
              <p className="text-xs text-emerald-800">Peso de campo − 5% de merma</p>
            </div>
            <label className={labelClass}>
              Ingreso real / peso real (kg) *
              <input required type="number" min="0" step="0.001" value={form.peso_real_kg || ""} onChange={(event) => updateForm("peso_real_kg", Number(event.target.value))} placeholder="0.000" className={inputClass} />
            </label>
            <div className={`rounded-xl border p-3 ${diferenciaKg < 0 ? "border-red-200 bg-red-50" : "border-slate-200 bg-slate-50"}`}>
              <p className="text-xs font-medium text-slate-700">Diferencia (calculada)</p>
              <p className="mt-1 text-lg font-bold text-slate-950">{number(diferenciaKg)} kg</p>
              <p className="text-xs text-slate-600">Peso real − peso de campo</p>
            </div>

            <label className={labelClass}>
              Precio unitario por kg ($/kg) *
              <input required type="number" min="0.0001" step="0.0001" value={form.precio_unitario_kg} onChange={(event) => updateForm("precio_unitario_kg", Number(event.target.value))} className={inputClass} />
              <span className="mt-1 block text-xs font-normal text-slate-500">Inicia en $11 por kg; puedes cambiarlo en cada recepción.</span>
            </label>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-xs font-medium text-emerald-900">Cantidad total calculada</p>
              <p className="mt-1 text-lg font-bold text-emerald-950">{money(cantidadTotal)}</p>
              <p className="text-xs text-emerald-800">Peso después de merma × precio unitario</p>
            </div>

            <label className={labelClass}>
              Folio factura de Fruta
              <input maxLength={80} value={form.factura_ruta} onChange={(event) => updateForm("factura_ruta", event.target.value)} placeholder="Folio de la factura de ruta" className={inputClass} />
            </label>
            <label className={labelClass}>
              Fecha de factura de Fruta
              <input type="date" value={form.fecha_factura_ruta} onChange={(event) => updateForm("fecha_factura_ruta", event.target.value)} className={inputClass} />
              <span className="mt-1 block text-xs font-normal text-slate-500">Fecha en que se realizó esa factura.</span>
            </label>
            <div className="flex items-end sm:col-span-2 lg:col-span-1">
              <div className="flex w-full gap-2">
                <button type="submit" disabled={saving || proveedores.length === 0} className="min-h-11 flex-1 rounded-xl bg-emerald-800 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60">
                  {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Guardar recepción"}
                </button>
                {editingId ? (
                  <button type="button" onClick={handleCancelEdit} disabled={saving} className="min-h-11 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60">
                    Cancelar
                  </button>
                ) : null}
              </div>
            </div>
          </form>

          <details className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <summary className="cursor-pointer text-sm font-semibold text-slate-800">
              Administrar proveedores de fruta ({proveedores.length})
            </summary>
            <form onSubmit={handleCreateProveedor} className="mt-4 flex flex-col gap-3 sm:flex-row">
              <label className="flex-1 text-sm font-medium text-slate-700">
                Agregar proveedor
                <input required maxLength={120} value={nombreProveedor} onChange={(event) => setNombreProveedor(event.target.value)} placeholder="Nombre del proveedor" className={inputClass} />
              </label>
              <button type="submit" disabled={savingProveedor} className="min-h-11 self-end rounded-xl border border-emerald-800 px-4 py-2 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-50 disabled:opacity-60">
                {savingProveedor ? "Guardando..." : "Agregar proveedor"}
              </button>
            </form>
          </details>

          {proveedores.length === 0 && (
            <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Agrega al menos un proveedor de fruta antes de guardar una recepción.
            </p>
          )}
          {error && (
            <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
          )}
          {success && (
            <p role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{success}</p>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Historial de recepciones</h2>
              <p className="mt-1 text-sm text-slate-500">Últimos 500 registros; usa desplazamiento horizontal para ver todas las columnas.</p>
            </div>
            <label className="w-full text-sm font-medium text-slate-700 sm:max-w-xs">
              Buscar por origen, proveedor, lote o factura
              <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Escribe para filtrar..." className={inputClass} />
            </label>
          </div>

          {loading ? (
            <p className="rounded-2xl bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">Cargando registros...</p>
          ) : filteredRegistros.length === 0 ? (
            <p className="rounded-2xl bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              {search ? "No hay recepciones que coincidan con la búsqueda." : "Todavía no hay recepciones registradas."}
            </p>
          ) : (
            <>
              <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 md:block">
                <table className="min-w-[1900px] text-left text-sm">
                  <thead className="bg-emerald-950 text-white">
                    <tr>
                      {["No.", "Día", "Lugar de origen", "Proveedor", "Costo flete", "Factura flete", "Fecha pago flete", "Viajes", "No. lotes", "Peso de campo kg", "5% kg", "Ingreso real kg", "Diferencia kg", "Precio unit. kg", "Cantidad total", "Factura ruta", "Fecha factura ruta", "Acciones"].map((heading) => (
                        <th key={heading} className="whitespace-nowrap px-3 py-3 font-semibold">{heading}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRegistros.map((registro) => (
                      <tr key={registro.id} className="align-top hover:bg-emerald-50/40">
                        <td className="whitespace-nowrap px-3 py-3 font-semibold text-emerald-900">{registro.numero_registro}</td>
                        <td className="whitespace-nowrap px-3 py-3">{displayDate(registro.fecha)}</td>
                        <td className="px-3 py-3">{registro.lugar_origen || "—"}</td>
                        <td className="px-3 py-3">{registro.proveedor_nombre || "—"}</td>
                        <td className="whitespace-nowrap px-3 py-3">{money(registro.costo_flete)}</td>
                        <td className="px-3 py-3">{registro.factura_flete || "—"}</td>
                        <td className="whitespace-nowrap px-3 py-3">{displayDate(registro.fecha_pago_flete)}</td>
                        <td className="px-3 py-3">{registro.viajes || "—"}</td>
                        <td className="px-3 py-3">{registro.numero_lotes || "—"}</td>
                        <td className="whitespace-nowrap px-3 py-3">{number(registro.peso_kg)}</td>
                        <td className="whitespace-nowrap px-3 py-3">{number(registro.merma_5_kg)}</td>
                        <td className="whitespace-nowrap px-3 py-3">{number(registro.peso_real_kg)}</td>
                        <td className="whitespace-nowrap px-3 py-3">{number(registro.diferencia_kg)}</td>
                        <td className="whitespace-nowrap px-3 py-3">{money(registro.precio_unitario_kg)}</td>
                        <td className="whitespace-nowrap px-3 py-3 font-semibold">{money(registro.cantidad_total)}</td>
                        <td className="px-3 py-3">{registro.factura_ruta || "—"}</td>
                        <td className="whitespace-nowrap px-3 py-3">{displayDate(registro.fecha_factura_ruta)}</td>
                        <td className="whitespace-nowrap px-3 py-3">
                          <div className="flex gap-2">
                            <button type="button" onClick={() => handleEditReception(registro)} disabled={deletingId !== null} className="rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50">
                              Editar
                            </button>
                            <button type="button" onClick={() => void handleDeleteReception(registro)} disabled={deletingId !== null || saving} className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50">
                              {deletingId === registro.id ? "Eliminando..." : "Eliminar"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="space-y-3 md:hidden">
                {filteredRegistros.map((registro) => (
                  <article key={registro.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Registro No. {registro.numero_registro}</p>
                        <p className="mt-1 font-semibold text-slate-900">{registro.proveedor_nombre || "Sin proveedor"}</p>
                        <p className="text-sm text-slate-500">{registro.lugar_origen || "Sin origen"}</p>
                      </div>
                      <p className="text-right text-sm font-bold text-emerald-800">{money(registro.cantidad_total)}</p>
                    </div>
                    <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3 text-sm">
                      <div><dt className="text-xs text-slate-500">Día</dt><dd className="mt-0.5 text-slate-800">{displayDate(registro.fecha)}</dd></div>
                      <div><dt className="text-xs text-slate-500">Viajes / lotes</dt><dd className="mt-0.5 text-slate-800">{registro.viajes || "—"} / {registro.numero_lotes || "—"}</dd></div>
                      <div><dt className="text-xs text-slate-500">Peso de campo</dt><dd className="mt-0.5 text-slate-800">{number(registro.peso_kg)} kg</dd></div>
                      <div><dt className="text-xs text-slate-500">5% / real</dt><dd className="mt-0.5 text-slate-800">{number(registro.merma_5_kg)} / {number(registro.peso_real_kg)} kg</dd></div>
                      <div><dt className="text-xs text-slate-500">Diferencia</dt><dd className="mt-0.5 text-slate-800">{number(registro.diferencia_kg)} kg</dd></div>
                      <div><dt className="text-xs text-slate-500">Costo flete</dt><dd className="mt-0.5 text-slate-800">{money(registro.costo_flete)}</dd></div>
                      <div><dt className="text-xs text-slate-500">Factura / pago flete</dt><dd className="mt-0.5 text-slate-800">{registro.factura_flete || "—"} · {displayDate(registro.fecha_pago_flete)}</dd></div>
                      <div><dt className="text-xs text-slate-500">Factura de ruta</dt><dd className="mt-0.5 text-slate-800">{registro.factura_ruta || "—"}</dd></div>
                      <div><dt className="text-xs text-slate-500">Fecha factura ruta</dt><dd className="mt-0.5 text-slate-800">{displayDate(registro.fecha_factura_ruta)}</dd></div>
                      <div><dt className="text-xs text-slate-500">Precio unitario</dt><dd className="mt-0.5 text-slate-800">{money(registro.precio_unitario_kg)} por kg</dd></div>
                    </dl>
                    <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
                      <button type="button" onClick={() => handleEditReception(registro)} disabled={deletingId !== null} className="min-h-10 flex-1 rounded-xl border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50">
                        Editar
                      </button>
                      <button type="button" onClick={() => void handleDeleteReception(registro)} disabled={deletingId !== null || saving} className="min-h-10 flex-1 rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50">
                        {deletingId === registro.id ? "Eliminando..." : "Eliminar"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

"use client";

import { useMemo, useState, useEffect } from "react";
import { getEmployeeSession } from "@/lib/employeeSession";

type EstadoSorteo = "Pendiente" | "En proceso" | "Completado";

type Sorteo = {
  id: string;
  lote: string;
  fruta: string;
  kilos: number;
  estado: EstadoSorteo;
  responsable: string;
  fecha: string;
};

const initialSorteos: Sorteo[] = [
  {
    id: "SOR-001",
    lote: "LOT-101",
    fruta: "Yaca",
    kilos: 1200,
    estado: "En proceso",
    responsable: "Carlos",
    fecha: "2026-06-26",
  },
  {
    id: "SOR-002",
    lote: "LOT-102",
    fruta: "Yaca",
    kilos: 950,
    estado: "Completado",
    responsable: "Ana",
    fecha: "2026-06-25",
  },
  {
    id: "SOR-003",
    lote: "LOT-103",
    fruta: "Yaca",
    kilos: 780,
    estado: "Pendiente",
    responsable: "Luis",
    fecha: "2026-06-24",
  },
];

export default function DashboardPage() {
  const [sorteos, setSorteos] = useState<Sorteo[]>(initialSorteos);
  const [modalOpen, setModalOpen] = useState(false);
  const [lote, setLote] = useState("");
  const [fruta, setFruta] = useState("Yaca");
  const [kilos, setKilos] = useState(0);
  const [estado, setEstado] = useState<EstadoSorteo>("Pendiente");
  const [responsable, setResponsable] = useState("");

  const [session, setSession] = useState(() => getEmployeeSession());

  useEffect(() => {
    setSession(getEmployeeSession());
  }, []);

  const isAdminLevel1 = session?.nivel_jerarquia === 1;

  const stats = useMemo(() => {
    const completados = sorteos.filter((item) => item.estado === "Completado").length;
    const pendientes = sorteos.filter((item) => item.estado === "Pendiente").length;
    const kilosTotal = sorteos.reduce((sum, item) => sum + item.kilos, 0);

    return { completados, pendientes, kilosTotal };
  }, [sorteos]);

  function agregarSorteo() {
    if (!lote.trim() || !responsable.trim() || kilos <= 0) return;

    const nuevo: Sorteo = {
      id: `SOR-${String(sorteos.length + 1).padStart(3, "0")}`,
      lote: lote.trim(),
      fruta,
      kilos,
      estado,
      responsable: responsable.trim(),
      fecha: new Date().toLocaleDateString("es-ES"),
    };

    setSorteos([nuevo, ...sorteos]);
    setModalOpen(false);
    setLote("");
    setFruta("Yaca");
    setKilos(0);
    setEstado("Pendiente");
    setResponsable("");
  }

  return (
    <main className="min-h-screen bg-transparent">
      <div className="mx-auto max-w-7xl p-6 sm:p-8">
        <section className="mb-8 rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-slate-900">Sorteo de fruta</h1>
              <p className="mt-2 text-slate-600">
                Registra y controla el sorteo de fruta, especialmente yaca, por lote y estado.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="rounded-full bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700"
            >
              Nuevo sorteo
            </button>
          </div>
        </section>

       
        <section className="mb-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Completados</p>
            <p className="mt-3 text-3xl font-bold text-emerald-600">{stats.completados}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Pendientes</p>
            <p className="mt-3 text-3xl font-bold text-amber-600">{stats.pendientes}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Kilos registrados</p>
            <p className="mt-3 text-3xl font-bold text-slate-900">{stats.kilosTotal} kg</p>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Listado de sorteos</h2>
              <p className="text-sm text-slate-500">Controla los lotes y su avance en tiempo real.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 font-medium text-slate-600">ID</th>
                  <th className="px-4 py-3 font-medium text-slate-600">Lote</th>
                  <th className="px-4 py-3 font-medium text-slate-600">Fruta</th>
                  <th className="px-4 py-3 font-medium text-slate-600">Kilos</th>
                  <th className="px-4 py-3 font-medium text-slate-600">Estado</th>
                  <th className="px-4 py-3 font-medium text-slate-600">Responsable</th>
                  <th className="px-4 py-3 font-medium text-slate-600">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {sorteos.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-4 font-medium text-slate-800">{item.id}</td>
                    <td className="px-4 py-4 text-slate-600">{item.lote}</td>
                    <td className="px-4 py-4 text-slate-600">{item.fruta}</td>
                    <td className="px-4 py-4 text-slate-600">{item.kilos} kg</td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          item.estado === "Completado"
                            ? "bg-emerald-100 text-emerald-700"
                            : item.estado === "En proceso"
                              ? "bg-sky-100 text-sky-700"
                              : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {item.estado}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-slate-600">{item.responsable}</td>
                    <td className="px-4 py-4 text-slate-600">{item.fecha}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-200 sm:p-8">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-slate-900">Nuevo sorteo</h2>
                  <p className="mt-1 text-sm text-slate-500">Registra un nuevo lote para sorteo de fruta.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition hover:bg-slate-200"
                >
                  ×
                </button>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Lote</span>
                  <input
                    value={lote}
                    onChange={(event) => setLote(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    placeholder="Ej. LOT-104"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Fruta</span>
                  <input
                    value={fruta}
                    onChange={(event) => setFruta(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Kilos</span>
                  <input
                    type="number"
                    min={1}
                    value={kilos}
                    onChange={(event) => setKilos(Number(event.target.value))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Estado</span>
                  <select
                    value={estado}
                    onChange={(event) => setEstado(event.target.value as EstadoSorteo)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  >
                    <option value="Pendiente">Pendiente</option>
                    <option value="En proceso">En proceso</option>
                    <option value="Completado">Completado</option>
                  </select>
                </label>
                <label className="sm:col-span-2 space-y-2">
                  <span className="text-sm font-medium text-slate-700">Responsable</span>
                  <input
                    value={responsable}
                    onChange={(event) => setResponsable(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    placeholder="Ej. Carlos"
                  />
                </label>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={agregarSorteo}
                  className="inline-flex items-center justify-center rounded-full bg-sky-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
                >
                  Guardar sorteo
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

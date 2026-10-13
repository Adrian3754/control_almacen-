"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getRegistrosCorteAction,
  type RegistroCorte,
} from "@/components/actions/cortes.actions";

function displayDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatKilos(value: number) {
  return new Intl.NumberFormat("es-MX", { maximumFractionDigits: 3 }).format(value);
}

export default function MermaChartPage() {
  const [registros, setRegistros] = useState<RegistroCorte[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    getRegistrosCorteAction()
      .then((data) => {
        if (active) setRegistros(data);
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el historial de recepciones.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const chartRegistros = useMemo(
    () => registros.slice(0, 30).reverse(),
    [registros]
  );
  const maxMerma = useMemo(
    () => Math.max(...chartRegistros.map((registro) => registro.merma_5_kg), 0),
    [chartRegistros]
  );
  const totalMermaMostrada = useMemo(
    () => chartRegistros.reduce((total, registro) => total + registro.merma_5_kg, 0),
    [chartRegistros]
  );
  const totalMermaHistorial = useMemo(
    () => registros.reduce((total, registro) => total + registro.merma_5_kg, 0),
    [registros]
  );

  return (
    <main className="min-h-screen bg-transparent">
      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
        <section className="rounded-3xl border border-amber-100 bg-gradient-to-br from-white to-amber-50/70 p-5 shadow-sm sm:p-7">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-800">
            M. López · Recepción de fruta
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Gráfica de mermas
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Consulta el 5% de merma calculada para cada recepción según su peso de campo.
            La gráfica se actualiza al registrar o editar recepciones.
          </p>
        </section>

        {error ? (
          <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </div>
        ) : null}

        {loading ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
            Cargando historial de recepciones...
          </section>
        ) : error ? null : registros.length === 0 ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
            Todavía no hay recepciones registradas para mostrar.
          </section>
        ) : (
          <>
            <section className="grid gap-4 sm:grid-cols-3">
              <article className="rounded-2xl border border-white bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">Recepciones en historial</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{registros.length}</p>
              </article>
              <article className="rounded-2xl border border-white bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">Merma total del historial</p>
                <p className="mt-1 text-2xl font-bold text-amber-800">{formatKilos(totalMermaHistorial)} kg</p>
              </article>
              <article className="rounded-2xl border border-white bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">Merma en las últimas {chartRegistros.length}</p>
                <p className="mt-1 text-2xl font-bold text-amber-800">{formatKilos(totalMermaMostrada)} kg</p>
              </article>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
              <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Merma calculada (5%) por recepción</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Cada barra muestra el 5% del peso de campo. Desliza horizontalmente para consultar todos los registros mostrados.
                  </p>
                </div>
                <p className="text-sm font-semibold text-amber-900">Cantidad en kilogramos (kg)</p>
              </div>

              <div className="overflow-x-auto pb-2">
                <div
                  role="img"
                  aria-label={`Gráfica de merma calculada al 5% para las últimas ${chartRegistros.length} recepciones`}
                  className="flex h-72 min-w-[720px] items-end gap-3 border-b border-slate-300 px-2"
                >
                  {chartRegistros.map((registro) => {
                    const barHeight = maxMerma > 0
                      ? Math.max((registro.merma_5_kg / maxMerma) * 100, 2)
                      : 0;

                    return (
                      <div
                        key={registro.id}
                        title={`Registro No. ${registro.numero_registro} · ${displayDate(registro.fecha)} · ${formatKilos(registro.merma_5_kg)} kg`}
                        className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"
                      >
                        <span className="whitespace-nowrap text-xs font-semibold text-amber-900">
                          {formatKilos(registro.merma_5_kg)}
                        </span>
                        <div className="flex h-48 w-full items-end justify-center">
                          <div
                            className="w-full max-w-10 rounded-t-md bg-gradient-to-t from-amber-600 to-yellow-400 transition-all"
                            style={{ height: `${barHeight}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-slate-700">#{registro.numero_registro}</span>
                        <span className="whitespace-nowrap text-[10px] text-slate-500">{displayDate(registro.fecha)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

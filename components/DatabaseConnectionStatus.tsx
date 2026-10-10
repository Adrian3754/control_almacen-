"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const databaseTables = [
  "inventario",
  "movimientos",
  "tarimas",
  "reportes",
  "muestreos",
  "pesajes_produccion",
  "cortes_diarios",
] as const;

type ConnectionStatus = "checking" | "connected" | "disconnected";

function withTimeout<T>(
  promise: PromiseLike<T>,
  milliseconds: number
): Promise<T> {
  let timeoutId: number | undefined;

  const timeout = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(
      () => reject(new Error(`Supabase no respondió en ${milliseconds / 1000} segundos.`)),
      milliseconds
    );
  });

  return Promise.race([Promise.resolve(promise), timeout]).finally(() => {
    if (timeoutId !== undefined) window.clearTimeout(timeoutId);
  });
}

async function checkDatabaseTables() {
  const connection = await withTimeout(
    supabase.from("lotes").select("*", { head: true }).limit(0),
    10000
  );

  if (connection.error) {
    return {
      connected: false,
      error: connection.error.message,
      unavailableTables: [...databaseTables, "lotes"],
    };
  }

  const results = await Promise.all(
    databaseTables.map(async (table) => {
      const { error } = await withTimeout(
        supabase.from(table).select("*", { head: true }).limit(0),
        5000
      )
        .then(({ error }) => ({ error }))
        .catch((error: unknown) => ({
          error: error instanceof Error ? error : new Error(String(error)),
        }));

      return { table, available: !error };
    })
  );

  return {
    connected: true,
    error: "",
    unavailableTables: results
      .filter((result) => !result.available)
      .map((result) => result.table),
  };
}

export default function DatabaseConnectionStatus() {
  const [status, setStatus] = useState<ConnectionStatus>("checking");
  const [unavailableTables, setUnavailableTables] = useState<string[]>([]);
  const [connectionError, setConnectionError] = useState("");

  useEffect(() => {
    let isMounted = true;

    checkDatabaseTables()
      .then(({ connected, error, unavailableTables: tables }) => {
        if (!isMounted) return;
        setUnavailableTables(tables);
        setConnectionError(error);
        setStatus(connected ? "connected" : "disconnected");
      })
      .catch((error: unknown) => {
        if (!isMounted) return;
        console.error("No se pudo comprobar la conexión con Supabase:", error);
        setUnavailableTables([...databaseTables]);
        setConnectionError(
          error instanceof Error
            ? error.message
            : "No se pudo completar la consulta de prueba."
        );
        setStatus("disconnected");
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const message =
    status === "checking"
      ? "Verificando base de datos..."
      : status === "connected"
        ? "Conectado a Supabase (tabla lotes)"
        : "No se pudo conectar a Supabase";
  const statusColor =
    status === "connected"
      ? "text-green-700"
      : status === "disconnected"
        ? "text-red-700"
        : "text-slate-500";

  return (
    <div className="mt-1 text-xs" role="status" aria-live="polite">
      <p className={statusColor}>{message}</p>
      {status === "connected" && unavailableTables.length > 0 && (
        <p className="mt-1 text-amber-700">
          Tablas sin acceso o inexistentes: {unavailableTables.join(", ")}
        </p>
      )}
      {status === "disconnected" && connectionError && (
        <p className="mt-1 text-red-700">{connectionError}</p>
      )}
      {status === "disconnected" && (
        <button
          type="button"
          onClick={async () => {
            setStatus("checking");
            try {
              const result = await withTimeout(checkDatabaseTables(), 15000);
              setUnavailableTables(result.unavailableTables);
              setConnectionError(result.error);
              setStatus(result.connected ? "connected" : "disconnected");
            } catch (error) {
              console.error("No se pudo comprobar la conexión con Supabase:", error);
              setUnavailableTables([...databaseTables]);
              setConnectionError(
                error instanceof Error
                  ? error.message
                  : "No se pudo completar la consulta de prueba."
              );
              setStatus("disconnected");
            }
          }}
          className="mt-1 text-blue-700 underline hover:text-blue-900"
        >
          Volver a comprobar
        </button>
      )}
    </div>
  );
}

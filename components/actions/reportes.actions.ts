"use server";

import { createServerSupabaseClient } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

export interface Reporte {
  id: string;
  fecha: string;
  tipo: "Tarimas" | "Peso" | "Movimientos"; // Alineado estrictamente con tu tipado de la tabla
  total: number;
  descripcion: string;
}

interface TotalesCorte {
  tarimas: number;
  peso: number;
  movimientos: number;
  lotesContados: number; // Para alimentar directo el paso 1 del modal
}

/**
 * 1. Obtiene de forma consolidada la información real de la planta para los reportes
 */
export async function getReportesAction(filtro: "todos" | "7dias" | "mes"): Promise<{
  reportes: Reporte[];
  totals: TotalesCorte;
}> {
  const supabase = createServerSupabaseClient();
  const reportes: Reporte[] = [];

  try {
    // ---- A. CONSULTAR TARIMAS REALES ----
    let queryTarimas = supabase.from("tarimas").select("id, created_at, weight, description, product");
    
    // ---- B. CONSULTAR MOVIMIENTOS DESDE EL KARDEX ----
    let queryMovimientos = supabase.from("movimientos_lotes").select("id, created_at, kilos, tipo_movimiento, descripcion");

    // ---- C. CONSULTAR LOTES ACTIVOS ----
    let queryLotes = supabase.from("lotes").select("id, estado");

    // Aplicar filtros de fecha según la selección del usuario
    const hoy = new Date();
    if (filtro === "7dias") {
      const hace7Dias = new Date(hoy.setDate(hoy.getDate() - 7)).toISOString();
      queryTarimas = queryTarimas.gte("created_at", hace7Dias);
      queryMovimientos = queryMovimientos.gte("created_at", hace7Dias);
    } else if (filtro === "mes") {
      const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString();
      queryTarimas = queryTarimas.gte("created_at", inicioMes);
      queryMovimientos = queryMovimientos.gte("created_at", inicioMes);
    }

    const [resTarimas, resMovimientos, resLotes] = await Promise.all([
      queryTarimas.order("created_at", { ascending: false }),
      queryMovimientos.order("created_at", { ascending: false }),
      queryLotes
    ]);

    // Calcular KPIs de Totales con datos nativos de la BD
    const totalTarimas = resTarimas.data?.length || 0;
    const totalKilosMovidos = (resTarimas.data || []).reduce((acc, t) => acc + Number(t.weight || 0), 0);
    const totalMovimientos = resMovimientos.data?.length || 0;
    
    // Contar lotes que están actualmente en proceso operativo ("Descargando", "En descarga", etc.)
    const lotesEnTurno = (resLotes.data || []).filter(
      (l) => l.estado === "Descargando" || l.estado === "En descarga" || l.estado === "En ruta"
    ).length;

    // ---- D. ARMAR EL HISTORIAL RECIENTE DINÁMICO (COMBINADO) ----
    // Inyectamos las tarimas creadas hoy como filas del reporte
    if (resTarimas.data) {
      resTarimas.data.forEach((t) => {
        reportes.push({
          id: `TAR-${t.id}`,
          fecha: new Date(t.created_at).toLocaleDateString("es-MX"),
          tipo: "Tarimas",
          total: Number(t.weight),
          descripcion: t.description || `Producción de tarima de ${t.product || "Yaca"}.`,
        });
      });
    }

    // Inyectamos los movimientos de inventario o báscula
    if (resMovimientos.data) {
      resMovimientos.data.forEach((m) => {
        reportes.push({
          id: `MOV-${m.id}`,
          fecha: new Date(m.created_at).toLocaleDateString("es-MX"),
          tipo: "Movimientos",
          total: Number(m.kilos),
          descripcion: m.descripcion || `Movimiento clasificado como ${m.tipo_movimiento}.`,
        });
      });
    }

    return {
      reportes: reportes.sort((a, b) => b.id.localeCompare(a.id)), // Ordenar por ID reciente
      totals: {
        tarimas: totalTarimas,
        peso: totalKilosMovidos,
        movimientos: totalMovimientos,
        lotesContados: lotesEnTurno
      }
    };

  } catch (error) {
    console.error("❌ Error consolidando reportes:", error);
    return {
      reportes: [],
      totals: { tarimas: 0, peso: 0, movimientos: 0, lotesContados: 0 }
    };
  }
}

/**
 * 2. Guarda el histórico del Corte Diario en la BD y limpia/archiva el estado actual
 */
export async function ejecutarCorteDiarioAction(data: {
  resumenLotes: string;
  resumenCalidad: string;
  resumenTarimas: string;
  totalTarimas: number;
  totalKilosMuestreados: number;
  totalMovimientos: number;
}) {
  const supabase = createServerSupabaseClient();
  console.log("💾 [CORTE DIARIO] Archivando turno operativo actual...", data);

  // Inserta el registro histórico en tu tabla de cierres o cortes de caja/planta
  const { error } = await supabase.from("cortes_diarios").insert([
    {
      resumen_lotes: data.resumenLotes,
      resumen_calidad: data.resumenCalidad,
      resumen_tarimas: data.resumenTarimas,
      total_tarimas: data.totalTarimas,
      total_kilos: data.totalKilosMuestreados,
      total_movimientos: data.totalMovimientos,
      fecha_corte: new Date().toISOString()
    }
  ]);

  if (error) {
    console.error("❌ Error al guardar corte_diario:", error.message);
    throw new Error("No se pudo registrar el cierre diario.");
  }

  // Opcional: Aquí puedes meter un RPC o un update masivo si necesitas cambiar 
  // el estado de los lotes de "Descargando" a "Descargado" al cerrar el día.

  revalidatePath("/reportes");
  return { success: true };
}
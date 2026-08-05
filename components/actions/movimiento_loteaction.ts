"use server";

import { createServerSupabaseClient } from "@/lib/supabase";

export type MovimientoLote = {
  id: string;
  loteId: number;
  tarimaId: number | null;
  tipoMovimiento: string;
  kilos: number;
  descripcion: string;
  createdAt: string;
  // Opcional: Por si haces un join para mostrar el código de barras en la tabla
  tarimaBarcode?: string; 
};

/**
 * 1. Obtener todos los movimientos de un Lote específico (Para el Modal de Auditoría)
 * Realiza un JOIN opcional con la tabla de tarimas para traer el 'barcode' si existe.
 */
export async function getMovimientosByLoteAction(loteId: string | number): Promise<MovimientoLote[]> {
  try {
    const supabase = createServerSupabaseClient();
    const idNumerico = Number(loteId);

    console.log(`🔍 [KARDEX] Consultando movimientos para el Lote ID: ${idNumerico}...`);

    // Hacemos un select que además jale el barcode de la tarima si está amarrada al movimiento
    const { data, error } = await supabase
      .from("movimientos_lotes")
      .select(`
        id,
        lote_id,
        tarima_id,
        tipo_movimiento,
        kilos,
        descripcion,
        created_at,
        tarimas ( barcode )
      `)
      .eq("lote_id", idNumerico)
      .order("id", { ascending: false }); // El más reciente primero

    if (error) throw error;

    console.log(`📋 [KARDEX] Se encontraron ${data?.length || 0} movimientos para el lote.`);

    return (data || []).map((item: any) => ({
      id: String(item.id),
      loteId: Number(item.lote_id),
      tarimaId: item.tarima_id ? Number(item.tarima_id) : null,
      tipoMovimiento: item.tipo_movimiento,
      kilos: Number(item.kilos ?? 0),
      descripcion: item.descripcion,
      createdAt: item.created_at,
      tarimaBarcode: item.tarimas?.barcode || undefined, // Extrae el código TAR-XXX si existe
    }));
  } catch (error) {
    console.error(`❌ Error en getMovimientosByLoteAction para lote ${loteId}:`, error);
    return [];
  }
}

/**
 * 2. Obtener el historial global de todos los movimientos (Opcional para reportes generales)
 */
export async function getHistorialGlobalMovimientosAction(): Promise<MovimientoLote[]> {
  try {
    const supabase = createServerSupabaseClient();

    console.log("🔍 [KARDEX GLOBAL] Cargando bitácora completa de movimientos de inventario...");

    const { data, error } = await supabase
      .from("movimientos_lotes")
      .select(`
        id,
        lote_id,
        tarima_id,
        tipo_movimiento,
        kilos,
        descripcion,
        created_at,
        tarimas ( barcode )
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return (data || []).map((item: any) => ({
      id: String(item.id),
      loteId: Number(item.lote_id),
      tarimaId: item.tarima_id ? Number(item.tarima_id) : null,
      tipoMovimiento: item.tipo_movimiento,
      kilos: Number(item.kilos ?? 0),
      descripcion: item.descripcion,
      createdAt: item.created_at,
      tarimaBarcode: item.tarimas?.barcode || undefined,
    }));
  } catch (error) {
    console.error("❌ Error en getHistorialGlobalMovimientosAction:", error);
    return [];
  }
}
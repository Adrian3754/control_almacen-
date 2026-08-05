"use server";

import { createServerSupabaseClient } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

export type Movimiento = {
  id: string;
  tarima: string;
  tipo: "Entrada" | "Salida";
  ubicacion: "Almacén" | "Cuarto frío";
  kilos: number;
  temperatura: number;
  estado: string;
  motivo: string;
  fecha: string;
};

export type NewMovimiento = Omit<Movimiento, "id">;

/**
 * Obtener todos los movimientos ordenados por el más reciente
 */
export async function getMovimientosAction(): Promise<Movimiento[]> {
  const supabase = createServerSupabaseClient();
  
  const { data, error } = await supabase
    .from("movimientos")
    .select("*")
    .order("id", { ascending: false });

  if (error) {
    console.error("❌ Error en getMovimientosAction:", error);
    throw new Error("No se pudieron cargar los movimientos.");
  }

  // Mapeamos el id numérico de Supabase al string esperado por la interfaz
  return (data || []).map((item) => ({
    ...item,
    id: String(item.id),
  }));
}

/**
 * Buscar una tarima específica usando la columna 'barcode'
 */
export async function getTarimaByCodigoAction(codigo: string) {
  console.log("------------------------------------------------");
  console.log(`🔍 [ACTION] Buscando tarima con código enviado: "${codigo}"`);
  
  const codigoLimpio = codigo.trim();
  console.log(`🧹 [ACTION] Código limpio tras .trim(): "${codigoLimpio}"`);

  const supabase = createServerSupabaseClient();

  // Buscamos usando 'barcode' que es el nombre real de tu columna en la BD
  const { data, error } = await supabase
    .from("tarimas") 
    .select("*")
    .eq("barcode", codigoLimpio) 
    .single();

  if (error) {
    console.log(`⚠️ [ACTION] No se encontró coincidencia o hubo error en Supabase.`);
    console.log(`📋 [DETALLE ERROR]:`, error.message);
    console.log("------------------------------------------------");
    return null;
  }

  console.log(`✅ [ACTION] ¡Tarima encontrada con éxito! Data devuelta por BD:`);
  console.log(JSON.stringify(data, null, 2));
  console.log("------------------------------------------------");
  
  return data;
}

/**
 * Registrar un nuevo movimiento de inventario histórico
 */
export async function createMovimientoAction(movimiento: NewMovimiento): Promise<Movimiento> {
  console.log("💾 [ACTION] Intentando registrar nuevo movimiento:", movimiento);
  
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("movimientos")
    .insert([movimiento])
    .select()
    .single();

  if (error) {
    console.error("❌ [ACTION] Error al insertar movimiento:", error);
    throw new Error("No se pudo registrar el movimiento.");
  }

  console.log("✨ [ACTION] Movimiento guardado correctamente en la BD:", data);
  
  // Revalidamos la ruta para refrescar cachés del servidor si fuera necesario
  revalidatePath("/movimientos");

  return {
    ...data,
    id: String(data.id),
  };
}
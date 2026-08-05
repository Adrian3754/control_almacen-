"use server";

import { createServerSupabaseClient } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

export type MuestreoItem = {
  id: string;
  fecha: string;
  hora: string;
  loteId?: number;       
  codigoLote: string;   
  numeroMesa: number;
  pesoMuestra: number;
  pesoBueno: number;
  pesoMalo: number;
  porcentajeBueno: number;
  porcentajeMalo: number;
  observaciones: string | null;
  // Agregamos propiedades opcionales por si quieres mostrar más datos del lote en la tabla
  loteInfo?: {
    camion: string;
    producto: string;
    kilos: number;
    estado: string;
  } | null;
};

/**
 * 1. Recuperar los muestreos con Consulta Multitabla (JOIN con lotes)
 */
export async function getMuestreosAction(): Promise<MuestreoItem[]> {
  const supabase = createServerSupabaseClient();
  console.log("🔍 [CALIDAD] Cargando historial con consulta multitabla...");

  // Hacemos el JOIN trayendo todos los campos de muestreos y los campos específicos de la tabla 'lotes'
  const { data, error } = await supabase
    .from("muestreos_calidad")
    .select(`
      *,
      lotes (
        id,
        camion,
        producto,
        kilos,
        estado
      )
    `)
    .order("id", { ascending: false });

  if (error) {
    console.error("❌ Error en getMuestreosAction Multitabla:", error.message);
    throw new Error("No se pudieron cargar los registros de calidad con sus lotes.");
  }

  return (data || []).map((m: any) => {
    // Si existe el registro en la tabla lotes, armamos un código visual dinámico y fresco
    const loteRelacionado = m.lotes;
    const codigoDinamico = loteRelacionado 
      ? `${loteRelacionado.camion} — ${loteRelacionado.producto}`
      : (m.codigo_lote || "Sin Lote");

    return {
      id: String(m.id),
      fecha: m.fecha ? new Date(m.fecha).toLocaleDateString("es-MX", { timeZone: "UTC" }) : "",
      hora: m.hora ? m.hora.substring(0, 5) : "", 
      numeroMesa: m.numero_mesa,
      pesoMuestra: Number(m.peso_muestra),
      loteId: m.lote_id,
      codigoLote: codigoDinamico, // <--- Ahora es dinámico de la otra tabla si existe
      pesoBueno: Number(m.peso_bueno),
      pesoMalo: Number(m.peso_malo),
      porcentajeBueno: Number(m.porcentaje_bueno),
      porcentajeMalo: Number(m.porcentaje_malo),
      observaciones: m.observaciones,
      loteInfo: loteRelacionado ? {
        camion: loteRelacionado.camion,
        producto: loteRelacionado.producto,
        kilos: Number(loteRelacionado.kilos),
        estado: loteRelacionado.estado
      } : null
    };
  });
}

/**
 * 2. Registrar un nuevo muestreo por mesa de trabajo
 */
export async function createMuestreoAction(
  item: Omit<MuestreoItem, "id" | "fecha" | "hora">
): Promise<MuestreoItem> {
  const supabase = createServerSupabaseClient();
  console.log("💾 [CALIDAD] Insertando registro de pesaje de mesa:", item);

  const { data, error } = await supabase
    .from("muestreos_calidad")
    .insert([
      {
        lote_id: item.loteId ? Number(item.loteId) : null,
        codigo_lote: item.codigoLote,
        numero_mesa: item.numeroMesa,
        peso_muestra: item.pesoMuestra,
        peso_bueno: item.pesoBueno,
        peso_malo: item.pesoMalo,
        observaciones: item.observaciones || null,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("❌ Error al insertar en muestreos_calidad:", error.message);
    throw new Error(`Error de calidad: ${error.message}`);
  }

  console.log("✨ [CALIDAD GUARDADO] ID de registro:", data.id);

  revalidatePath("/calidad"); 
  
  return {
    id: String(data.id),
    fecha: data.fecha ? new Date(data.fecha).toLocaleDateString("es-MX", { timeZone: "UTC" }) : "",
    hora: data.hora ? data.hora.substring(0, 5) : "",
    numeroMesa: data.numero_mesa,
    loteId: data.lote_id,
    codigoLote: data.codigo_lote || "Sin Lote",
    pesoMuestra: Number(data.peso_muestra),
    pesoBueno: Number(data.peso_bueno),
    pesoMalo: Number(data.peso_malo),
    porcentajeBueno: Number(data.porcentaje_bueno), 
    porcentajeMalo: Number(data.porcentaje_malo),   
    observaciones: data.observaciones,
  };
}
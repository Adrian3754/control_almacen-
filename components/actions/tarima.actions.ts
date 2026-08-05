"use server";

import { createServerSupabaseClient } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

export type Tarima = {
  id: string;
  createdAt: string;
  weight: number;
  status: "Abierta" | "Cerrada";
  description: string;
  product: string;
  quantity: number;
  barcode: string;
  lote_id: string;
};

export type NewTarimaData = Omit<Tarima, "id" | "barcode" | "createdAt">;

/**
 * 1. Obtener todas las tarimas con su orden correspondiente
 */
export async function getTarimasAction(): Promise<Tarima[]> {
  try {
    const supabase = createServerSupabaseClient();
    console.log("🔍 [TARIMAS] Solicitando historial completo de tarimas...");

    const { data, error } = await supabase
      .from("tarimas")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return (data || []).map((item: any) => ({
      id: String(item.id),
      createdAt: item.created_at,
      weight: Number(item.weight),
      status: item.status,
      description: item.description,
      product: item.product,
      quantity: Number(item.quantity),
      barcode: item.barcode,
      lote_id: item.lote_id || "Sin Lote",
    }));
  } catch (error) {
    console.error("❌ Error en getTarimasAction:", error);
    return [];
  }
}

/**
 * 2. Guardar una nueva tarima y delegar los cálculos al Trigger de la BD
 */
export async function createTarimaAction(tarimaData: NewTarimaData): Promise<Tarima> {
  const supabase = createServerSupabaseClient();

  console.log("\n========================================================");
  console.log("🚀 [INICIO] createTarimaAction ejecutándose en el Servidor");
  console.log("📊 [DATOS RECIBIDOS]:", JSON.stringify(tarimaData, null, 2));
  console.log("========================================================");

  // 🔍 PASO A: Inspeccionar el lote directo en la BD para ver qué está leyendo Node reales
  console.log(`🔍 [PASO A] Consultando estado actual de la tabla 'lotes' para el ID: ${tarimaData.lote_id}`);
  const { data: loteActual, error: loteError } = await supabase
    .from("lotes")
    .select("camion, kilos, estado") 
    .eq("id", tarimaData.lote_id)
    .single();

  if (loteError || !loteActual) {
    console.error("❌ [ERROR PASO A] Lote no encontrado en la BD o error de Supabase:", loteError);
    throw new Error("El lote origen seleccionado no existe o ya no está disponible.");
  }

  console.log("📋 [DATOS REALES DEL LOTE EN BD]:", {
    camion: loteActual.camion,
    kilos_disponibles_en_bd: loteActual.kilos,
    estado_en_bd: loteActual.estado
  });

  // 🔍 PASO B: Calcular el siguiente código de barras (TAR-XXX)
  console.log("🔍 [PASO B] Escaneando último código de barras en la tabla 'tarimas'...");
  const { data: ultimaTarima, error: scanError } = await supabase
    .from("tarimas")
    .select("barcode")
    .order("barcode", { ascending: false })
    .limit(1);

  if (scanError) {
    console.error("❌ [ERROR PASO B] Falló la lectura de barras:", scanError);
    throw new Error("No se pudo verificar la secuencia de códigos de barras.");
  }

  let siguienteNumero = 1;
  if (ultimaTarima && ultimaTarima.length > 0) {
    const ultimoCodigo = ultimaTarima[0].barcode;
    const numeroExtraido = parseInt(ultimoCodigo.replace("TAR-", ""), 10);
    if (!isNaN(numeroExtraido)) {
      siguienteNumero = numeroExtraido + 1;
    }
  }

  const nuevoBarcode = `TAR-${String(siguienteNumero).padStart(3, "0")}`;
  console.log(`🆔 [PASO B] Código de barras calculado: ${nuevoBarcode}`);

  // 📝 PASO C: Insertar la nueva tarima 
  console.log(`📝 [PASO C] Enviando INSERT a la tabla 'tarimas' con el peso: ${tarimaData.weight} kg`);
  const { data: nuevaTarima, error: insertError } = await supabase
    .from("tarimas")
    .insert([
      {
        weight: tarimaData.weight,
        status: tarimaData.status,
        description: tarimaData.description,
        product: "Yaca", 
        quantity: tarimaData.quantity,
        barcode: nuevoBarcode,
        lote_id: tarimaData.lote_id
      },
    ])
    .select()
    .single();

  if (insertError) {
    console.error("❌ [ERROR PASO C] Base de datos rechazó el INSERT.");
    console.error("👉 Mensaje exacto de Postgres error:", insertError.message);
    console.error("👉 Detalles técnicos del error:", insertError.details);
    console.error("👉 Hint / Sugerencia de Postgres:", insertError.hint);
    
    // Si el error viene del check constraint, le damos un mensaje más amigable al usuario
    if (insertError.message.includes("lotes_kilos_check")) {
      throw new Error(`Operación rechazada: El peso de la tarima (${tarimaData.weight} kg) excede los kilos disponibles reales en el camión ${loteActual.camion}.`);
    }
    
    throw new Error(`Fallo al resguardar la tarima: ${insertError.message}`);
  }

  console.log(`✅ [ÉXITO] Tarima creada en la BD. El trigger debió procesar el descuento sin romper nada.`);
  console.log("========================================================\n");

  // Revalidar las rutas afectadas para refrescar la interfaz en Next.js
  revalidatePath("/tarimas");
  revalidatePath("/lotes");

  return {
    id: String(nuevaTarima.id),
    createdAt: nuevaTarima.created_at,
    weight: Number(nuevaTarima.weight),
    status: nuevaTarima.status,
    description: nuevaTarima.description,
    product: nuevaTarima.product,
    quantity: Number(nuevaTarima.quantity),
    barcode: nuevaTarima.barcode,
    lote_id: nuevaTarima.lote_id,
  };
}
"use server";

import { createServerSupabaseClient } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

export type Lote = {
  id: string;
  camion: string;
  fecha: string;
  producto: string;
  kilos: number; // 📉 Columna única en la BD que se va reduciendo en tiempo real
  estado: "Descargado" | "En descarga" | "En ruta" | "Descargando";
};

export type NewLote = Omit<Lote, "id">;

/**
 * 1. Obtener todos los lotes ordenados por el más reciente (id descendente)
 * 👁️ Log integrado para auditar la lista desplegable de Tarimas usando solo 'kilos'
 */
export async function getLotesAction(): Promise<Lote[]> {
  const supabase = createServerSupabaseClient();
  
  console.log("🔍 [LISTA DESPLEGABLE] Cargando lotes de yaca para el selector de tarimas...");

  const { data, error } = await supabase
    .from("lotes")
    .select("id, camion, fecha, producto, kilos, estado")
    .order("id", { ascending: false });

  if (error) {
    console.error("❌ Error en getLotesAction:", error);
    throw new Error("No se pudieron cargar los lotes.");
  }

  const lotesMapeados: Lote[] = (data || []).map((item) => ({
    id: String(item.id),
    camion: item.camion,
    fecha: item.fecha,
    producto: item.producto,
    kilos: Number(item.kilos ?? 0), 
    estado: item.estado,
  }));

  // 📝 LOG DE CONTROL MANTENIDO
  console.log(`📦 [LISTA DESPLEGABLE] Se recuperaron ${lotesMapeados.length} lotes totales de la BD.`);
  if (lotesMapeados.length > 0) {
    console.log("👇 Análisis de disponibilidad para el selector de la interfaz:");
    console.table(
      lotesMapeados.map((l) => {
        const tieneKilos = l.kilos > 0;
        const estaActivo = l.estado === "Descargando" || l.estado === "En descarga" || l.estado === "En ruta";

        return {
          ID_Lote: l.id,
          Camion: l.camion,
          Producto: l.producto,
          Kilos_Disponibles: `${l.kilos} kg`, 
          Estado: l.estado,
          Aparecera_En_Select: tieneKilos && estaActivo ? "✅ DISPONIBLE" : "❌ EXCLUIDO"
        };
      })
    );
  }

  return lotesMapeados;
}

/**
 * 2. 🛠️ REPARADO: Apunta a 'movimientos_lotes' y elimina la duplicación de código.
 * Ahora se confía en el TRIGGER de la base de datos para la actualización del inventario.
 */
export async function registrarDescargaParcialAction(movimiento: {
  lote_id: string;
  tarima_id?: string; // ID numérico o UUID de la tarima si viene desde el flujo de tarimas
  cantidad: number;   // Kilos de yaca a mover
  tipo_accion: string; // 'REPARTO_TARIMA', 'AJUSTE', etc.
  descripcion?: string;
}) {
  const supabase = createServerSupabaseClient();

  console.log(`⚙️ [MOVIMIENTO] Insertando registro en la tabla correcta 'movimientos_lotes'...`);

  // Guardamos el historial en la tabla limpia del Kardex sin tocar la tabla de calidad (temperatura)
  const { data: nuevoMovimiento, error: errorMovimiento } = await supabase
    .from("movimientos_lotes")
    .insert([
      {
        lote_id: Number(movimiento.lote_id),
        tarima_id: movimiento.tarima_id ? Number(movimiento.tarima_id) : null,
        tipo_movimiento: movimiento.tipo_accion, // Mapeado a la columna real
        kilos: movimiento.cantidad,             // Guardado como número nativo
        descripcion: movimiento.descripcion || `Descuento automático de inventario por peso de ${movimiento.cantidad} kg.`
      }
    ])
    .select()
    .single();

  if (errorMovimiento) {
    console.error("❌ Error real al insertar en movimientos_lotes:", errorMovimiento.message);
    throw new Error(`Error de inventario: ${errorMovimiento.message}`);
  }

  console.log(`✅ [MOVIMIENTO GUARDADO] Registrado en movimientos_lotes con ID: ${nuevoMovimiento.id}`);
  console.log(`⚡ [TRIGGER AUTOMÁTICO] PostgreSQL se encargó de actualizar los kilos remanentes del Lote ID ${movimiento.lote_id}.`);

  // Sincronizamos las rutas del cliente en Next.js
  revalidatePath("/lotes");
  revalidatePath("/tarimas"); 
}

/**
 * 3. Registrar un nuevo lote por camión en la base de datos
 */
export async function createLoteAction(lote: NewLote): Promise<Lote> {
  console.log("💾 [ACTION] Intentando registrar nuevo lote:", lote);
  
  const supabase = createServerSupabaseClient();

  const payloadDoc = {
    camion: lote.camion,
    fecha: lote.fecha,
    producto: lote.producto,
    kilos: lote.kilos, 
    estado: lote.estado || "Descargando" 
  };

  const { data, error } = await supabase
    .from("lotes")
    .insert([payloadDoc])
    .select()
    .single();

  if (error) {
    console.error("❌ [ACTION] Error al insertar lote:", error);
    throw new Error("No se pudo registrar el lote.");
  }

  console.log("✨ [ACTION] Lote guardado correctamente en la BD:", data);
  
  revalidatePath("/lotes");

  return {
    id: String(data.id),
    camion: data.camion,
    fecha: data.fecha,
    producto: data.producto,
    kilos: Number(data.kilos ?? 0),
    estado: data.estado,
  };
}
/**
 * 4. Contar lotes agrupados por estado (Por descargar vs Descargados)
 * Ideal para KPIs, contadores de tarjetas o paneles de control de AlveusSoft.
 */
export async function getLotesCountByEstadoAction(): Promise<{
  porDescargar: number;
  descargados: number;
  detalles: { [key: string]: number };
}> {
  const supabase = createServerSupabaseClient();
  
  console.log("📊 [CONTEO LOTES] Calculando métricas de estado actual de camiones...");

  // Traemos solo la columna 'estado' para hacer el conteo en el servidor de Next.js
  const { data, error } = await supabase
    .from("lotes")
    .select("estado");

  if (error) {
    console.error("❌ Error en getLotesCountByEstadoAction:", error);
    throw new Error("No se pudo obtener el conteo de lotes.");
  }

  // Inicializamos nuestro mapa de conteo detallado y totales
  const detalles: { [key: string]: number } = {
    "Descargado": 0,
    "En descarga": 0,
    "En ruta": 0,
    "Descargando": 0,
  };

  let porDescargar = 0;
  let descargados = 0;

  // Procesamos los datos recuperados
  (data || []).forEach((item) => {
    const estado = item.estado || "En ruta"; // fallback por si acaso
    
    // Incrementar el detalle específico
    if (detalles[estado] !== undefined) {
      detalles[estado]++;
    } else {
      detalles[estado] = 1;
    }

    // Clasificación lógica solicitada
    if (estado === "Descargado") {
      descargados++;
    } else {
      // "En descarga", "Descargando" y "En ruta" significa que están pendientes o en proceso
      porDescargar++;
    }
  });

  // 📝 LOG DE CONTROL EN CONSOLA
  console.log("📈 [MÉTRICAS CALCULADAS]:", { porDescargar, descargados, detalles });

  return {
    porDescargar,
    descargados,
    detalles
  };
}
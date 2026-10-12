"use server";

import { revalidatePath } from "next/cache";
import { getServerEmployeeSession } from "@/lib/serverEmployeeSession";
import { createServerSupabaseClient } from "@/lib/supabase";

export interface ProveedorFruta {
  id: string;
  nombre: string;
}

export interface RegistroCorte {
  id: string;
  numero_registro: number;
  fecha: string;
  lugar_origen: string;
  proveedor_id: string;
  proveedor_nombre: string;
  costo_flete: number;
  factura_flete: string | null;
  fecha_pago_flete: string | null;
  viajes: number;
  numero_lotes: number;
  peso_kg: number;
  merma_5_kg: number;
  peso_real_kg: number;
  diferencia_kg: number;
  precio_unitario_kg: number;
  cantidad_total: number;
  factura_ruta: string | null;
  fecha_factura_ruta: string | null;
  registrado_por: string;
  created_at: string;
}

export interface RegistroCorteInput {
  fecha: string;
  lugar_origen: string;
  proveedor_id: string;
  factura_flete: string;
  fecha_pago_flete: string;
  viajes: number;
  numero_lotes: number;
  peso_kg: number;
  peso_real_kg: number;
  precio_unitario_kg: number;
  factura_ruta: string;
  fecha_factura_ruta: string;
}

async function getAuthenticatedEmployee() {
  const session = await getServerEmployeeSession();
  if (!session) throw new Error("Inicia sesión para consultar o registrar cortes.");

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("perfiles")
    .select("numero_empleado")
    .eq("numero_empleado", session.numero_empleado)
    .maybeSingle();

  if (error) {
    console.error("Error al validar el empleado para cortes:", error.message);
    throw new Error("No se pudo validar tu sesión. Intenta de nuevo.");
  }
  if (!data) throw new Error("Tu sesión ya no está activa. Vuelve a iniciar sesión.");

  return { supabase, numeroEmpleado: session.numero_empleado };
}

function mapRegistro(registro: Record<string, unknown>): RegistroCorte {
  const proveedorRelation = registro.proveedores_fruta;
  const proveedorNombre =
    typeof proveedorRelation === "object" &&
    proveedorRelation !== null &&
    "nombre" in proveedorRelation &&
    typeof proveedorRelation.nombre === "string"
      ? proveedorRelation.nombre
      : "";
  return {
    id: String(registro.id),
    numero_registro: Number(registro.numero_registro),
    fecha: String(registro.fecha),
    lugar_origen: String(registro.lugar_origen ?? ""),
    proveedor_id: String(registro.proveedor_id ?? ""),
    proveedor_nombre: proveedorNombre,
    costo_flete: Number(registro.costo_flete ?? 0),
    factura_flete: typeof registro.factura_flete === "string" ? registro.factura_flete : null,
    fecha_pago_flete: typeof registro.fecha_pago_flete === "string" ? registro.fecha_pago_flete : null,
    viajes: Number(registro.viajes ?? 0),
    numero_lotes: Number(registro.numero_lotes ?? 0),
    peso_kg: Number(registro.peso_kg ?? 0),
    merma_5_kg: Number(registro.merma_5_kg ?? 0),
    peso_real_kg: Number(registro.peso_real_kg ?? 0),
    diferencia_kg: Number(registro.diferencia_kg ?? 0),
    precio_unitario_kg: Number(registro.precio_unitario_kg ?? 0),
    cantidad_total: Number(registro.cantidad_total ?? 0),
    factura_ruta: typeof registro.factura_ruta === "string" ? registro.factura_ruta : null,
    fecha_factura_ruta: typeof registro.fecha_factura_ruta === "string" ? registro.fecha_factura_ruta : null,
    registrado_por: String(registro.registrado_por ?? ""),
    created_at: String(registro.created_at),
  };
}

export async function getRegistrosCorteAction(): Promise<RegistroCorte[]> {
  const { supabase } = await getAuthenticatedEmployee();
  const { data, error } = await supabase
    .from("registro_cortes")
    .select("id, numero_registro, fecha, lugar_origen, proveedor_id, costo_flete, factura_flete, fecha_pago_flete, viajes, numero_lotes, peso_kg, merma_5_kg, peso_real_kg, diferencia_kg, precio_unitario_kg, cantidad_total, factura_ruta, fecha_factura_ruta, registrado_por, created_at, proveedores_fruta(nombre)")
    .order("fecha", { ascending: false })
    .order("numero_registro", { ascending: false })
    .limit(500);

  if (error) {
    console.error("Error al consultar registros de corte:", error.message);
    throw new Error("No se pudieron cargar los registros. Verifica que las migraciones del módulo estén aplicadas.");
  }

  return (data ?? []).map((registro) => mapRegistro(registro));
}

export async function getProveedoresFrutaAction(): Promise<ProveedorFruta[]> {
  const { supabase } = await getAuthenticatedEmployee();
  const { data, error } = await supabase
    .from("proveedores_fruta")
    .select("id, nombre")
    .eq("activo", true)
    .order("nombre", { ascending: true });

  if (error) {
    console.error("Error al consultar proveedores de fruta:", error.message);
    throw new Error("No se pudieron cargar los proveedores. Verifica que las migraciones del módulo estén aplicadas.");
  }
  return data ?? [];
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function round(value: number, decimals: number) {
  const scale = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * scale) / scale;
}

export async function crearProveedorFrutaAction(nombre: string) {
  if (typeof nombre !== "string" || !nombre.trim() || nombre.trim().length > 120) {
    throw new Error("El nombre del proveedor es obligatorio y debe tener máximo 120 caracteres.");
  }

  const { supabase } = await getAuthenticatedEmployee();
  const cleanName = nombre.trim();
  const { data: existing, error: lookupError } = await supabase
    .from("proveedores_fruta")
    .select("id, nombre")
    .ilike("nombre", cleanName)
    .limit(1)
    .maybeSingle();

  if (lookupError) {
    console.error("Error al comprobar proveedor de fruta:", lookupError.message);
    throw new Error("No se pudo validar el proveedor.");
  }
  if (existing) throw new Error("Ese proveedor ya está registrado.");

  const { data, error } = await supabase
    .from("proveedores_fruta")
    .insert({ nombre: cleanName })
    .select("id, nombre")
    .single();

  if (error) {
    console.error("Error al registrar proveedor de fruta:", error.message);
    throw new Error("No se pudo guardar el proveedor. Intenta de nuevo.");
  }

  revalidatePath("/cortes");
  return data;
}

function prepareRegistroCorte(input: RegistroCorteInput) {
  if (!input || typeof input !== "object") {
    throw new Error("Completa los datos del corte.");
  }

  const fecha = typeof input.fecha === "string" ? input.fecha : "";
  const lugarOrigen = typeof input.lugar_origen === "string" ? input.lugar_origen.trim() : "";
  const proveedorId = typeof input.proveedor_id === "string" ? input.proveedor_id : "";
  const facturaFlete = typeof input.factura_flete === "string" ? input.factura_flete.trim() : "";
  const fechaPagoFlete = typeof input.fecha_pago_flete === "string" ? input.fecha_pago_flete : "";
  const facturaRuta = typeof input.factura_ruta === "string" ? input.factura_ruta.trim() : "";
  const fechaFacturaRuta = typeof input.fecha_factura_ruta === "string" ? input.fecha_factura_ruta : "";
  const viajes = Number(input.viajes);
  const numeroLotes = Number(input.numero_lotes);
  const pesoCampo = Number(input.peso_kg);
  const pesoReal = Number(input.peso_real_kg);
  const precioUnitario = Number(input.precio_unitario_kg);

  if (!isValidDate(fecha)) throw new Error("Ingresa una fecha válida.");
  if (fechaPagoFlete && !isValidDate(fechaPagoFlete)) throw new Error("Ingresa una fecha válida para el pago del flete.");
  if (fechaFacturaRuta && !isValidDate(fechaFacturaRuta)) throw new Error("Ingresa una fecha válida para la factura de ruta.");
  if (!lugarOrigen || lugarOrigen.length > 120) throw new Error("El lugar de origen es obligatorio (máximo 120 caracteres).");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(proveedorId)) {
    throw new Error("Selecciona un proveedor de fruta válido.");
  }
  if (!Number.isSafeInteger(viajes) || viajes < 1) throw new Error("Los viajes deben ser un número entero mayor que cero.");
  if (!Number.isSafeInteger(numeroLotes) || numeroLotes < 1) throw new Error("El número de lotes debe ser un entero mayor que cero.");
  if (!Number.isFinite(pesoCampo) || pesoCampo <= 0) throw new Error("El peso de campo debe ser mayor que cero.");
  if (!Number.isFinite(pesoReal) || pesoReal < 0) throw new Error("El peso real no puede ser negativo.");
  if (!Number.isFinite(precioUnitario) || precioUnitario <= 0 || precioUnitario > 100000) throw new Error("El precio unitario debe ser mayor que cero y no superar $100,000.");
  if (facturaFlete.length > 80 || facturaRuta.length > 80) throw new Error("Los folios de factura deben tener máximo 80 caracteres.");

  const mermaKg = round(pesoCampo * 0.05, 3);
  const pesoDespuesMerma = round(pesoCampo - mermaKg, 3);
  const costoFlete = round(pesoDespuesMerma * 1.4 * 1.16, 2);
  const diferenciaKg = round(pesoReal - pesoCampo, 3);
  const cantidadTotal = round(pesoDespuesMerma * precioUnitario, 2);
  return {
    fecha,
    lugar_origen: lugarOrigen,
    proveedor_id: proveedorId,
    costo_flete: costoFlete,
    factura_flete: facturaFlete || null,
    fecha_pago_flete: fechaPagoFlete || null,
    viajes,
    numero_lotes: numeroLotes,
    peso_kg: pesoCampo,
    merma_5_kg: mermaKg,
    peso_real_kg: round(pesoReal, 3),
    diferencia_kg: diferenciaKg,
    precio_unitario_kg: round(precioUnitario, 4),
    cantidad_total: cantidadTotal,
    factura_ruta: facturaRuta || null,
    fecha_factura_ruta: fechaFacturaRuta || null,
  };
}

async function validateActiveProvider(
  supabase: Awaited<ReturnType<typeof getAuthenticatedEmployee>>["supabase"],
  proveedorId: string
) {
  const { data: proveedor, error: proveedorError } = await supabase
    .from("proveedores_fruta")
    .select("id")
    .eq("id", proveedorId)
    .eq("activo", true)
    .maybeSingle();

  if (proveedorError) {
    console.error("Error al validar proveedor de fruta:", proveedorError.message);
    throw new Error("No se pudo validar el proveedor seleccionado.");
  }
  if (!proveedor) throw new Error("El proveedor seleccionado ya no está activo.");
}

export async function crearRegistroCorteAction(input: RegistroCorteInput) {
  const values = prepareRegistroCorte(input);
  const { supabase, numeroEmpleado } = await getAuthenticatedEmployee();
  await validateActiveProvider(supabase, values.proveedor_id);
  const { error } = await supabase.from("registro_cortes").insert({
    ...values,
    registrado_por: numeroEmpleado,
  });

  if (error) {
    console.error("Error al guardar registro de recepción de fruta:", error.message);
    throw new Error("No se pudo guardar el registro. Verifica que las migraciones del módulo estén aplicadas.");
  }

  revalidatePath("/cortes");
  return { success: true };
}

export async function actualizarRegistroCorteAction(id: string, input: RegistroCorteInput) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    throw new Error("Selecciona una recepción válida para editar.");
  }

  const values = prepareRegistroCorte(input);
  const { supabase } = await getAuthenticatedEmployee();
  await validateActiveProvider(supabase, values.proveedor_id);
  const { data, error } = await supabase
    .from("registro_cortes")
    .update(values)
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Error al actualizar registro de recepción de fruta:", error.message);
    throw new Error("No se pudo actualizar la recepción. Verifica los datos e intenta de nuevo.");
  }
  if (!data) throw new Error("No se encontró la recepción que intentas editar.");

  revalidatePath("/cortes");
  return { success: true };
}

export async function eliminarRegistroCorteAction(id: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    throw new Error("Selecciona una recepción válida para eliminar.");
  }

  const { supabase } = await getAuthenticatedEmployee();
  const { data, error } = await supabase
    .from("registro_cortes")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Error al eliminar registro de recepción de fruta:", error.message);
    throw new Error("No se pudo eliminar la recepción. Intenta de nuevo.");
  }
  if (!data) throw new Error("No se encontró la recepción que intentas eliminar.");

  revalidatePath("/cortes");
  return { success: true };
}

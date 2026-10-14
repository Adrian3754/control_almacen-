"use server";

import { createServerSupabaseClient } from "@/lib/supabase";
import { sendLowStockEmail } from "@/lib/inventoryEmail";
import { getServerEmployeeSession } from "@/lib/serverEmployeeSession";
import { revalidatePath } from "next/cache";

export type MaterialArea = {
  id: string;
  nombre: string;
  area: string;
  unidad: string;
  stock_actual: number;
  stock_minimo: number;
  activo: boolean;
  created_at: string;
};

export type MaterialConsumo = Pick<MaterialArea, "id" | "nombre" | "area" | "unidad">;

export type MovimientoMaterial = {
  id: string;
  material_id: string;
  tipo: "compra" | "consumo" | "ajuste";
  cantidad: number;
  stock_anterior: number;
  stock_nuevo: number;
  detalle: string | null;
  registrado_por: string | null;
  created_at: string;
  materiales_area: Pick<MaterialArea, "nombre" | "area" | "unidad">;
  compras_materiales: {
    proveedor: string | null;
    referencia: string | null;
    cantidad_solicitada: number;
    cantidad_recibida: number;
    costo_unitario: number | null;
  } | null;
};

export type RegistroConsumoMaterial = Pick<
  MovimientoMaterial,
  "id" | "material_id" | "cantidad" | "detalle" | "registrado_por" | "created_at" | "materiales_area"
>;

export type AlertaMaterial = {
  id: string;
  material_id: string;
  stock_actual: number;
  stock_minimo: number;
  estado: "pendiente" | "enviando" | "enviado" | "error";
  destinatario: string | null;
  error: string | null;
  enviado_at: string | null;
  created_at: string;
  materiales_area: Pick<MaterialArea, "nombre" | "area" | "unidad">;
};

type InventoryData = {
  materiales: MaterialArea[];
  totalMateriales: number;
};

const INVENTORY_PAGE_SIZE = 50;

type Actor = {
  numero_empleado: string;
  nombre: string | null;
  nivel_jerarquia: number;
};

type RpcMovementResult = {
  movimiento_id: string;
  material_id: string;
  nombre: string;
  area: string;
  unidad: string;
  stock_actual: number;
  stock_minimo: number;
  alerta_id: string | null;
};

type EmailResult = {
  status: "enviado" | "error";
  message: string;
};

function requireText(value: string, field: string, maxLength: number) {
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) {
    throw new Error(`${field} es obligatorio y debe tener máximo ${maxLength} caracteres.`);
  }
  return normalized;
}

async function requireActor(maxLevel = 3): Promise<Actor> {
  const session = await getServerEmployeeSession();
  if (!session) {
    throw new Error("Tu sesión venció o no es válida. Inicia sesión de nuevo.");
  }

  const employeeNumber = requireText(session.numero_empleado, "El número de empleado", 50);
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("perfiles")
    .select("numero_empleado, nombre, nivel_jerarquia")
    .eq("numero_empleado", employeeNumber)
    .maybeSingle();

  if (error) {
    console.error("Error validando el empleado del inventario:", error.message);
    throw new Error("No se pudo validar el empleado en la base de datos.");
  }

  if (!data?.numero_empleado) {
    throw new Error("La sesión no corresponde a un empleado registrado.");
  }

  const actor = {
    numero_empleado: String(data.numero_empleado),
    nombre: data.nombre,
    nivel_jerarquia: Number(data.nivel_jerarquia ?? 3),
  };

  if (!Number.isInteger(actor.nivel_jerarquia) || actor.nivel_jerarquia > maxLevel) {
    throw new Error("No tienes permiso para realizar esta operación.");
  }

  return actor;
}

function explainDatabaseError(message: string) {
  if (
    message.includes("materiales_area") ||
    message.includes("movimientos_materiales") ||
    message.includes("compras_materiales") ||
    message.includes("alertas_materiales") ||
    message.includes("crear_material_area") ||
    message.includes("registrar_movimiento_material")
  ) {
    return `La base de datos aún no tiene el módulo de materiales. Aplica la migración supabase/migrations/20261010123000_material_inventory.sql. Detalle: ${message}`;
  }
  return message;
}

export async function getInventoryDataAction(options: {
  page?: number;
  area?: string;
} = {}): Promise<InventoryData> {
  await requireActor();
  if (!options || typeof options !== "object") {
    throw new Error("Los filtros del inventario no son válidos.");
  }
  const supabase = createServerSupabaseClient();

  const requestedPage = options.page;
  const page = typeof requestedPage === "number" &&
    Number.isSafeInteger(requestedPage) &&
    requestedPage > 0
    ? requestedPage
    : 1;
  if (options.area !== undefined && typeof options.area !== "string") {
    throw new Error("El área seleccionada no es válida.");
  }
  const area = options.area?.trim();
  if (area && area.length > 100) {
    throw new Error("El área seleccionada no es válida.");
  }

  let materialsQuery = supabase
    .from("materiales_area")
    .select("id, nombre, area, unidad, stock_actual, stock_minimo, activo, created_at", { count: "exact" })
    .eq("activo", true)
    .order("area", { ascending: true })
    .order("nombre", { ascending: true })
    .order("id", { ascending: true });
  if (area) materialsQuery = materialsQuery.eq("area", area);

  const { data, error, count } = await materialsQuery.range(
    (page - 1) * INVENTORY_PAGE_SIZE,
    page * INVENTORY_PAGE_SIZE - 1
  );

  if (error) {
    console.error("Error cargando inventario de materiales:", error.message);
    throw new Error(explainDatabaseError(error.message));
  }

  return {
    materiales: (data ?? []) as unknown as MaterialArea[],
    totalMateriales: count ?? 0,
  };
}

export async function getInventoryAreasDataAction(
  requests: Array<{ area: string; page: number }>
): Promise<Array<InventoryData & { area: string }>> {
  await requireActor();
  if (
    !Array.isArray(requests) ||
    requests.length > 10 ||
    requests.some((request) =>
      !request ||
      typeof request.area !== "string" ||
      !request.area.trim() ||
      request.area.trim().length > 100 ||
      !Number.isSafeInteger(request.page) ||
      request.page < 1
    )
  ) {
    throw new Error("La selección de áreas o páginas no es válida.");
  }

  const supabase = createServerSupabaseClient();
  return Promise.all(
    requests.map(async ({ area, page }) => {
      const normalizedArea = area.trim();
      const { data, error, count } = await supabase
        .from("materiales_area")
        .select("id, nombre, area, unidad, stock_actual, stock_minimo, activo, created_at", { count: "exact" })
        .eq("activo", true)
        .eq("area", normalizedArea)
        .order("nombre", { ascending: true })
        .order("id", { ascending: true })
        .range((page - 1) * INVENTORY_PAGE_SIZE, page * INVENTORY_PAGE_SIZE - 1);

      if (error) {
        console.error(`Error cargando materiales del área ${normalizedArea}:`, error.message);
        throw new Error(explainDatabaseError(error.message));
      }

      return {
        area: normalizedArea,
        materiales: (data ?? []) as unknown as MaterialArea[],
        totalMateriales: count ?? 0,
      };
    })
  );
}

export async function getInventoryMovementsAction(): Promise<MovimientoMaterial[]> {
  await requireActor();
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("movimientos_materiales")
    .select("id, material_id, tipo, cantidad, stock_anterior, stock_nuevo, detalle, registrado_por, created_at, materiales_area(nombre, area, unidad), compras_materiales(proveedor, referencia, cantidad_solicitada, cantidad_recibida, costo_unitario)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("Error cargando movimientos de materiales:", error.message);
    throw new Error(explainDatabaseError(error.message));
  }

  return (data ?? []) as unknown as MovimientoMaterial[];
}

export async function getInventoryAlertsAction(): Promise<AlertaMaterial[]> {
  await requireActor();
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("alertas_materiales")
    .select("id, material_id, stock_actual, stock_minimo, estado, destinatario, error, enviado_at, created_at, materiales_area(nombre, area, unidad)")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Error cargando alertas de inventario:", error.message);
    throw new Error(explainDatabaseError(error.message));
  }

  return (data ?? []) as unknown as AlertaMaterial[];
}

export async function getInventoryAreaMaterialsForExportAction(area?: string): Promise<MaterialArea[]> {
  await requireActor(2);
  if (area !== undefined && typeof area !== "string") {
    throw new Error("El área seleccionada no es válida.");
  }
  const normalizedArea = area?.trim();
  if (normalizedArea && normalizedArea.length > 100) {
    throw new Error("El área seleccionada no es válida.");
  }

  const supabase = createServerSupabaseClient();
  const pageSize = 500;
  const materials: MaterialArea[] = [];
  let offset = 0;

  while (true) {
    let query = supabase
      .from("materiales_area")
      .select("id, nombre, area, unidad, stock_actual, stock_minimo, activo, created_at")
      .eq("activo", true)
      .order("area", { ascending: true })
      .order("nombre", { ascending: true })
      .order("id", { ascending: true });
    if (normalizedArea) query = query.eq("area", normalizedArea);

    const { data, error } = await query.range(offset, offset + pageSize - 1);
    if (error) {
      console.error("Error cargando materiales para exportación:", error.message);
      throw new Error(explainDatabaseError(error.message));
    }

    const page = (data ?? []) as unknown as MaterialArea[];
    materials.push(...page);
    if (page.length < pageSize) break;
    offset += pageSize;
  }

  return materials;
}

export async function getConsumptionMaterialsAction(options: {
  search?: string;
  area?: string;
} = {}): Promise<MaterialConsumo[]> {
  await requireActor(4);
  if (!options || typeof options !== "object") {
    throw new Error("Los filtros de búsqueda no son válidos.");
  }
  const supabase = createServerSupabaseClient();
  if (
    (options.search !== undefined && typeof options.search !== "string") ||
    (options.area !== undefined && typeof options.area !== "string")
  ) {
    throw new Error("Los filtros de búsqueda no son válidos.");
  }
  const search = options.search?.trim();
  const area = options.area?.trim();
  if (search && search.length > 80) {
    throw new Error("La búsqueda no puede exceder 80 caracteres.");
  }
  if (area && area.length > 100) {
    throw new Error("El área seleccionada no es válida.");
  }

  let query = supabase
    .from("materiales_area")
    .select("id, nombre, area, unidad")
    .eq("activo", true)
    .order("area", { ascending: true })
    .order("nombre", { ascending: true })
    .limit(INVENTORY_PAGE_SIZE);
  if (area) query = query.eq("area", area);
  if (search) query = query.ilike("nombre", `%${search}%`);

  const { data, error } = await query;

  if (error) {
    console.error("Error cargando materiales para registrar consumo:", error.message);
    throw new Error(explainDatabaseError(error.message));
  }

  return data ?? [];
}

export async function getConsumptionHistoryAction(): Promise<RegistroConsumoMaterial[]> {
  await requireActor(4);
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("movimientos_materiales")
    .select("id, material_id, cantidad, detalle, registrado_por, created_at, materiales_area(nombre, area, unidad)")
    .eq("tipo", "consumo")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("Error cargando el historial de consumos:", error.message);
    throw new Error(explainDatabaseError(error.message));
  }

  return (data ?? []) as unknown as RegistroConsumoMaterial[];
}

export async function createMaterialAreaAction(input: {
  nombre: string;
  area: string;
  unidad: string;
  stock_actual: number;
  stock_minimo: number;
}): Promise<{ material: MaterialArea; correo: EmailResult | null }> {
  const actor = await requireActor(2);
  const nombre = requireText(input.nombre, "El nombre del material", 120);
  const area = requireText(input.area, "El área", 100);
  const unidad = requireText(input.unidad, "La unidad de medida", 30);

  if (!Number.isFinite(input.stock_minimo) || input.stock_minimo < 0) {
    throw new Error("La existencia mínima debe ser un número igual o mayor que cero.");
  }
  if (!Number.isFinite(input.stock_actual) || input.stock_actual < 0 || input.stock_actual > 1_000_000_000) {
    throw new Error("La cantidad disponible debe ser un número entre cero y mil millones.");
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.rpc("crear_material_area", {
    p_nombre: nombre,
    p_area: area,
    p_unidad: unidad,
    p_stock_minimo: input.stock_minimo,
    p_creado_por: actor.nombre || actor.numero_empleado,
    p_stock_actual: input.stock_actual,
  });

  if (error) {
    console.error("Error creando material para inventario:", error.message);
    if (error.code === "23505") {
      throw new Error("Ya existe un material con ese nombre en esa área.");
    }
    throw new Error(explainDatabaseError(error.message));
  }

  const result = (Array.isArray(data) ? data[0] : data) as
    | (Omit<MaterialArea, "id"> & { material_id: string; alerta_id: string | null })
    | null;
  if (!result?.material_id) {
    throw new Error("La base de datos no confirmó el registro del material.");
  }

  const correo = result.alerta_id
    ? await deliverLowStockAlert(supabase, result.alerta_id)
    : null;
  revalidatePath("/inventario");
  return {
    material: {
      id: result.material_id,
      nombre: result.nombre,
      area: result.area,
      unidad: result.unidad,
      stock_actual: Number(result.stock_actual),
      stock_minimo: Number(result.stock_minimo),
      activo: result.activo,
      created_at: result.created_at,
    },
    correo,
  };
}

export async function registerMaterialMovementAction(input: {
  material_id: string;
  tipo: "compra" | "consumo" | "ajuste";
  cantidad: number;
  cantidad_solicitada?: number;
  proveedor?: string;
  referencia?: string;
  costo_unitario?: number;
  detalle?: string;
}): Promise<{ movimiento: RpcMovementResult; correo: EmailResult | null }> {
  const actor = await requireActor(input.tipo === "consumo" ? 4 : 2);

  if (!input.material_id || !Number.isFinite(input.cantidad) || Math.abs(input.cantidad) > 1_000_000_000) {
    throw new Error("Selecciona un material e ingresa una cantidad válida.");
  }
  if (input.tipo === "consumo" && input.cantidad <= 0) {
    throw new Error("La cantidad de consumo debe ser mayor que cero.");
  }
  if (input.tipo === "compra") {
    if (input.cantidad <= 0) {
      throw new Error("La cantidad recibida debe ser mayor que cero.");
    }
    if (
      input.cantidad_solicitada !== undefined &&
      (!Number.isFinite(input.cantidad_solicitada) ||
        input.cantidad_solicitada < input.cantidad)
    ) {
      throw new Error("La cantidad solicitada no puede ser menor que la recibida.");
    }
    if (
      input.costo_unitario !== undefined &&
      (!Number.isFinite(input.costo_unitario) || input.costo_unitario < 0)
    ) {
      throw new Error("El costo unitario no puede ser negativo.");
    }
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.rpc("registrar_movimiento_material", {
    p_material_id: input.material_id,
    p_tipo: input.tipo,
    p_cantidad: input.cantidad,
    p_registrado_por: actor.nombre || actor.numero_empleado,
    p_detalle: input.detalle?.trim() || null,
    p_proveedor: input.tipo === "compra" ? input.proveedor?.trim() || null : null,
    p_referencia: input.tipo === "compra" ? input.referencia?.trim() || null : null,
    p_cantidad_solicitada:
      input.tipo === "compra"
        ? input.cantidad_solicitada ?? input.cantidad
        : null,
    p_costo_unitario:
      input.tipo === "compra" ? input.costo_unitario ?? null : null,
  });

  if (error) {
    console.error("Error registrando movimiento de materiales:", error.message);
    throw new Error(explainDatabaseError(error.message));
  }

  const rpcResult = (Array.isArray(data) ? data[0] : data) as RpcMovementResult | null;
  if (!rpcResult?.movimiento_id) {
    throw new Error("La base de datos no confirmó el movimiento de inventario.");
  }

  let correo: EmailResult | null = null;
  if (rpcResult.alerta_id) {
    correo = await deliverLowStockAlert(supabase, rpcResult.alerta_id);
  }

  revalidatePath("/inventario");
  return { movimiento: rpcResult, correo };
}

async function deliverLowStockAlert(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  alertId: string
): Promise<EmailResult> {
  const { data: claimedAlert, error: claimError } = await supabase
    .from("alertas_materiales")
    .update({ estado: "enviando", error: null })
    .eq("id", alertId)
    .in("estado", ["pendiente", "error"])
    .select("id")
    .maybeSingle();

  if (claimError) {
    console.error("No se pudo reservar la alerta para envío:", claimError.message);
    return { status: "error", message: `No se pudo preparar el correo: ${claimError.message}` };
  }
  if (!claimedAlert) {
    return { status: "error", message: "La alerta ya fue enviada o hay otro envío en curso." };
  }

  const { data: alert, error: alertError } = await supabase
    .from("alertas_materiales")
    .select("id, material_id, stock_actual, stock_minimo, estado")
    .eq("id", alertId)
    .single();

  if (alertError || !alert) {
    const message = alertError?.message ?? "No se encontró el aviso pendiente.";
    console.error("No se pudo cargar la alerta de inventario:", message);
    const { error: updateError } = await supabase
      .from("alertas_materiales")
      .update({ estado: "error", error: message.slice(0, 1000) })
      .eq("id", alertId);
    if (updateError) {
      console.error("No se pudo actualizar la alerta que falló:", updateError.message);
    }
    return { status: "error", message: `El movimiento se guardó, pero no se pudo cargar la alerta: ${message}` };
  }

  const { data: material, error: materialError } = await supabase
    .from("materiales_area")
    .select("nombre, area, unidad")
    .eq("id", alert.material_id)
    .single();

  if (materialError || !material) {
    const message = materialError?.message ?? "No se encontró el material de la alerta.";
    console.error("No se pudo cargar el material de una alerta:", message);
    const { error: updateError } = await supabase
      .from("alertas_materiales")
      .update({ estado: "error", error: message.slice(0, 1000) })
      .eq("id", alertId);
    if (updateError) {
      console.error("No se pudo actualizar la alerta que falló:", updateError.message);
    }
    return { status: "error", message: `El movimiento se guardó, pero no se pudo preparar el correo: ${message}` };
  }

  try {
    const recipient = process.env.INVENTORY_PURCHASES_EMAIL;
    const resendId = await sendLowStockEmail({
      material: material.nombre,
      area: material.area,
      stock: Number(alert.stock_actual),
      minimum: Number(alert.stock_minimo),
      unit: material.unidad,
    });

    const { error: updateError } = await supabase
      .from("alertas_materiales")
      .update({
        estado: "enviado",
        destinatario: recipient,
        error: null,
        enviado_at: new Date().toISOString(),
      })
      .eq("id", alertId);

    if (updateError) {
      console.error("El correo se envió, pero no se pudo actualizar su estado:", updateError.message);
      return {
        status: "error",
        message: `Resend aceptó el correo (${resendId}), pero no se pudo confirmar el envío en el historial: ${updateError.message}`,
      };
    }

    return { status: "enviado", message: "Se envió el aviso por correo al área de Compras." };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconocido al enviar el correo.";
    const { error: updateError } = await supabase
      .from("alertas_materiales")
      .update({
        estado: "error",
        destinatario: process.env.INVENTORY_PURCHASES_EMAIL ?? null,
        error: message.slice(0, 1000),
      })
      .eq("id", alertId);

    if (updateError) {
      console.error("No se pudo registrar el error del correo:", updateError.message);
    }

    console.error("No se pudo enviar la alerta de inventario:", message);
    return {
      status: "error",
      message: updateError
        ? `${message} Además, no se pudo guardar el estado del correo: ${updateError.message}`
        : message,
    };
  }
}

export async function retryMaterialAlertAction(
  alertId: string
): Promise<EmailResult> {
  await requireActor(2);
  if (!alertId.trim()) {
    throw new Error("Selecciona una alerta válida.");
  }

  const supabase = createServerSupabaseClient();
  const result = await deliverLowStockAlert(supabase, alertId);
  revalidatePath("/inventario");
  return result;
}

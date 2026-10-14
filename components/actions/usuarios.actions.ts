"use server";

import { randomUUID } from "node:crypto";
import {
  createAuthAdminSupabaseClient,
  createServerSupabaseClient,
} from "@/lib/supabase";
import { getServerEmployeeSession } from "@/lib/serverEmployeeSession";
import { revalidatePath } from "next/cache";

export type Perfil = {
  id: string;
  nombre: string | null;
  telefono: string | null;
  numero_empleado: string | null;
  cargo: string | null;
  nivel_jerarquia: number;
  rol: "Administrador" | "Encargado" | "Operador";
};

export type Despulpador = {
  id: string;
  id_despulpador?: string | null;
  nombre_completo: string | null;
};

function getErrorMessage(error: unknown) {
  if (!error) return "Error desconocido.";

  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "object") {
    const record = error as Record<string, unknown>;
    const details = [
      record.message,
      record.msg,
      record.error_description,
      record.error,
      record.code,
      record.status,
      record.name,
    ]
      .filter((value) => value !== undefined && value !== null && value !== "")
      .map(String);

    if (details.length > 0) return details.join(" | ");
  }

  return String(error);
}

function requiredField(value: string, label: string, maxLength: number) {
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) {
    throw new Error(`${label} es obligatorio y debe tener máximo ${maxLength} caracteres.`);
  }
  return normalized;
}

async function requireAdministrator() {
  const session = await getServerEmployeeSession();
  if (!session) {
    throw new Error("Inicia sesión con una cuenta administradora para gestionar usuarios.");
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("perfiles")
    .select("nivel_jerarquia")
    .eq("numero_empleado", session.numero_empleado)
    .maybeSingle();

  if (error) {
    console.error("Error validando permisos de administración de usuarios:", error.message);
    throw new Error("No se pudieron validar tus permisos para gestionar usuarios.");
  }
  if (Number(data?.nivel_jerarquia) !== 1) {
    throw new Error("Solo una cuenta de nivel 1 puede gestionar usuarios.");
  }

  return supabase;
}

async function ensureEmployeeNumberAvailable(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  employeeNumber: string
) {
  const { data, error } = await supabase
    .from("perfiles")
    .select("id")
    .eq("numero_empleado", employeeNumber)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Error verificando el número de empleado:", error.message);
    throw new Error("No se pudo verificar si el número de empleado está disponible.");
  }
  if (data) {
    throw new Error("Ya existe un usuario con ese número de empleado.");
  }
}

/**
 * Obtener la lista completa de perfiles ordenados por jerarquía
 */
export async function getUsuariosAction(): Promise<Perfil[]> {
  const supabase = await requireAdministrator();
  
  const { data, error } = await supabase
    .from("perfiles")
    .select("id, nombre, telefono, numero_empleado, cargo, nivel_jerarquia, rol")
    .order("nivel_jerarquia", { ascending: true });

  if (error) {
    console.error("❌ Error en getUsuariosAction:", error.message);
    throw new Error(`No se pudieron cargar los perfiles desde Supabase: ${error.message}`);
  }

  return (data ?? []) as Perfil[];
}

export async function getDespulpadoresAction(): Promise<Despulpador[]> {
  const supabase = await requireAdministrator();

  const { data, error } = await supabase
    .from("despulpadores")
    .select("id_despulpador, nombre_completo")
    .order("nombre_completo", { ascending: true });

  if (error) {
    console.error("❌ Error en getDespulpadoresAction:", error.message);
    throw new Error("No se pudo conectar con la base de datos de despulpadores.");
  }

  return (data ?? []).map((item) => ({
    id: String(item.id_despulpador ?? ""),
    id_despulpador: item.id_despulpador ? String(item.id_despulpador) : null,
    nombre_completo: item.nombre_completo ?? "Sin nombre",
  }));
}

/**
 * FLUJO 1: Guardar una invitación de personal (Operadores, Encargados, etc.)
 */
export async function enviarInvitacionAction(datos: {
  email: string;
  rol: Perfil["rol"];
  numero_empleado: string;
  cargo: string;
  telefono: string;
  nivel_jerarquia: number;
}) {
  const supabase = await requireAdministrator();
  const email = requiredField(datos.email, "El correo electrónico", 254).toLowerCase();
  const numeroEmpleado = requiredField(datos.numero_empleado, "El número de empleado", 50);
  const cargo = requiredField(datos.cargo, "El área o puesto", 100);
  const rolesValidos: Perfil["rol"][] = ["Encargado", "Operador"];
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Escribe un correo electrónico válido.");
  }
  if (!Number.isInteger(datos.nivel_jerarquia) || datos.nivel_jerarquia < 2 || datos.nivel_jerarquia > 4) {
    throw new Error("Selecciona una jerarquía válida.");
  }
  if (!rolesValidos.includes(datos.rol)) {
    throw new Error("Selecciona un rol válido para la invitación.");
  }
  await ensureEmployeeNumberAvailable(supabase, numeroEmpleado);
  const token = randomUUID();

  const { error } = await supabase
    .from("invitaciones")
    .insert([{
      email,
      rol: datos.rol,
      numero_empleado: numeroEmpleado,
      cargo,
      telefono: datos.telefono.trim(),
      nivel_jerarquia: Number(datos.nivel_jerarquia),
      token
    }]);

  if (error) {
    console.error("❌ Error al crear invitación:", error.message);
    throw new Error("El correo electrónico o el número de empleado ya cuentan con una invitación activa en el sistema.");
  }

  console.log(`✉️ Invitación registrada con éxito para el correo: ${datos.email}`);
  revalidatePath("/settings/usuarios");
}

/**
 * FLUJO 2: Registro Directo de Administrador (Crea el usuario en Auth y Perfil inmediatamente)
 */
export async function crearAdministradorDirectoAction(datos: {
  email: string;
  nombre: string;
  numero_empleado: string;
  cargo: string;
  telefono: string;
  nivel_jerarquia: number;
}) {
  const supabase = await requireAdministrator();
  const authSupabase = createAuthAdminSupabaseClient();
  const nombre = requiredField(datos.nombre, "El nombre completo", 150);
  const numeroEmpleado = requiredField(datos.numero_empleado, "El número de empleado", 50);
  const email = requiredField(datos.email, "El correo de acceso", 254).toLowerCase();
  const cargo = requiredField(datos.cargo, "El área o puesto", 100);
  const telefono = datos.telefono.trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Escribe un correo electrónico válido.");
  }
  if (telefono.length > 40) {
    throw new Error("El teléfono no puede exceder 40 caracteres.");
  }
  if (Number(datos.nivel_jerarquia) !== 1) {
    throw new Error("La cuenta de administrador debe tener jerarquía 1.");
  }
  await ensureEmployeeNumberAvailable(supabase, numeroEmpleado);

  // 1. Usar la API de administración (auth.admin) para saltar la validación por correo
  const { data: authData, error: authError } = await authSupabase.auth.admin.createUser({
    email,
    password: "PasswordTemporal2026*", // Contraseña inicial obligatoria
    email_confirm: true, // Activa la cuenta inmediatamente sin enviar correos
    user_metadata: {
      nombre,
      numero_empleado: numeroEmpleado,
      cargo,
      telefono,
      nivel_jerarquia: Number(datos.nivel_jerarquia),
      rol: "Administrador"
    }
  });

  if (authError) {
    const authMessage = getErrorMessage(authError);
    console.error("❌ Error en Supabase Auth al crear administrador:", authMessage, authError);
    if (authMessage.toLowerCase().includes("already registered") || authMessage.toLowerCase().includes("already been registered")) {
      throw new Error("Ya existe una cuenta con ese correo electrónico.");
    }
    throw new Error(`Error de autenticación: ${authMessage}`);
  }

  if (!authData.user) {
    throw new Error("No se pudo recuperar la información del usuario creado en la autenticación.");
  }

  // 2. Insertar directamente el registro en la tabla pública de perfiles
  const { error: perfilError } = await supabase
    .from("perfiles")
    .insert([{
      id: authData.user.id, // Vincula con el ID del Auth recién creado
      nombre,
      numero_empleado: numeroEmpleado,
      cargo,
      telefono,
      nivel_jerarquia: Number(datos.nivel_jerarquia),
      rol: "Administrador"
    }]);

  if (perfilError) {
    console.error("❌ Error al insertar datos en la tabla perfiles:", perfilError.message);
    // Si falla el perfil, eliminamos el usuario de auth para evitar cuentas fantasma
    const { error: cleanupError } = await authSupabase.auth.admin.deleteUser(authData.user.id);
    if (cleanupError) {
      console.error("No se pudo eliminar la cuenta de autenticación incompleta:", cleanupError.message);
    }
    if (perfilError.code === "23505") {
      throw new Error("Ya existe un usuario con ese número de empleado o correo.");
    }
    throw new Error(`Se canceló el alta: El usuario se creó en Auth pero falló el registro en la base de datos de perfiles: ${perfilError.message}`);
  }

  console.log(`👑 Administrador dado de alta exitosamente en Auth y Base de Datos: ${datos.email}`);
  revalidatePath("/settings/usuarios");
}

/**
 * Crear un usuario directo (cualquier rol) usando la API de administración.
 * Útil para dar de alta usuarios sin pasar por la invitación por correo.
 */
export async function crearUsuarioDirectoAction(datos: {
  email: string;
  nombre: string;
  numero_empleado: string;
  cargo: string;
  telefono?: string;
  nivel_jerarquia: number;
  rol: Perfil["rol"];
}) {
  const nombre = requiredField(datos.nombre, "El nombre completo", 150);
  const numeroEmpleado = requiredField(datos.numero_empleado, "El número de empleado", 50);
  const email = requiredField(datos.email, "El correo de acceso", 254).toLowerCase();
  const cargo = requiredField(datos.cargo, "El área o puesto", 100);
  const telefono = (datos.telefono ?? "").trim();
  const nivelJerarquia = Number(datos.nivel_jerarquia);
  const rolesValidos: Perfil["rol"][] = ["Administrador", "Encargado", "Operador"];

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Escribe un correo electrónico válido.");
  }
  if (telefono.length > 40) {
    throw new Error("El teléfono no puede exceder 40 caracteres.");
  }
  if (!Number.isInteger(nivelJerarquia) || nivelJerarquia < 1 || nivelJerarquia > 4) {
    throw new Error("Selecciona una jerarquía válida.");
  }
  if (!rolesValidos.includes(datos.rol)) {
    throw new Error("Selecciona un rol válido.");
  }

  const supabase = await requireAdministrator();
  const authSupabase = createAuthAdminSupabaseClient();

  await ensureEmployeeNumberAvailable(supabase, numeroEmpleado);
  const password = "PasswordTemporal2026*";

  const { data: authData, error: authError } = await authSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      nombre,
      numero_empleado: numeroEmpleado,
      cargo,
      telefono: telefono || null,
      nivel_jerarquia: nivelJerarquia,
      rol: datos.rol,
    },
  });

  if (authError) {
    const authMessage = getErrorMessage(authError);
    console.error("❌ Error en Supabase Auth al crear usuario:", authMessage, authError);
    if (authMessage.toLowerCase().includes("already registered") || authMessage.toLowerCase().includes("already been registered")) {
      throw new Error("Ya existe una cuenta con ese correo electrónico.");
    }
    throw new Error(`Error de autenticación: ${authMessage}`);
  }

  if (!authData.user) {
    throw new Error("No se pudo recuperar la información del usuario creado en la autenticación.");
  }

  const { error: perfilError } = await supabase.from("perfiles").insert([{
    id: authData.user.id,
    nombre,
    numero_empleado: numeroEmpleado,
    cargo,
    telefono,
    nivel_jerarquia: nivelJerarquia,
    rol: datos.rol,
  }]);

  if (perfilError) {
    console.error("❌ Error al insertar datos en la tabla perfiles:", perfilError.message);
    const { error: cleanupError } = await authSupabase.auth.admin.deleteUser(authData.user.id);
    if (cleanupError) {
      console.error("❌ No se pudo eliminar la cuenta de Auth después del error de perfil:", cleanupError.message);
    }
    if (perfilError.code === "23505") {
      throw new Error("Ya existe un usuario con ese número de empleado o correo.");
    }
    throw new Error(`Se canceló el alta: fallo al insertar en perfiles: ${perfilError.message}`);
  }

  console.log(`✅ Usuario creado directamente: ${email} (${datos.rol})`);
  revalidatePath("/settings/usuarios");
}

/**
 * Actualizar datos inline desde la tabla interactiva
 */
export async function actualizarJerarquiaAction(
  id: string, 
  datos: {
    nombre: string;
    rol: Perfil["rol"];
    cargo: string;
    telefono: string;
    nivel_jerarquia: number;
  }
) {
  const nombre = requiredField(datos.nombre, "El nombre completo", 150);
  const supabase = await requireAdministrator();

  const { error } = await supabase
    .from("perfiles")
    .update({
      nombre,
      rol: datos.rol,
      cargo: datos.cargo.trim(),
      telefono: datos.telefono.trim(),
      nivel_jerarquia: Number(datos.nivel_jerarquia)
    })
    .eq("id", id);

  if (error) {
    console.error("❌ Error al actualizar jerarquía en cascada:", error.message);
    throw new Error(`No se pudieron guardar los cambios del perfil: ${error.message}`);
  }

  revalidatePath("/settings/usuarios");
}
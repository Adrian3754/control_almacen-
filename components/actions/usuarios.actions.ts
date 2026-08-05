"use server";

import {
  createAuthAdminSupabaseClient,
  createServerSupabaseClient,
} from "@/lib/supabase";
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

/**
 * Obtener la lista completa de perfiles ordenados por jerarquía
 */
export async function getUsuariosAction(): Promise<Perfil[]> {
  const supabase = createServerSupabaseClient();
  
  const { data, error } = await supabase
    .from("perfiles")
    .select("*")
    .order("nivel_jerarquia", { ascending: true });

  if (error) {
    console.error("❌ Error en getUsuariosAction:", error.message);
    throw new Error("No se pudo conectar con la base de datos de perfiles. Verifica la configuración.");
  }

  return data as Perfil[];
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
  const supabase = createServerSupabaseClient();
  const token = Math.random().toString(36).substring(2, 15);

  const { error } = await supabase
    .from("invitaciones")
    .insert([{
      email: datos.email.trim().toLowerCase(),
      rol: datos.rol,
      numero_empleado: datos.numero_empleado.trim(),
      cargo: datos.cargo.trim(),
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
  const supabase = createServerSupabaseClient();
  const authSupabase = createAuthAdminSupabaseClient();

  // 1. Usar la API de administración (auth.admin) para saltar la validación por correo
  const { data: authData, error: authError } = await authSupabase.auth.admin.createUser({
    email: datos.email.trim().toLowerCase(),
    password: "PasswordTemporal2026*", // Contraseña inicial obligatoria
    email_confirm: true, // Activa la cuenta inmediatamente sin enviar correos
    user_metadata: {
      nombre: datos.nombre.trim(),
      numero_empleado: datos.numero_empleado.trim(),
      cargo: datos.cargo.trim(),
      telefono: datos.telefono.trim(),
      nivel_jerarquia: Number(datos.nivel_jerarquia),
      rol: "Administrador"
    }
  });

  if (authError) {
    const authMessage = getErrorMessage(authError);
    console.error("❌ Error en Supabase Auth al crear administrador:", authMessage, authError);
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
      nombre: datos.nombre.trim(),
      numero_empleado: datos.numero_empleado.trim(),
      cargo: datos.cargo.trim(),
      telefono: datos.telefono.trim(),
      nivel_jerarquia: Number(datos.nivel_jerarquia),
      rol: "Administrador"
    }]);

  if (perfilError) {
    console.error("❌ Error al insertar datos en la tabla perfiles:", perfilError.message);
    // Si falla el perfil, eliminamos el usuario de auth para evitar cuentas fantasma
    await authSupabase.auth.admin.deleteUser(authData.user.id);
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
  const supabase = createServerSupabaseClient();
  const authSupabase = createAuthAdminSupabaseClient();

  const password = "PasswordTemporal2026*";

  const { data: authData, error: authError } = await authSupabase.auth.admin.createUser({
    email: datos.email.trim().toLowerCase(),
    password,
    email_confirm: true,
    user_metadata: {
      nombre: datos.nombre?.trim() ?? null,
      numero_empleado: datos.numero_empleado?.trim() ?? null,
      cargo: datos.cargo?.trim() ?? null,
      telefono: datos.telefono?.trim() ?? null,
      nivel_jerarquia: Number(datos.nivel_jerarquia),
      rol: datos.rol,
    },
  });

  if (authError) {
    const authMessage = getErrorMessage(authError);
    console.error("❌ Error en Supabase Auth al crear usuario:", authMessage, authError);
    throw new Error(`Error de autenticación: ${authMessage}`);
  }

  if (!authData.user) {
    throw new Error("No se pudo recuperar la información del usuario creado en la autenticación.");
  }

  const { error: perfilError } = await supabase.from("perfiles").insert([{
    id: authData.user.id,
    nombre: datos.nombre?.trim() ?? null,
    numero_empleado: datos.numero_empleado?.trim() ?? null,
    cargo: datos.cargo?.trim() ?? null,
    telefono: datos.telefono?.trim() ?? null,
    nivel_jerarquia: Number(datos.nivel_jerarquia),
    rol: datos.rol,
  }]);

  if (perfilError) {
    console.error("❌ Error al insertar datos en la tabla perfiles:", perfilError.message);
    // eliminar usuario creado en auth para evitar inconsistencias
    await authSupabase.auth.admin.deleteUser(authData.user.id);
    throw new Error(`Se canceló el alta: fallo al insertar en perfiles: ${perfilError.message}`);
  }

  console.log(`✅ Usuario creado directamente: ${datos.email} (${datos.rol})`);
  revalidatePath("/settings/usuarios");
}

/**
 * Actualizar datos inline desde la tabla interactiva
 */
export async function actualizarJerarquiaAction(
  id: string, 
  datos: { rol: Perfil["rol"]; cargo: string; telefono: string; nivel_jerarquia: number }
) {
  const supabase = createServerSupabaseClient();

  const { error } = await supabase
    .from("perfiles")
    .update({
      rol: datos.rol,
      cargo: datos.cargo.trim(),
      telefono: datos.telefono.trim(),
      nivel_jerarquia: Number(datos.nivel_jerarquia)
    })
    .eq("id", id);

  if (error) {
    console.error("❌ Error al actualizar jerarquía en cascada:", error.message);
    throw new Error("Hubo un fallo al sincronizar la actualización con el servidor.");
  }

  revalidatePath("/settings/usuarios");
}
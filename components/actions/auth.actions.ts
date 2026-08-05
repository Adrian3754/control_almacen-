"use server";

import { createPublicSupabaseClient, createServerSupabaseClient } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import type { Perfil } from "@/components/actions/usuarios.actions";

export async function signInWithEmailAction(email: string, password: string) {
  const supabase = createPublicSupabaseClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) {
    throw new Error(error.message || "No se pudo iniciar sesión.");
  }

  if (!data.user) {
    throw new Error("No se pudo completar el inicio de sesión.");
  }

  revalidatePath("/", "layout");
  return data;
}

export async function validateEmpleadoLoginAction(numeroEmpleado: string): Promise<Perfil> {
  const empleadoCode = numeroEmpleado.trim();
  if (!empleadoCode) {
    throw new Error("Ingresa el código de empleado del gafete.");
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("perfiles")
    .select("id, nombre, telefono, numero_empleado, cargo, nivel_jerarquia, rol")
    .ilike("numero_empleado", empleadoCode)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("❌ Error en validateEmpleadoLoginAction:", error.message);
    throw new Error("No se pudo validar el empleado en la base de datos.");
  }

  if (!data || !data.numero_empleado) {
    throw new Error("Código de empleado no encontrado. Verifica la información e inténtalo de nuevo.");
  }

  return data as Perfil;
}

export async function signOutAction() {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(error.message || "No se pudo cerrar la sesión.");
  }

  revalidatePath("/", "layout");
}

export async function getCurrentProfileAction() {
  const supabase = createServerSupabaseClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const { data, error } = await supabase
    .from("perfiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "No se pudo cargar el perfil.");
  }

  return data;
}

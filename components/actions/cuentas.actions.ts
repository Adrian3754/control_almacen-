"use server";

import { createServerSupabaseClient } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

export type Cuenta = {
  id: string;
  proveedor: string;
  giro: string;
  direccion: string;
  telefono: string;
  banco: string | null;
  referencia: string | null;
  cuenta_cie: string | null;
  clave_bancaria: string | null;
  beneficiario: string | null;
  activo: boolean;
  created_at: string | null;
};

export type NewCuenta = Omit<Cuenta, "id" | "created_at">;

export async function getCuentasAction(): Promise<Cuenta[]> {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("cuentas")
    .select(
      `id, proveedor, giro, direccion, telefono, banco, referencia, cuenta_cie, clave_bancaria, beneficiario, activo, created_at`
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("❌ Error en getCuentasAction:", error);
    throw new Error("No se pudieron cargar las cuentas desde la base de datos.");
  }

  return (data || []).map((item: any) => ({
    id: String(item.id),
    proveedor: String(item.proveedor ?? ""),
    giro: String(item.giro ?? ""),
    direccion: String(item.direccion ?? ""),
    telefono: String(item.telefono ?? ""),
    banco: item.banco === null ? null : String(item.banco),
    referencia: item.referencia === null ? null : String(item.referencia),
    cuenta_cie: item.cuenta_cie === null ? null : String(item.cuenta_cie),
    clave_bancaria: item.clave_bancaria === null ? null : String(item.clave_bancaria),
    beneficiario: item.beneficiario === null ? null : String(item.beneficiario),
    activo: Boolean(item.activo),
    created_at: item.created_at ? String(item.created_at) : null,
  }));
}

export async function createCuentaAction(cuenta: NewCuenta): Promise<Cuenta> {
  const supabase = createServerSupabaseClient();

  const payload = {
    proveedor: cuenta.proveedor,
    giro: cuenta.giro,
    direccion: cuenta.direccion,
    telefono: cuenta.telefono,
    banco: cuenta.banco,
    referencia: cuenta.referencia,
    cuenta_cie: cuenta.cuenta_cie,
    clave_bancaria: cuenta.clave_bancaria,
    beneficiario: cuenta.beneficiario,
    activo: cuenta.activo ?? true,
  };

  const { data, error } = await supabase
    .from("cuentas")
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error("❌ Error en createCuentaAction:", error);
    throw new Error("No se pudo guardar la cuenta bancaria.");
  }

  revalidatePath("/cuentas");

  return {
    id: String(data.id),
    proveedor: String(data.proveedor ?? ""),
    giro: String(data.giro ?? ""),
    direccion: String(data.direccion ?? ""),
    telefono: String(data.telefono ?? ""),
    banco: data.banco === null ? null : String(data.banco),
    referencia: data.referencia === null ? null : String(data.referencia),
    cuenta_cie: data.cuenta_cie === null ? null : String(data.cuenta_cie),
    clave_bancaria: data.clave_bancaria === null ? null : String(data.clave_bancaria),
    beneficiario: data.beneficiario === null ? null : String(data.beneficiario),
    activo: Boolean(data.activo),
    created_at: data.created_at ? String(data.created_at) : null,
  };
}

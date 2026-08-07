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
export type CuentaUpdatePayload = Partial<NewCuenta> & { activo?: boolean };

type CuentaRow = {
  id: string | number;
  proveedor?: string | null;
  giro?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  banco?: string | null;
  referencia?: string | null;
  cuenta_cie?: string | null;
  clave_bancaria?: string | null;
  beneficiario?: string | null;
  activo?: boolean | null;
  created_at?: string | null;
};

function mapCuenta(item: CuentaRow): Cuenta {
  return {
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
  };
}

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

  return (data || []).map(mapCuenta);
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

  return mapCuenta(data);
}

export async function updateCuentaAction(id: string, cuenta: CuentaUpdatePayload): Promise<Cuenta> {
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
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("❌ Error en updateCuentaAction:", error);
    throw new Error("No se pudo actualizar la cuenta bancaria.");
  }

  revalidatePath("/cuentas");

  return mapCuenta(data);
}

export async function deleteCuentaAction(id: string): Promise<void> {
  const supabase = createServerSupabaseClient();

  const { error } = await supabase.from("cuentas").delete().eq("id", id);

  if (error) {
    console.error("❌ Error en deleteCuentaAction:", error);
    throw new Error("No se pudo eliminar la cuenta bancaria.");
  }

  revalidatePath("/cuentas");
}

import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from("cortes_diarios")
      .select("*")
      .order("fecha_corte", { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ ok: true, data: data ?? [] });
  } catch (error: any) {
    console.error("Error cargando cortes:", error);
    return NextResponse.json(
      { ok: false, message: error?.message || "Error al cargar cortes." },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from("pesajes_produccion")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ Error al obtener pesajes de producción:", error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const registros = (data ?? []).map((item: any) => ({
      id: String(item.id),
      empleadoId: item.empleado_id ?? item.empleadoId ?? "",
      nombre: item.nombre ?? "Sin nombre",
      lote: item.lote ?? "Sin lote",
      producto: item.producto ?? "Producto Base",
      peso: Number(item.peso ?? 0),
      fecha: item.created_at ? new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
      numeroPesaje: Number(item.numero_pesaje ?? 0),
    }));

    return NextResponse.json({ ok: true, data: registros });
  } catch (error) {
    console.error("❌ Error en GET /api/produccion:", error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const payload = {
      empleado_id: body.empleadoId ?? "",
      nombre: body.nombre ?? "Sin nombre",
      lote: body.lote ?? "Sin lote",
      producto: body.producto ?? "Producto Base",
      peso: Number(body.peso ?? 0),
      created_at: new Date().toISOString(),
    };

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("pesajes_produccion")
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error("❌ Error al insertar pesaje en producción:", error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const registro = {
      id: String(data.id),
      empleadoId: data.empleado_id ?? "",
      nombre: data.nombre ?? "Sin nombre",
      lote: data.lote ?? "Sin lote",
      producto: data.producto ?? "Producto Base",
      peso: Number(data.peso ?? 0),
      fecha: data.created_at ? new Date(data.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
      numeroPesaje: 0,
    };

    return NextResponse.json({ ok: true, data: registro });
  } catch (error) {
    console.error("❌ Error en POST /api/produccion:", error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ ok: false, error: "Falta el id del pesaje." }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    const { error } = await supabase
      .from("pesajes_produccion")
      .delete()
      .eq("id", Number(id));

    if (error) {
      console.error("❌ Error al eliminar pesaje:", error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("❌ Error en DELETE /api/produccion:", error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}

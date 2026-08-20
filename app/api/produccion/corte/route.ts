import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function POST() {
  try {
    const supabase = createServerSupabaseClient();

    const { data: pesajes, error: selectError } = await supabase
      .from('pesajes_produccion')
      .select('*')
      .order('created_at', { ascending: true });

    if (selectError) {
      throw selectError;
    }

    if (!pesajes || pesajes.length === 0) {
      return NextResponse.json({
        ok: false,
        message: 'No hay pesajes para realizar el corte.'
      }, { status: 400 });
    }

    const detallePesajes = pesajes.map((item: any) => ({
      id: item.id,
      empleado_id: item.empleado_id ?? null,
      nombre: item.nombre ?? null,
      lote: item.lote ?? null,
      producto: item.producto ?? null,
      peso: Number(item.peso ?? 0),
      created_at: item.created_at ?? null,
    }));

    const totalKilos = detallePesajes.reduce((sum: number, item: any) => sum + Number(item.peso || 0), 0);
    const totalMovimientos = detallePesajes.length;
    const fechaCorte = new Date().toISOString();
    const idsPesajes = pesajes
      .map((item: any) => item.id)
      .filter((id: any) => id !== null && id !== undefined);

    const { data: rpcData, error: rpcError } = await supabase.rpc('hacer_corte_produccion', {
      p_detalle_pesajes: detallePesajes,
      p_total_kilos: totalKilos,
      p_total_movimientos: totalMovimientos,
      p_fecha_corte: fechaCorte,
      p_resumen_lotes: null,
      p_resumen_calidad: null,
      p_resumen_tarimas: null,
      p_pesajes_ids: idsPesajes,
    });

    if (rpcError) {
      console.error('❌ Error en transacción del corte:', rpcError);
      return NextResponse.json({
        ok: false,
        message: rpcError.message || 'No se pudo completar el corte de producción.',
      }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      saved: totalMovimientos,
      totalKilos,
      corte: rpcData ?? null,
    });
  } catch (error: any) {
    console.error('❌ Error al guardar corte:', error);
    return NextResponse.json({
      ok: false,
      message: error?.message || 'Error al procesar el corte de producción.',
    }, { status: 500 });
  }
}

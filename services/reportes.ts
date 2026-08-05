import { supabase } from "../lib/supabase";

export type Reporte = {
  id: string;
  fecha: string;
  tipo: string;
  total: number;
  descripcion: string;
};

const fallbackReportes: Reporte[] = [
  { id: "RPT-001", fecha: "2026-06-24", tipo: "Tarimas", total: 12, descripcion: "Tarimas generadas" },
  { id: "RPT-002", fecha: "2026-06-23", tipo: "Peso", total: 1850, descripcion: "Kilos movidos" },
  { id: "RPT-003", fecha: "2026-06-22", tipo: "Movimientos", total: 8, descripcion: "Movimientos completados" },
];

export async function fetchReportes(): Promise<Reporte[]> {
  try {
    const { data, error } = await supabase.from("reportes").select("*");
    if (error) {
      console.warn("Supabase fetchReportes failed:", error.message);
      return fallbackReportes;
    }
    return (data ?? []) as Reporte[];
  } catch (error) {
    console.warn("Supabase fetchReportes error:", error);
    return fallbackReportes;
  }
}

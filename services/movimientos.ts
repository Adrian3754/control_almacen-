import { supabase } from "../lib/supabase";

type TipoMovimiento = "Entrada" | "Salida";
type Ubicacion = "Almacén" | "Cuarto frío";

export type Movimiento = {
  id: string;
  tarima: string;
  tipo: TipoMovimiento;
  ubicacion: Ubicacion;
  kilos: number;
  temperatura: number;
  estado: string;
  motivo: string;
  fecha: string;
};

export type NewMovimiento = Omit<Movimiento, "id">;

const fallbackMovimientos: Movimiento[] = [
  {
    id: "MOV-001",
    tarima: "TAR-001",
    tipo: "Entrada",
    ubicacion: "Cuarto frío",
    kilos: 1200,
    temperatura: 8,
    estado: "En proceso",
    motivo: "Ingreso desde el campo",
    fecha: "2026-06-26 08:30",
  },
  {
    id: "MOV-002",
    tarima: "TAR-002",
    tipo: "Salida",
    ubicacion: "Almacén",
    kilos: 950,
    temperatura: 12,
    estado: "Listo",
    motivo: "Salida para distribución",
    fecha: "2026-06-25 17:10",
  },
  {
    id: "MOV-003",
    tarima: "TAR-003",
    tipo: "Entrada",
    ubicacion: "Almacén",
    kilos: 780,
    temperatura: 14,
    estado: "Pendiente",
    motivo: "Recepción de lote nuevo",
    fecha: "2026-06-25 10:05",
  },
];

export async function fetchMovimientos(): Promise<Movimiento[]> {
  try {
    const { data, error } = await supabase.from("movimientos").select("*");
    if (error) {
      console.warn("Supabase fetchMovimientos failed:", error.message);
      return fallbackMovimientos;
    }
    return (data ?? []) as Movimiento[];
  } catch (error) {
    console.warn("Supabase fetchMovimientos error:", error);
    return fallbackMovimientos;
  }
}

export async function createMovimiento(item: NewMovimiento): Promise<Movimiento> {
  try {
    const { data, error } = await supabase.from("movimientos").insert(item).select().single();
    if (error) {
      console.warn("Supabase createMovimiento failed:", error.message);
      return { id: `MOV-${Date.now()}`, ...item };
    }
    return data as Movimiento;
  } catch (error) {
    console.warn("Supabase createMovimiento error:", error);
    return { id: `MOV-${Date.now()}`, ...item };
  }
}

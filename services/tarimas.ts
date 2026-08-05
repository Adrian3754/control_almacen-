import { supabase } from "../lib/supabase";

export type Tarima = {
  id: string;
  createdAt: string;
  weight: number;
  status: "Abierta" | "Cerrada";
  description: string;
  product: string;
  quantity: number;
  barcode: string;
};

export type NewTarima = Omit<Tarima, "id">;

const fallbackTarimas: Tarima[] = [
  {
    id: "TAR-001",
    createdAt: "2026-06-20",
    weight: 1200,
    status: "Abierta",
    description: "Cajas de tornillos",
    product: "Tornillos",
    quantity: 25,
    barcode: "TAR-001",
  },
  {
    id: "TAR-002",
    createdAt: "2026-06-21",
    weight: 850,
    status: "Cerrada",
    description: "Pallet de madera",
    product: "Madera",
    quantity: 12,
    barcode: "TAR-002",
  },
  {
    id: "TAR-003",
    createdAt: "2026-06-22",
    weight: 1020,
    status: "Abierta",
    description: "Bolsas de cemento",
    product: "Cemento",
    quantity: 18,
    barcode: "TAR-003",
  },
];

export async function fetchTarimas(): Promise<Tarima[]> {
  try {
    const { data, error } = await supabase.from("tarimas").select("*");
    if (error) {
      console.warn("Supabase fetchTarimas failed:", error.message);
      return fallbackTarimas;
    }
    return (data ?? []) as Tarima[];
  } catch (error) {
    console.warn("Supabase fetchTarimas error:", error);
    return fallbackTarimas;
  }
}

export async function createTarima(item: NewTarima): Promise<Tarima> {
  try {
    const { data, error } = await supabase.from("tarimas").insert(item).select().single();
    if (error) {
      console.warn("Supabase createTarima failed:", error.message);
      return { id: `TAR-${Date.now()}`, ...item };
    }
    return data as Tarima;
  } catch (error) {
    console.warn("Supabase createTarima error:", error);
    return { id: `TAR-${Date.now()}`, ...item };
  }
}

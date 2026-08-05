import { supabase } from "../lib/supabase";

export type Lote = {
  id?: string;
  camion: string;
  fecha: string;
  producto: string;
  kilos: number;
  estado: "Descargado" | "En ruta";
};

export type NewLote = Omit<Lote, "id">;

const fallbackLotes: Lote[] = [
  { id: "LOT-001", camion: "CAM-001", fecha: "2026-06-24", producto: "Cemento", kilos: 1250, estado: "Descargado" },
  { id: "LOT-002", camion: "CAM-002", fecha: "2026-06-24", producto: "Madera", kilos: 980, estado: "En ruta" },
  { id: "LOT-003", camion: "CAM-003", fecha: "2026-06-23", producto: "Tornillos", kilos: 650, estado: "Descargado" },
  { id: "LOT-004", camion: "CAM-004", fecha: "2026-06-22", producto: "Pintura", kilos: 780, estado: "En ruta" },
];

export async function fetchLotes(): Promise<Lote[]> {
  try {
    const { data, error } = await supabase.from("lotes").select("*");
    if (error) {
      console.warn("Supabase fetchLotes failed:", error.message);
      return fallbackLotes;
    }
    return (data ?? []) as Lote[];
  } catch (error) {
    console.warn("Supabase fetchLotes error:", error);
    return fallbackLotes;
  }
}

export async function createLote(item: NewLote): Promise<Lote> {
  try {
    const { data, error } = await supabase.from("lotes").insert(item).select().single();
    if (error) {
      console.warn("Supabase createLote failed:", error.message);
      return { id: `LOT-${Date.now()}`, ...item };
    }
    return data as Lote;
  } catch (error) {
    console.warn("Supabase createLote error:", error);
    return { id: `LOT-${Date.now()}`, ...item };
  }
}

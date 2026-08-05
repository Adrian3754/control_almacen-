import { supabase } from "../lib/supabase";

export type MuestreoItem = {
  id: string;
  fecha: string;
  hora: string;
  numeroMesa: number;
  pesoMuestra: number;
  pesoBueno: number;
  pesoMalo: number;
  porcentajeBueno: number;
  porcentajeMalo: number;
  observaciones?: string | null;
  created_by?: string | null;
  created_at?: string | null;
  loteId?: number;
  codigoLote?: string;
};

const fallback: MuestreoItem[] = [];

export async function fetchMuestreos(): Promise<MuestreoItem[]> {
  try {
    const { data, error } = await supabase.from("muestreos").select("*").order("created_at", { ascending: false });
    if (error) {
      console.warn("Supabase fetchMuestreos failed:", error.message);
      return fallback;
    }
    return (data ?? []) as MuestreoItem[];
  } catch (err) {
    console.warn("fetchMuestreos error:", err);
    return fallback;
  }
}

export async function createMuestreo(item: Omit<MuestreoItem, "id" | "created_at" | "created_by">): Promise<MuestreoItem> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = (userData as any)?.user?.id ?? null;

    const payload = { ...item, created_by: userId } as any;
    const { data, error } = await supabase.from("muestreos").insert(payload).select().single();
    if (error) {
      console.warn("Supabase createMuestreo failed:", error.message);
      return { id: `MUE-${Date.now()}`, ...item } as MuestreoItem;
    }
    return data as MuestreoItem;
  } catch (err) {
    console.warn("createMuestreo error:", err);
    return { id: `MUE-${Date.now()}`, ...item } as MuestreoItem;
  }
}

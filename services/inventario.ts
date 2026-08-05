import { supabase } from "../lib/supabase";

export type InventoryItem = {
  id: string;
  name: string;
  category: string;
  stock: number;
  minimum: number;
  location: string;
  status: "En stock" | "Bajo" | "Sin stock";
  lastMovement: string;
  created_by?: string | null;
  created_at?: string | null;
};

export type NewInventoryItem = {
  name: string;
  category: string;
  stock: number;
  minimum: number;
  location: string;
  status: "En stock" | "Bajo" | "Sin stock";
  lastMovement: string;
};

const fallbackInventoryItems: InventoryItem[] = [
  {
    id: "INV-001",
    name: "Yaca premium",
    category: "Fruta",
    stock: 140,
    minimum: 50,
    location: "Almacén A - Rack 1",
    status: "En stock",
    lastMovement: "2026-06-24",
  },
  {
    id: "INV-002",
    name: "Yaca para exportación",
    category: "Fruta",
    stock: 18,
    minimum: 30,
    location: "Cuarto frío - Sector 2",
    status: "Bajo",
    lastMovement: "2026-06-23",
  },
  {
    id: "INV-003",
    name: "Yaca de descarte",
    category: "Fruta",
    stock: 0,
    minimum: 20,
    location: "Cuarto frío - Sector 3",
    status: "Sin stock",
    lastMovement: "2026-06-22",
  },
  {
    id: "INV-004",
    name: "Yaca procesada",
    category: "Empaque",
    stock: 75,
    minimum: 40,
    location: "Almacén B - Rack 4",
    status: "En stock",
    lastMovement: "2026-06-21",
  },
];

export async function fetchInventoryItems(): Promise<InventoryItem[]> {
  try {
    const { data, error } = await supabase.from("inventario").select("*");
    if (error) {
      console.warn("Supabase fetchInventoryItems failed:", error.message);
      return fallbackInventoryItems;
    }
    return (data ?? []) as InventoryItem[];
  } catch (error) {
    console.warn("Supabase fetchInventoryItems error:", error);
    return fallbackInventoryItems;
  }
}

export async function createInventoryItem(item: NewInventoryItem): Promise<InventoryItem> {
  try {
    // try to get current authenticated user to set created_by
    const { data: userData, error: userError } = await supabase.auth.getUser();
    const userId = (userData as any)?.user?.id ?? null;

    const payload = { ...item, created_by: userId } as any;

    const { data, error } = await supabase.from("inventario").insert(payload).select().single();
    if (error) {
      console.warn("Supabase createInventoryItem failed:", error.message);
      return { id: `INV-${Date.now()}`, ...item } as InventoryItem;
    }
    return data as InventoryItem;
  } catch (error) {
    console.warn("Supabase createInventoryItem error:", error);
    return { id: `INV-${Date.now()}`, ...item } as InventoryItem;
  }
}

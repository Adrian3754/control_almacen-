"use client";

import { useState } from "react";
import { createInventoryItem, type NewInventoryItem, type InventoryItem } from "../../../services/inventario";

type Props = {
  onCreated: (item: InventoryItem) => void;
  onCancel?: () => void;
};

export default function InventarioForm({ onCreated, onCancel }: Props) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [stock, setStock] = useState(0);
  const [minimum, setMinimum] = useState(0);
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!name.trim() || !category.trim() || stock < 0 || minimum < 0 || !location.trim()) return;
    setLoading(true);

    const item: NewInventoryItem = {
      name: name.trim(),
      category: category.trim(),
      stock,
      minimum,
      location: location.trim(),
      status: stock === 0 ? "Sin stock" : stock < minimum ? "Bajo" : "En stock",
      lastMovement: new Date().toLocaleDateString("es-ES"),
    };

    try {
      const nuevo = await createInventoryItem(item);
      onCreated(nuevo);
      setName("");
      setCategory("");
      setStock(0);
      setMinimum(0);
      setLocation("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Producto</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
            placeholder="Ej. Cemento"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Categoría</span>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
            placeholder="Ej. Materiales"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Stock</span>
          <input
            type="number"
            min={0}
            value={stock}
            onChange={(e) => setStock(Number(e.target.value))}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Mínimo</span>
          <input
            type="number"
            min={0}
            value={minimum}
            onChange={(e) => setMinimum(Number(e.target.value))}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
          />
        </label>
        <label className="sm:col-span-2 space-y-2">
          <span className="text-sm font-medium text-slate-700">Ubicación</span>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
            placeholder="Ej. Pasillo A - Rack 2"
          />
        </label>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={() => onCancel?.()}
          className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="inline-flex items-center justify-center rounded-xl bg-emerald-800 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-900 disabled:opacity-50"
        >
          {loading ? "Guardando..." : "Guardar producto"}
        </button>
      </div>
    </div>
  );
}

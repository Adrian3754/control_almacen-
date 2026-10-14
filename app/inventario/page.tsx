"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  createMaterialAreaAction,
  getConsumptionHistoryAction,
  getConsumptionMaterialsAction,
  getInventoryAreasDataAction,
  getInventoryAlertsAction,
  getInventoryAreaMaterialsForExportAction,
  getInventoryMovementsAction,
  registerMaterialMovementAction,
  retryMaterialAlertAction,
  type AlertaMaterial,
  type MaterialArea,
  type MaterialConsumo,
  type RegistroConsumoMaterial,
  type MovimientoMaterial,
} from "@/components/actions/inventario-materiales.actions";
import { getEmployeeSession, type EmployeeSession } from "@/lib/employeeSession";

type Dialog = "material" | "compra" | "consumo" | null;
type Feedback = { kind: "success" | "error" | "warning"; text: string } | null;
type InventoryModule = "existencias" | "consumos" | "alertas" | "movimientos";

const inventoryPageSize = 50;

const fieldClass =
  "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10";
const primaryButtonClass =
  "inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-700/20 disabled:cursor-not-allowed disabled:opacity-60";
const measurementUnits = [
  "Piezas",
  "Cajas",
  "Litros",
  "Kilogramos",
  "Gramos",
  "Metros",
  "Paquetes",
  "Rollos",
];

const inventoryAreas = [
  { name: "Lavado de fruta", id: "lavado-de-fruta", icon: "🍋", description: "Insumos para el lavado de fruta", color: "bg-lime-50 text-lime-800 ring-lime-200" },
  { name: "Lavado de caja", id: "lavado-de-caja", icon: "🧺", description: "Materiales para lavado de cajas", color: "bg-sky-50 text-sky-800 ring-sky-200" },
  { name: "Mantenimiento", id: "mantenimiento", icon: "🛠️", description: "Herramientas y refacciones", color: "bg-orange-50 text-orange-800 ring-orange-200" },
  { name: "Inocuidad", id: "inocuidad", icon: "✅", description: "Materiales de higiene e inocuidad", color: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
  { name: "Limpieza y sanitización", id: "limpieza-y-sanitizacion", icon: "🧹", description: "Limpieza de las instalaciones", color: "bg-violet-50 text-violet-800 ring-violet-200" },
] as const;

const inventoryModules: Array<{
  id: InventoryModule;
  title: string;
  description: string;
  icon: string;
  color: string;
}> = [
  {
    id: "existencias",
    title: "Inventario por área",
    description: "Consulta materiales y existencias",
    icon: "📦",
    color: "emerald",
  },
  {
    id: "consumos",
    title: "Registro de consumos",
    description: "Revisa materiales utilizados",
    icon: "📋",
    color: "violet",
  },
  {
    id: "alertas",
    title: "Alertas de compra",
    description: "Atiende avisos de reabastecimiento",
    icon: "🔔",
    color: "amber",
  },
  {
    id: "movimientos",
    title: "Movimientos",
    description: "Entradas, salidas y ajustes recientes",
    icon: "🔄",
    color: "sky",
  },
];

const consumptionColors = [
  "border-violet-200 bg-violet-50 text-violet-900",
  "border-sky-200 bg-sky-50 text-sky-900",
  "border-amber-200 bg-amber-50 text-amber-900",
  "border-rose-200 bg-rose-50 text-rose-900",
  "border-teal-200 bg-teal-50 text-teal-900",
];

function formatQuantity(value: number) {
  return new Intl.NumberFormat("es-MX", { maximumFractionDigits: 3 }).format(value);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 2,
  }).format(value);
}

function lowStock(material: MaterialArea) {
  return material.stock_minimo > 0 && material.stock_actual <= material.stock_minimo;
}

async function exportAreaToExcel(areaName: string, materials: MaterialArea[]) {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Existencias");
  worksheet.columns = [
    { header: "Material", key: "material", width: 32 },
    { header: "Área", key: "area", width: 28 },
    { header: "Existencia", key: "existencia", width: 14 },
    { header: "Unidad", key: "unidad", width: 16 },
    { header: "Existencia mínima", key: "minimo", width: 20 },
    { header: "Estado", key: "estado", width: 20 },
  ];
  worksheet.addRows(
    materials.map((material) => ({
      material: material.nombre,
      area: material.area,
      existencia: material.stock_actual,
      unidad: material.unidad,
      minimo: material.stock_minimo,
      estado: lowStock(material) ? "Por reabastecer" : "Disponible",
    }))
  );
  worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  worksheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF065F46" },
  };
  worksheet.autoFilter = {
    from: "A1",
    to: `F${Math.max(materials.length + 1, 2)}`,
  };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([new Uint8Array(buffer)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `existencias-${areaName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()}-${[
      new Date().getFullYear(),
      String(new Date().getMonth() + 1).padStart(2, "0"),
      String(new Date().getDate()).padStart(2, "0"),
    ].join("-")}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function Section({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-emerald-950/5 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function DialogShell({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center overflow-y-auto bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="inventory-dialog-title"
        className="max-h-[95dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-7"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 id="inventory-dialog-title" className="text-xl font-bold text-slate-900 sm:text-2xl">
              {title}
            </h2>
            <p className="mt-1.5 text-sm leading-6 text-slate-500">{description}</p>
          </div>
          <button
            type="button"
            aria-label="Cerrar ventana"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-600 transition hover:bg-slate-200"
          >
            ×
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

function FeedbackBanner({ feedback }: { feedback: Feedback }) {
  if (!feedback) return null;

  const styles = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
    error: "border-rose-200 bg-rose-50 text-rose-800",
  };

  return (
    <div role={feedback.kind === "error" ? "alert" : "status"} className={`rounded-2xl border px-4 py-3 text-sm ${styles[feedback.kind]}`}>
      {feedback.text}
    </div>
  );
}

function MaterialSelect({
  value,
  onChange,
  area,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  area?: string;
  disabled?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [materials, setMaterials] = useState<MaterialConsumo[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialConsumo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (disabled) return;

    let active = true;
    const timeout = window.setTimeout(() => {
      setLoading(true);
      getConsumptionMaterialsAction({ search, area })
        .then((results) => {
          if (!active) return;
          setMaterials(results);
          setError("");
        })
        .catch((loadError: unknown) => {
          if (!active) return;
          setError(loadError instanceof Error ? loadError.message : "No se pudieron buscar los materiales.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [area, disabled, search]);

  const visibleMaterials = selectedMaterial && !materials.some((material) => material.id === selectedMaterial.id)
    ? [selectedMaterial, ...materials]
    : materials;

  return (
    <label className="block text-sm font-medium text-slate-700">
      Material y área
      <input
        type="search"
        value={search}
        onChange={(event) => {
          setLoading(true);
          setError("");
          setSearch(event.target.value);
        }}
        disabled={disabled}
        className={fieldClass}
        placeholder={area ? `Buscar en ${area}` : "Buscar material por nombre"}
        aria-label="Buscar material"
      />
      <select
        required
        disabled={disabled || loading || visibleMaterials.length === 0}
        value={value}
        onChange={(event) => {
          const selected = visibleMaterials.find((material) => material.id === event.target.value) ?? null;
          setSelectedMaterial(selected);
          onChange(event.target.value);
        }}
        className={fieldClass}
      >
        <option value="">
          {disabled ? "Primero selecciona un área" : loading ? "Buscando materiales..." : "Selecciona un material"}
        </option>
        {visibleMaterials.map((material) => (
          <option key={material.id} value={material.id}>
            {material.nombre} · {material.area} ({material.unidad})
          </option>
        ))}
      </select>
      {error ? <span role="alert" className="mt-1 block text-xs text-rose-700">{error}</span> : null}
      {!disabled && !loading && !error && visibleMaterials.length === 0 ? (
        <span className="mt-1 block text-xs text-amber-800">
          {search ? "No hay materiales que coincidan con la búsqueda." : "No hay materiales activos para seleccionar."}
        </span>
      ) : null}
      {!disabled && !loading && materials.length === 50 ? (
        <span className="mt-1 block text-xs text-slate-500">
          Se muestran hasta 50 resultados. Escribe un nombre más específico si no aparece el material.
        </span>
      ) : null}
    </label>
  );
}

function MaterialsTable({
  materials,
  emptyMessage = "Agrega materiales y define el mínimo que necesita cada área.",
}: {
  materials: MaterialArea[];
  emptyMessage?: string;
}) {
  if (materials.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 px-5 py-10 text-center">
        <p className="font-semibold text-slate-800">Aún no hay materiales registrados</p>
        <p className="mt-1 text-sm text-slate-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
            <th className="px-3 py-3 font-semibold">Material</th>
            <th className="px-3 py-3 font-semibold">Área</th>
            <th className="px-3 py-3 font-semibold">Existencia</th>
            <th className="px-3 py-3 font-semibold">Mínimo</th>
            <th className="px-3 py-3 font-semibold">Estado</th>
          </tr>
        </thead>
        <tbody>
          {materials.map((material) => {
            const isLow = lowStock(material);
            return (
              <tr key={material.id} className="border-b border-slate-50 last:border-0">
                <td className="px-3 py-4 font-semibold text-slate-900">{material.nombre}</td>
                <td className="px-3 py-4 text-slate-600">{material.area}</td>
                <td className="px-3 py-4 font-semibold text-slate-800">
                  {formatQuantity(material.stock_actual)} {material.unidad}
                </td>
                <td className="px-3 py-4 text-slate-600">
                  {formatQuantity(material.stock_minimo)} {material.unidad}
                </td>
                <td className="px-3 py-4">
                  <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                    isLow
                      ? "border-rose-200 bg-rose-50 text-rose-700"
                      : "border-emerald-200 bg-emerald-50 text-emerald-800"
                  }`}>
                    {isLow ? "Por reabastecer" : "Disponible"}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function movementLabel(movement: MovimientoMaterial) {
  if (movement.tipo === "compra") return "Compra recibida";
  if (movement.tipo === "consumo") return "Consumo";
  return "Ajuste";
}

function movementQuantity(movement: MovimientoMaterial) {
  const sign = movement.tipo === "consumo" || (movement.tipo === "ajuste" && movement.cantidad < 0) ? "−" : "+";
  return `${sign}${formatQuantity(Math.abs(movement.cantidad))} ${movement.materiales_area.unidad}`;
}

function MovementsList({ movements }: { movements: MovimientoMaterial[] }) {
  if (movements.length === 0) {
    return <p className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">Los movimientos aparecerán aquí al registrar compras o consumos.</p>;
  }

  return (
    <div className="space-y-3">
      {movements.map((movement) => (
        <article key={movement.id} className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-slate-100 p-4">
          <div className="min-w-0">
            <p className="font-semibold text-slate-900">{movement.materiales_area.nombre}</p>
            <p className="mt-0.5 text-sm text-slate-500">
              {movementLabel(movement)} · {movement.materiales_area.area}
              {movement.detalle ? ` · ${movement.detalle}` : ""}
            </p>
            {movement.compras_materiales ? (
              <p className="mt-1 text-xs text-slate-500">
                Recibido {formatQuantity(movement.compras_materiales.cantidad_recibida)} de {formatQuantity(movement.compras_materiales.cantidad_solicitada)}
                {movement.compras_materiales.proveedor ? ` · ${movement.compras_materiales.proveedor}` : ""}
                {movement.compras_materiales.referencia ? ` · Folio ${movement.compras_materiales.referencia}` : ""}
                {movement.compras_materiales.costo_unitario !== null
                  ? ` · ${formatCurrency(movement.compras_materiales.costo_unitario)} por unidad`
                  : ""}
              </p>
            ) : null}
            <p className="mt-1 text-xs text-slate-400">
              {new Date(movement.created_at).toLocaleString("es-MX")}
              {movement.registrado_por ? ` · ${movement.registrado_por}` : ""}
            </p>
          </div>
          <div className="text-right">
            <p className={`font-bold ${movement.tipo === "consumo" || movement.cantidad < 0 ? "text-rose-700" : "text-emerald-800"}`}>
              {movementQuantity(movement)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">Quedan {formatQuantity(movement.stock_nuevo)} {movement.materiales_area.unidad}</p>
          </div>
        </article>
      ))}
    </div>
  );
}

function ConsumptionSummary({ records }: { records: RegistroConsumoMaterial[] }) {
  const summaries = useMemo(() => {
    const byMaterial = new Map<
      string,
      {
        id: string;
        nombre: string;
        area: string;
        unidad: string;
        cantidad: number;
        registros: number;
        ultimaActividad: string;
      }
    >();

    for (const record of records) {
      const current = byMaterial.get(record.material_id);
      if (current) {
        current.cantidad += record.cantidad;
        current.registros += 1;
      } else {
        byMaterial.set(record.material_id, {
          id: record.material_id,
          nombre: record.materiales_area.nombre,
          area: record.materiales_area.area,
          unidad: record.materiales_area.unidad,
          cantidad: record.cantidad,
          registros: 1,
          ultimaActividad: record.created_at,
        });
      }
    }

    return [...byMaterial.values()].sort(
      (first, second) => second.cantidad - first.cantidad
    );
  }, [records]);

  if (records.length === 0) {
    return (
      <p className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
        Todavía no hay consumos registrados.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {summaries.map((summary, index) => (
        <article
          key={summary.id}
          className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 ${consumptionColors[index % consumptionColors.length]}`}
        >
          <div className="min-w-0">
            <p className="font-bold">{summary.nombre}</p>
            <p className="mt-1 text-sm opacity-80">{summary.area}</p>
            <p className="mt-1 text-xs opacity-70">
              {summary.registros} registro{summary.registros === 1 ? "" : "s"} · Último:{" "}
              {new Date(summary.ultimaActividad).toLocaleString("es-MX")}
            </p>
          </div>
          <div className="rounded-xl bg-white/80 px-4 py-2 text-right shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide opacity-70">Total consumido</p>
            <p className="text-lg font-extrabold">
              {formatQuantity(summary.cantidad)} {summary.unidad}
            </p>
          </div>
        </article>
      ))}
    </div>
  );
}

function AlertsList({
  alerts,
  canRetry,
  retryingAlert,
  onRetry,
}: {
  alerts: AlertaMaterial[];
  canRetry: boolean;
  retryingAlert: string | null;
  onRetry: (alertId: string) => void;
}) {
  if (alerts.length === 0) {
    return <p className="rounded-2xl bg-emerald-50 px-4 py-8 text-center text-sm text-emerald-800">Todavía no se han generado alertas de mínimo.</p>;
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert) => (
        <article key={alert.id} className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-900">{alert.materiales_area.nombre} · {alert.materiales_area.area}</p>
              <p className="mt-1 text-sm text-slate-600">
                Existencia {formatQuantity(alert.stock_actual)} de mínimo {formatQuantity(alert.stock_minimo)} {alert.materiales_area.unidad}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {alert.estado === "enviado"
                  ? `Correo enviado ${alert.enviado_at ? new Date(alert.enviado_at).toLocaleString("es-MX") : ""}`
                  : alert.estado === "enviando"
                    ? "Envío de correo en curso"
                    : alert.error || "Correo pendiente de envío"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                alert.estado === "enviado"
                  ? "bg-emerald-100 text-emerald-800"
                  : alert.estado === "error"
                    ? "bg-rose-100 text-rose-800"
                    : alert.estado === "enviando"
                      ? "bg-sky-100 text-sky-800"
                    : "bg-amber-100 text-amber-900"
              }`}>
                {alert.estado === "enviado"
                  ? "Enviado"
                  : alert.estado === "error"
                    ? "Error"
                    : alert.estado === "enviando"
                      ? "Enviando"
                      : "Pendiente"}
              </span>
              {canRetry && (alert.estado === "pendiente" || alert.estado === "error") ? (
                <button
                  type="button"
                  onClick={() => onRetry(alert.id)}
                  disabled={retryingAlert === alert.id}
                  className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50"
                >
                  {retryingAlert === alert.id ? "Enviando..." : "Reintentar"}
                </button>
              ) : null}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

export default function InventarioPage() {
  const [session, setSession] = useState<EmployeeSession | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [areaData, setAreaData] = useState<Record<string, {
    materiales: MaterialArea[];
    totalMateriales: number;
  }>>({});
  const [movements, setMovements] = useState<MovimientoMaterial[]>([]);
  const [movementsLoading, setMovementsLoading] = useState(true);
  const [alerts, setAlerts] = useState<AlertaMaterial[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [consumptionHistory, setConsumptionHistory] = useState<RegistroConsumoMaterial[]>([]);
  const [consumptionHistoryLoading, setConsumptionHistoryLoading] = useState(true);
  const [consumptionHistoryError, setConsumptionHistoryError] = useState("");
  const [loading, setLoading] = useState(true);
  const [materialsLoading, setMaterialsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [alertsError, setAlertsError] = useState("");
  const [movementsError, setMovementsError] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [retryingAlert, setRetryingAlert] = useState<string | null>(null);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [adminModule, setAdminModule] = useState<InventoryModule>("existencias");
  const [areaPages, setAreaPages] = useState<Record<string, number>>({});
  const [materialForm, setMaterialForm] = useState({
    nombre: "",
    area: "",
    unidad: "",
    stock_actual: "",
    stock_minimo: "",
  });
  const [purchaseForm, setPurchaseForm] = useState({
    area: "",
    material_id: "",
    proveedor: "",
    referencia: "",
    cantidad_solicitada: "",
    cantidad_recibida: "",
    costo_unitario: "",
    detalle: "",
  });
  const [consumptionForm, setConsumptionForm] = useState({
    material_id: "",
    cantidad: "",
    detalle: "",
  });

  const canManage = Number(session?.nivel_jerarquia ?? 3) <= 2;
  const isConsumptionOnly = Number(session?.nivel_jerarquia) === 4;
  const lowMaterials = useMemo(
    () => Object.values(areaData).flatMap((area) => area.materiales).filter(lowStock),
    [areaData]
  );

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      const currentSession = getEmployeeSession();
      setSession(currentSession);
      setSessionReady(true);
      if (!currentSession || Number(currentSession.nivel_jerarquia) === 4) {
        setLoading(false);
      }
      if (!currentSession) {
        setLoadError("Inicia sesión para consultar el inventario de materiales.");
      }
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!sessionReady || !session) return;
    const shouldLoadInventory = !isConsumptionOnly && (!canManage || adminModule === "existencias");
    if (!shouldLoadInventory) return;

    let active = true;
    getInventoryAreasDataAction(inventoryAreas.map((area) => ({
      area: area.name,
      page: areaPages[area.name] ?? 1,
    })))
      .then((results) => {
        if (!active) return;
        setAreaData(Object.fromEntries(results.map((result) => [result.area, {
          materiales: result.materiales,
          totalMateriales: result.totalMateriales,
        }])));
        setLoadError("");
      })
      .catch((error: unknown) => {
        if (active) {
          setLoadError(error instanceof Error ? error.message : "No se pudo cargar el inventario.");
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
          setMaterialsLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [adminModule, areaPages, canManage, isConsumptionOnly, refreshVersion, session, sessionReady]);

  useEffect(() => {
    if (!sessionReady || !session || isConsumptionOnly) return;
    const shouldLoadActivity = !canManage || adminModule === "movimientos";
    if (!shouldLoadActivity) return;

    let active = true;
    getInventoryMovementsAction()
      .then((records) => {
        if (!active) return;
        setMovements(records);
        setMovementsError("");
      })
      .catch((error: unknown) => {
        if (active) {
          setMovementsError(error instanceof Error ? error.message : "No se pudieron cargar los movimientos.");
        }
      })
      .finally(() => {
        if (active) setMovementsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [adminModule, canManage, isConsumptionOnly, refreshVersion, session, sessionReady]);

  useEffect(() => {
    if (!sessionReady || !session || isConsumptionOnly) return;
    const shouldLoadActivity = !canManage || adminModule === "alertas";
    if (!shouldLoadActivity) return;

    let active = true;
    getInventoryAlertsAction()
      .then((records) => {
        if (!active) return;
        setAlerts(records);
        setAlertsError("");
      })
      .catch((error: unknown) => {
        if (active) {
          setAlertsError(error instanceof Error ? error.message : "No se pudieron cargar las alertas.");
        }
      })
      .finally(() => {
        if (active) setAlertsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [adminModule, canManage, isConsumptionOnly, refreshVersion, session, sessionReady]);

  useEffect(() => {
    if (!sessionReady || !session || (!isConsumptionOnly && canManage && adminModule !== "consumos")) return;
    let active = true;

    getConsumptionHistoryAction()
      .then((records) => {
        if (!active) return;
        setConsumptionHistory(records);
        setConsumptionHistoryError("");
      })
      .catch((error: unknown) => {
        if (!active) return;
        setConsumptionHistoryError(
          error instanceof Error ? error.message : "No se pudo cargar el historial de consumos."
        );
      })
      .finally(() => {
        if (active) setConsumptionHistoryLoading(false);
      });

    return () => {
      active = false;
    };
  }, [adminModule, canManage, isConsumptionOnly, refreshVersion, session, sessionReady]);

  const updateData = () => {
    if (!canManage || adminModule === "existencias") setMaterialsLoading(true);
    if (isConsumptionOnly || !canManage || adminModule === "consumos") setConsumptionHistoryLoading(true);
    if (!canManage || adminModule === "alertas") setAlertsLoading(true);
    if (!canManage || adminModule === "movimientos") setMovementsLoading(true);
    setRefreshVersion((version) => version + 1);
  };

  async function handleExportArea(areaName: string) {
    setFeedback(null);
    setExporting(true);
    try {
      const area = areaName === "Todas las áreas" ? undefined : areaName;
      const exportMaterials = await getInventoryAreaMaterialsForExportAction(area);
      await exportAreaToExcel(areaName, exportMaterials);
      setFeedback({
        kind: "success",
        text: `Se exportaron ${exportMaterials.length} materiales${area ? ` de ${area}` : ""} a Excel.`,
      });
    } catch (error: unknown) {
      setFeedback({
        kind: "error",
        text: error instanceof Error ? error.message : `No se pudieron exportar las existencias de ${areaName}.`,
      });
    } finally {
      setExporting(false);
    }
  }

  function openDialog(nextDialog: Exclude<Dialog, null>) {
    setFeedback(null);
    setDialog(nextDialog);
  }

  async function handleCreateMaterial(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    setBusy(true);
    setFeedback(null);
    try {
      const result = await createMaterialAreaAction({
        nombre: materialForm.nombre,
        area: materialForm.area,
        unidad: materialForm.unidad,
        stock_actual: Number(materialForm.stock_actual),
        stock_minimo: Number(materialForm.stock_minimo),
      });
      setMaterialForm({
        nombre: "",
        area: "",
        unidad: "",
        stock_actual: "",
        stock_minimo: "",
      });
      setDialog(null);
      setFeedback(
        result.correo?.status === "error"
          ? {
              kind: "warning",
              text: `Material registrado con ${formatQuantity(result.material.stock_actual)} ${result.material.unidad}. El aviso para Compras no pudo enviarse: ${result.correo.message}`,
            }
          : {
              kind: "success",
              text: result.correo
                ? `Material registrado con ${formatQuantity(result.material.stock_actual)} ${result.material.unidad}. ${result.correo.message}`
                : `Material registrado con ${formatQuantity(result.material.stock_actual)} ${result.material.unidad} en existencia.`,
            }
      );
      updateData();
    } catch (error: unknown) {
      setFeedback({ kind: "error", text: error instanceof Error ? error.message : "No se pudo registrar el material." });
    } finally {
      setBusy(false);
    }
  }

  async function handleRegisterPurchase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    setBusy(true);
    setFeedback(null);
    try {
      const result = await registerMaterialMovementAction({
        material_id: purchaseForm.material_id,
        tipo: "compra",
        cantidad: Number(purchaseForm.cantidad_recibida),
        cantidad_solicitada: Number(purchaseForm.cantidad_solicitada || purchaseForm.cantidad_recibida),
        proveedor: purchaseForm.proveedor,
        referencia: purchaseForm.referencia,
        costo_unitario: purchaseForm.costo_unitario ? Number(purchaseForm.costo_unitario) : undefined,
        detalle: purchaseForm.detalle,
      });
      setPurchaseForm({
        area: "",
        material_id: "",
        proveedor: "",
        referencia: "",
        cantidad_solicitada: "",
        cantidad_recibida: "",
        costo_unitario: "",
        detalle: "",
      });
      setDialog(null);
      setFeedback(
        result.correo
          ? {
              kind: result.correo.status === "enviado" ? "success" : "warning",
              text: result.correo.status === "enviado"
                ? `Compra recibida. ${result.correo.message}`
                : `Compra recibida y existencias actualizadas, pero el aviso por correo no pudo enviarse: ${result.correo.message}`,
            }
          : { kind: "success", text: "Compra recibida y existencias actualizadas." }
      );
      updateData();
    } catch (error: unknown) {
      setFeedback({ kind: "error", text: error instanceof Error ? error.message : "No se pudo registrar la compra." });
    } finally {
      setBusy(false);
    }
  }

  async function handleRegisterConsumption(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    setBusy(true);
    setFeedback(null);
    try {
      const result = await registerMaterialMovementAction({
        material_id: consumptionForm.material_id,
        tipo: "consumo",
        cantidad: Number(consumptionForm.cantidad),
        detalle: consumptionForm.detalle,
      });
      setConsumptionForm({ material_id: "", cantidad: "", detalle: "" });
      setDialog(null);
      setFeedback(
        result.correo
          ? {
              kind: result.correo.status === "enviado" ? "success" : "warning",
              text: result.correo.status === "enviado"
                ? result.correo.message
                : `Consumo registrado, pero el aviso por correo no pudo enviarse: ${result.correo.message}`,
            }
          : { kind: "success", text: "Consumo registrado y existencias actualizadas." }
      );
      updateData();
    } catch (error: unknown) {
      setFeedback({ kind: "error", text: error instanceof Error ? error.message : "No se pudo registrar el consumo." });
    } finally {
      setBusy(false);
    }
  }

  async function handleRetryAlert(alertId: string) {
    if (!session) return;
    setRetryingAlert(alertId);
    setFeedback(null);
    try {
      const result = await retryMaterialAlertAction(alertId);
      setFeedback({
        kind: result.status === "enviado" ? "success" : "error",
        text: result.message,
      });
      updateData();
    } catch (error: unknown) {
      setFeedback({ kind: "error", text: error instanceof Error ? error.message : "No se pudo reintentar el correo." });
    } finally {
      setRetryingAlert(null);
    }
  }

  const totalMaterials = inventoryAreas.reduce(
    (total, area) => total + (areaData[area.name]?.totalMateriales ?? 0),
    0
  );
  const materialsLow = lowMaterials.length;
  const showInventoryModule = !canManage || adminModule === "existencias";
  const showConsumptionModule = !canManage || adminModule === "consumos";
  const showAlertsModule = !canManage || adminModule === "alertas";
  const showMovementsModule = !canManage || adminModule === "movimientos";

  if (!sessionReady || loading) {
    return (
      <main className="min-h-[60vh] px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-7xl animate-pulse rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">
          Cargando inventario de materiales...
        </div>
      </main>
    );
  }

  if (isConsumptionOnly) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-emerald-50/50 via-slate-50 to-amber-50/30 px-4 py-8 sm:px-6 sm:py-12">
        <div className="mx-auto max-w-2xl space-y-5">
          <header className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">M. López · Materiales y compras</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Registrar consumo</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Selecciona el material utilizado e indica la cantidad para registrar su consumo.
            </p>
          </header>
          <FeedbackBanner feedback={feedback} />
          {loadError ? (
            <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {loadError}
            </div>
          ) : null}
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <form onSubmit={handleRegisterConsumption} className="space-y-4">
              <MaterialSelect
                value={consumptionForm.material_id}
                onChange={(value) => setConsumptionForm({ ...consumptionForm, material_id: value })}
              />
              <label className="block text-sm font-medium text-slate-700">
                Cantidad consumida
                <input required type="number" min="0.001" step="0.001" value={consumptionForm.cantidad} onChange={(event) => setConsumptionForm({ ...consumptionForm, cantidad: event.target.value })} className={fieldClass} />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Nota (opcional)
                <input maxLength={500} value={consumptionForm.detalle} onChange={(event) => setConsumptionForm({ ...consumptionForm, detalle: event.target.value })} className={fieldClass} />
              </label>
              <button type="submit" disabled={busy} className={primaryButtonClass}>
                {busy ? "Registrando..." : "Guardar consumo"}
              </button>
            </form>
          </section>
          <Section
            title="Consumos registrados"
            description="Materiales y cantidades acumuladas de los últimos 100 registros."
          >
            {consumptionHistoryError ? (
              <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                {consumptionHistoryError}
              </p>
            ) : consumptionHistoryLoading ? (
              <p className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                Cargando consumos...
              </p>
            ) : (
              <ConsumptionSummary records={consumptionHistory} />
            )}
          </Section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50/50 via-slate-50 to-amber-50/30 px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-5 rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm sm:flex-row sm:items-end sm:justify-between sm:p-7">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">M. López · Abastecimiento</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Compras e inventario de materiales</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Registra lo solicitado y lo que realmente llegó. El saldo se actualiza con las recepciones y consumos por área.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canManage ? (
              <button type="button" onClick={() => openDialog("material")} className={primaryButtonClass}>
                + Material
              </button>
            ) : null}
            {canManage ? (
              <button type="button" onClick={() => openDialog("compra")} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50">
                Registrar compra
              </button>
            ) : null}
            <button type="button" onClick={() => openDialog("consumo")} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
              Registrar consumo
            </button>
          </div>
        </header>

        <FeedbackBanner feedback={feedback} />
        {canManage ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Espacio administrativo</p>
              <h2 className="mt-1 text-lg font-bold text-slate-900">¿Qué deseas consultar?</h2>
            </div>
            <nav aria-label="Módulos de Compras e inventario" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {inventoryModules.map((module) => {
                const isActive = adminModule === module.id;
                const isInventory = module.id === "existencias";
                const count = module.id === "consumos"
                  ? consumptionHistory.length
                  : module.id === "alertas"
                    ? alerts.length
                    : module.id === "movimientos"
                      ? movements.length
                      : totalMaterials;
                const activeStyles = {
                  emerald: "border-emerald-300 bg-emerald-50 ring-2 ring-emerald-100",
                  violet: "border-violet-300 bg-violet-50 ring-2 ring-violet-100",
                  amber: "border-amber-300 bg-amber-50 ring-2 ring-amber-100",
                  sky: "border-sky-300 bg-sky-50 ring-2 ring-sky-100",
                }[module.color];
                return (
                  <button
                    key={module.id}
                    type="button"
                    onClick={() => {
                      setAdminModule(module.id);
                      if (module.id === "consumos") setConsumptionHistoryLoading(true);
                      if (isInventory) setMaterialsLoading(true);
                      if (module.id === "alertas") setAlertsLoading(true);
                      if (module.id === "movimientos") setMovementsLoading(true);
                      setAlertsError("");
                      setMovementsError("");
                      setLoadError("");
                    }}
                    aria-current={isActive ? "page" : undefined}
                    className={`group flex min-h-24 items-center gap-3 rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${
                      isActive ? activeStyles : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
                      {module.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold text-slate-900">{module.title}</span>
                      <span className="mt-1 block text-xs leading-5 text-slate-500">{module.description}</span>
                    </span>
                    <span className="shrink-0 rounded-full bg-white/80 px-2.5 py-1 text-xs font-bold text-slate-600">
                      {isActive ? "Abierto" : count}
                    </span>
                  </button>
                );
              })}
            </nav>
          </section>
        ) : null}
        {showInventoryModule && loadError ? (
          <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {loadError}
          </div>
        ) : null}
        {showInventoryModule && !loadError ? (
          <>
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                { label: "Materiales activos", value: totalMaterials, icon: "📦" },
                { label: "Por reabastecer en las páginas visibles", value: materialsLow, icon: "⚠️" },
                { label: "Áreas de trabajo", value: inventoryAreas.length, icon: "📊" },
              ].map((stat) => (
                <article key={stat.label} className="flex items-center gap-4 rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-2xl" aria-hidden="true">{stat.icon}</span>
                  <div>
                    <p className="text-sm text-slate-500">{stat.label}</p>
                    <p className="mt-0.5 text-2xl font-bold text-slate-900">{stat.value}</p>
                  </div>
                </article>
              ))}
            </section>

            {materialsLow > 0 ? (
              <div role="status" className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                En las páginas visibles hay {materialsLow} material{materialsLow === 1 ? "" : "es"} en o por debajo del mínimo.
              </div>
            ) : null}

            <nav aria-label="Áreas de inventario" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {inventoryAreas.map((area) => {
                const areaTotal = areaData[area.name]?.totalMateriales ?? 0;
                return (
                  <a
                    key={area.id}
                    href={`#${area.id}`}
                    className={`flex items-center gap-3 rounded-2xl p-4 ring-1 transition hover:-translate-y-0.5 hover:shadow-md ${area.color}`}
                  >
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/80 text-2xl shadow-sm" aria-hidden="true">{area.icon}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold">{area.name}</span>
                      <span className="mt-1 block text-xs opacity-80">{area.description}</span>
                    </span>
                    <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-bold">{areaTotal}</span>
                  </a>
                );
              })}
            </nav>

            <div className="space-y-5">
              {inventoryAreas.map((area) => {
                const areaMaterials = areaData[area.name]?.materiales ?? [];
                const areaTotal = areaData[area.name]?.totalMateriales ?? 0;
                const page = areaPages[area.name] ?? 1;
                const lastVisible = Math.min(page * inventoryPageSize, areaTotal);
                const areaLow = areaMaterials.filter(lowStock).length;
                return (
                  <section
                    key={area.id}
                    id={area.id}
                    className="scroll-mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
                  >
                    <header className={`flex flex-wrap items-center justify-between gap-4 border-b px-5 py-4 sm:px-6 ${area.color}`}>
                      <div className="flex items-center gap-3">
                        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/80 text-2xl shadow-sm" aria-hidden="true">{area.icon}</span>
                        <div>
                          <h2 className="text-lg font-bold">{area.name}</h2>
                          <p className="mt-0.5 text-sm opacity-80">{area.description}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-white/80 px-3 py-1.5 text-xs font-bold">
                          {areaTotal} {areaTotal === 1 ? "material" : "materiales"}
                        </span>
                        {canManage ? (
                          <button
                            type="button"
                            onClick={() => void handleExportArea(area.name)}
                            disabled={exporting}
                            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/80 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
                          >
                            <span aria-hidden="true">📥</span>
                            {exporting ? "Preparando..." : "Exportar Excel"}
                          </button>
                        ) : null}
                      </div>
                    </header>
                    <div className="p-4 sm:p-6">
                      {materialsLoading ? (
                        <p role="status" className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                          Cargando materiales de {area.name}...
                        </p>
                      ) : (
                        <MaterialsTable
                          materials={areaMaterials}
                          emptyMessage={`Agrega materiales y asígnalos a ${area.name}.`}
                        />
                      )}
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                        <div className="text-sm text-slate-500">
                          {areaTotal === 0
                            ? "Aún no hay materiales en esta área."
                            : `Mostrando ${((page - 1) * inventoryPageSize) + 1}–${lastVisible} de ${areaTotal} materiales`}
                          {!materialsLoading && areaLow > 0 ? (
                            <span className="ml-2 font-semibold text-amber-700">
                              · {areaLow} por reabastecer en esta página
                            </span>
                          ) : null}
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setMaterialsLoading(true);
                              setAreaPages((pages) => ({ ...pages, [area.name]: Math.max(1, page - 1) }));
                            }}
                            disabled={page <= 1 || materialsLoading}
                            className="min-h-10 rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Anterior
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setMaterialsLoading(true);
                              setAreaPages((pages) => ({ ...pages, [area.name]: page + 1 }));
                            }}
                            disabled={page * inventoryPageSize >= areaTotal || materialsLoading}
                            className="min-h-10 rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Siguiente
                          </button>
                        </div>
                      </div>
                    </div>
                  </section>
                );
              })}
            </div>
          </>
        ) : null}

        {showConsumptionModule ? (
            <Section
              title="Consumos registrados"
              description="Cantidades acumuladas por material, agrupadas de los últimos 100 registros de consumo."
            >
              {consumptionHistoryError ? (
                <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                  {consumptionHistoryError}
                </p>
              ) : consumptionHistoryLoading ? (
                <p className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                  Cargando consumos...
                </p>
              ) : (
                <ConsumptionSummary records={consumptionHistory} />
              )}
            </Section>
        ) : null}

        {showAlertsModule ? (
          <Section title="Alertas para Compras" description="Avisos creados al bajar del mínimo. Los correos fallidos se pueden reintentar.">
            {alertsError ? (
              <p role="alert" className="mb-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{alertsError}</p>
            ) : alertsLoading ? (
              <p role="status" className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">Cargando alertas...</p>
            ) : null}
            {!alertsLoading && !alertsError ? (
              <AlertsList
                alerts={alerts}
                canRetry={canManage}
                retryingAlert={retryingAlert}
                onRetry={handleRetryAlert}
              />
            ) : null}
          </Section>
        ) : null}
        {showMovementsModule ? (
          <Section title="Últimos movimientos" description="Entradas recibidas, consumos y ajustes recientes.">
            {movementsError ? (
              <p role="alert" className="mb-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{movementsError}</p>
            ) : movementsLoading ? (
              <p role="status" className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">Cargando movimientos...</p>
            ) : null}
            {!movementsLoading && !movementsError ? <MovementsList movements={movements} /> : null}
          </Section>
        ) : null}
      </div>

      {dialog === "material" && canManage ? (
        <DialogShell
          title="Agregar material"
          description="Define el área, unidad de medida y mínimo para activar las alertas de reabastecimiento."
          onClose={() => setDialog(null)}
        >
          <form onSubmit={handleCreateMaterial} className="space-y-4">
            <label className="block text-sm font-medium text-slate-700">
              Nombre del material
              <input required maxLength={120} value={materialForm.nombre} onChange={(event) => setMaterialForm({ ...materialForm, nombre: event.target.value })} className={fieldClass} placeholder="Ej. Guantes de nitrilo" />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">
                Área
                <select required value={materialForm.area} onChange={(event) => setMaterialForm({ ...materialForm, area: event.target.value })} className={fieldClass}>
                  <option value="">Selecciona un área</option>
                  {inventoryAreas.map((area) => (
                    <option key={area.id} value={area.name}>{area.name}</option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Unidad
                <select required value={materialForm.unidad} onChange={(event) => setMaterialForm({ ...materialForm, unidad: event.target.value })} className={fieldClass}>
                  <option value="">Selecciona una unidad</option>
                  {measurementUnits.map((unit) => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block text-sm font-medium text-slate-700">
              Cantidad disponible actualmente
              <input required type="number" min="0" max="1000000000" step="0.001" value={materialForm.stock_actual} onChange={(event) => setMaterialForm({ ...materialForm, stock_actual: event.target.value })} className={fieldClass} placeholder="Ej. 15" />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Existencia mínima
              <input required type="number" min="0" step="0.001" value={materialForm.stock_minimo} onChange={(event) => setMaterialForm({ ...materialForm, stock_minimo: event.target.value })} className={fieldClass} placeholder="Ej. 20" />
            </label>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setDialog(null)} className="min-h-11 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancelar</button>
              <button type="submit" disabled={busy} className={primaryButtonClass}>{busy ? "Guardando..." : "Guardar material"}</button>
            </div>
          </form>
        </DialogShell>
      ) : null}

      {dialog === "compra" && canManage ? (
        <DialogShell
          title="Registrar compra recibida"
          description="Registra lo pedido y la cantidad que llegó. Solo lo recibido se suma al inventario."
          onClose={() => setDialog(null)}
        >
          <form onSubmit={handleRegisterPurchase} className="space-y-4">
            <label className="block text-sm font-medium text-slate-700">
              Área
              <select
                required
                value={purchaseForm.area}
                onChange={(event) => setPurchaseForm({ ...purchaseForm, area: event.target.value, material_id: "" })}
                className={fieldClass}
              >
                <option value="">Selecciona un área</option>
                {inventoryAreas.map((area) => (
                  <option key={area.id} value={area.name}>{area.name}</option>
                ))}
              </select>
            </label>
            <MaterialSelect
              key={purchaseForm.area}
              value={purchaseForm.material_id}
              onChange={(value) => setPurchaseForm({ ...purchaseForm, material_id: value })}
              area={purchaseForm.area}
              disabled={!purchaseForm.area}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">
                Cantidad solicitada
                <input required type="number" min="0.001" step="0.001" value={purchaseForm.cantidad_solicitada} onChange={(event) => setPurchaseForm({ ...purchaseForm, cantidad_solicitada: event.target.value })} className={fieldClass} />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Cantidad recibida
                <input required type="number" min="0.001" step="0.001" value={purchaseForm.cantidad_recibida} onChange={(event) => setPurchaseForm({ ...purchaseForm, cantidad_recibida: event.target.value })} className={fieldClass} />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Proveedor
                <input maxLength={120} value={purchaseForm.proveedor} onChange={(event) => setPurchaseForm({ ...purchaseForm, proveedor: event.target.value })} className={fieldClass} />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Folio / orden de compra
                <input maxLength={80} value={purchaseForm.referencia} onChange={(event) => setPurchaseForm({ ...purchaseForm, referencia: event.target.value })} className={fieldClass} />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Costo unitario (opcional)
                <input type="number" min="0" step="0.0001" value={purchaseForm.costo_unitario} onChange={(event) => setPurchaseForm({ ...purchaseForm, costo_unitario: event.target.value })} className={fieldClass} />
              </label>
              <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
                Nota (opcional)
                <input maxLength={500} value={purchaseForm.detalle} onChange={(event) => setPurchaseForm({ ...purchaseForm, detalle: event.target.value })} className={fieldClass} placeholder="Ej. Entrega parcial, faltaron 2 cajas" />
              </label>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setDialog(null)} className="min-h-11 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancelar</button>
              <button type="submit" disabled={busy} className={primaryButtonClass}>{busy ? "Registrando..." : "Guardar recepción"}</button>
            </div>
          </form>
        </DialogShell>
      ) : null}

      {dialog === "consumo" ? (
        <DialogShell
          title="Registrar consumo"
          description="Registra la salida del material usado por el área para mantener las existencias actualizadas."
          onClose={() => setDialog(null)}
        >
          <form onSubmit={handleRegisterConsumption} className="space-y-4">
            <MaterialSelect
              value={consumptionForm.material_id}
              onChange={(value) => setConsumptionForm({ ...consumptionForm, material_id: value })}
            />
            <label className="block text-sm font-medium text-slate-700">
              Cantidad consumida
              <input required type="number" min="0.001" step="0.001" value={consumptionForm.cantidad} onChange={(event) => setConsumptionForm({ ...consumptionForm, cantidad: event.target.value })} className={fieldClass} />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Nota (opcional)
              <input maxLength={500} value={consumptionForm.detalle} onChange={(event) => setConsumptionForm({ ...consumptionForm, detalle: event.target.value })} className={fieldClass} />
            </label>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setDialog(null)} className="min-h-11 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancelar</button>
              <button type="submit" disabled={busy} className={primaryButtonClass}>{busy ? "Registrando..." : "Guardar consumo"}</button>
            </div>
          </form>
        </DialogShell>
      ) : null}
    </main>
  );
}

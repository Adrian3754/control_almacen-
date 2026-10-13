"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  createMaterialAreaAction,
  getConsumptionMaterialsAction,
  getInventoryDataAction,
  registerMaterialMovementAction,
  retryMaterialAlertAction,
  type AlertaMaterial,
  type MaterialArea,
  type MaterialConsumo,
  type MovimientoMaterial,
} from "@/components/actions/inventario-materiales.actions";
import { getEmployeeSession, type EmployeeSession } from "@/lib/employeeSession";

type Dialog = "material" | "compra" | "consumo" | null;
type Feedback = { kind: "success" | "error" | "warning"; text: string } | null;

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

function normalizeArea(area: string) {
  return area.trim().toLocaleLowerCase("es-MX");
}

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
  materials,
  value,
  onChange,
  disabled = false,
}: {
  materials: MaterialConsumo[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      Material y área
      <select required disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)} className={fieldClass}>
        <option value="">{disabled ? "Primero selecciona un área" : "Selecciona un material"}</option>
        {materials.map((material) => (
          <option key={material.id} value={material.id}>
            {material.nombre} · {material.area} ({material.unidad})
          </option>
        ))}
      </select>
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
  const [data, setData] = useState<{
    materiales: MaterialArea[];
    movimientos: MovimientoMaterial[];
    alertas: AlertaMaterial[];
  } | null>(null);
  const [consumptionMaterials, setConsumptionMaterials] = useState<MaterialConsumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [busy, setBusy] = useState(false);
  const [retryingAlert, setRetryingAlert] = useState<string | null>(null);
  const [refreshVersion, setRefreshVersion] = useState(0);
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
    () => (data?.materiales ?? []).filter(lowStock),
    [data?.materiales]
  );

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      const currentSession = getEmployeeSession();
      setSession(currentSession);
      setSessionReady(true);
      if (!currentSession) {
        setLoadError("Inicia sesión para consultar el inventario de materiales.");
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!sessionReady || !session) return;
    let active = true;
    const inventoryRequest = isConsumptionOnly
      ? getConsumptionMaterialsAction().then((materials) => {
          if (active) setConsumptionMaterials(materials);
        })
      : getInventoryDataAction().then((inventory) => {
          if (active) setData(inventory);
        });
    inventoryRequest
      .then(() => {
        if (active) {
          setLoadError("");
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setLoadError(error instanceof Error ? error.message : "No se pudo cargar el inventario.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isConsumptionOnly, session, sessionReady, refreshVersion]);

  const updateData = () => setRefreshVersion((version) => version + 1);

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

  const materials = data?.materiales ?? [];
  const movements = data?.movimientos ?? [];
  const alerts = data?.alertas ?? [];
  const totalMaterials = materials.length;
  const materialsLow = lowMaterials.length;
  const areaCount = new Set(materials.map((material) => material.area)).size;
  const knownAreaNames = new Set(inventoryAreas.map((area) => normalizeArea(area.name)));
  const purchaseMaterials = purchaseForm.area
    ? materials.filter((material) => normalizeArea(material.area) === normalizeArea(purchaseForm.area))
    : [];
  const materialsByOtherArea = materials.filter(
    (material) => !knownAreaNames.has(normalizeArea(material.area))
  );
  const otherAreaNames = [...new Set(materialsByOtherArea.map((material) => material.area))];

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
            {consumptionMaterials.length === 0 && !loadError ? (
              <p className="mb-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
                No hay materiales activos para registrar. Comunícate con tu supervisor.
              </p>
            ) : null}
            <form onSubmit={handleRegisterConsumption} className="space-y-4">
              <MaterialSelect
                materials={consumptionMaterials}
                value={consumptionForm.material_id}
                onChange={(value) => setConsumptionForm({ ...consumptionForm, material_id: value })}
                disabled={consumptionMaterials.length === 0}
              />
              <label className="block text-sm font-medium text-slate-700">
                Cantidad consumida
                <input required type="number" min="0.001" step="0.001" value={consumptionForm.cantidad} onChange={(event) => setConsumptionForm({ ...consumptionForm, cantidad: event.target.value })} className={fieldClass} />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Nota (opcional)
                <input maxLength={500} value={consumptionForm.detalle} onChange={(event) => setConsumptionForm({ ...consumptionForm, detalle: event.target.value })} className={fieldClass} />
              </label>
              <button type="submit" disabled={busy || consumptionMaterials.length === 0} className={primaryButtonClass}>
                {busy ? "Registrando..." : "Guardar consumo"}
              </button>
            </form>
          </section>
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
              <button type="button" onClick={() => openDialog("compra")} disabled={materials.length === 0} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50">
                Registrar compra
              </button>
            ) : null}
            <button type="button" onClick={() => openDialog("consumo")} disabled={materials.length === 0} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
              Registrar consumo
            </button>
          </div>
        </header>

        <FeedbackBanner feedback={feedback} />
        {loadError ? (
          <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {loadError}
          </div>
        ) : null}

        {!loadError ? (
          <>
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                { label: "Materiales registrados", value: totalMaterials, icon: "📦" },
                { label: "Materiales por reabastecer", value: materialsLow, icon: "⚠️" },
                { label: "Áreas registradas", value: areaCount, icon: "📊" },
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
                Hay {materialsLow} material{materialsLow === 1 ? "" : "es"} en o por debajo del mínimo. Se generará un correo al cruzar el mínimo configurado.
              </div>
            ) : null}

            <section className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Áreas de compras</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Selecciona un área para consultar sus materiales. Cada tabla muestra existencias y mínimos.
                </p>
              </div>
              <nav aria-label="Áreas de compras" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {inventoryAreas.map((area) => {
                  const areaMaterials = materials.filter(
                    (material) => normalizeArea(material.area) === normalizeArea(area.name)
                  );
                  return (
                    <a
                      key={area.id}
                      href={`#${area.id}`}
                      className={`flex items-center gap-3 rounded-2xl px-4 py-3 ring-1 transition hover:-translate-y-0.5 hover:shadow-sm ${area.color}`}
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/80 text-xl" aria-hidden="true">{area.icon}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold">{area.name}</span>
                        <span className="mt-0.5 block text-xs opacity-80">{area.description}</span>
                      </span>
                      <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-bold">{areaMaterials.length}</span>
                    </a>
                  );
                })}
              </nav>

              <div className="space-y-4">
                {inventoryAreas.map((area) => {
                  const areaMaterials = materials.filter(
                    (material) => normalizeArea(material.area) === normalizeArea(area.name)
                  );
                  return (
                    <div key={area.id} id={area.id} className="scroll-mt-6">
                      <Section
                        title={`${area.icon} ${area.name}`}
                        description={area.description}
                      >
                        <MaterialsTable
                          materials={areaMaterials}
                          emptyMessage={`Agrega materiales y asígnalos a ${area.name}.`}
                        />
                      </Section>
                    </div>
                  );
                })}
                {materialsByOtherArea.length > 0 ? (
                  <Section
                    title="Otras áreas registradas"
                    description={`Se conservan aquí materiales anteriores asignados a: ${otherAreaNames.join(", ")}.`}
                  >
                    <MaterialsTable materials={materialsByOtherArea} />
                  </Section>
                ) : null}
              </div>
            </section>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <Section title="Alertas para Compras" description="Avisos creados al bajar del mínimo. Los correos fallidos se pueden reintentar.">
                <AlertsList
                  alerts={alerts}
                  canRetry={canManage}
                  retryingAlert={retryingAlert}
                  onRetry={handleRetryAlert}
                />
              </Section>
              <Section title="Últimos movimientos" description="Entradas recibidas, consumos y ajustes recientes.">
                <MovementsList movements={movements} />
              </Section>
            </div>
          </>
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
              materials={purchaseMaterials}
              value={purchaseForm.material_id}
              onChange={(value) => setPurchaseForm({ ...purchaseForm, material_id: value })}
              disabled={!purchaseForm.area}
            />
            {purchaseForm.area && purchaseMaterials.length === 0 ? (
              <p className="-mt-2 text-xs text-amber-800">
                No hay materiales registrados para esta área. Registra primero el material en el inventario.
              </p>
            ) : null}
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
              materials={materials}
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

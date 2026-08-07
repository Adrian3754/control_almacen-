"use client";

import { useEffect, useMemo, useState } from "react";
import { getCuentasAction, createCuentaAction, updateCuentaAction, deleteCuentaAction, type Cuenta } from "@/components/actions/cuentas.actions";
import { getEmployeeSession } from "@/lib/employeeSession";

const bankPalette = {
  bbva: "bg-sky-50 text-sky-700 border-sky-200",
  bancomer: "bg-rose-50 text-rose-700 border-rose-200",
  santander: "bg-amber-50 text-amber-800 border-amber-200",
  citibanamex: "bg-cyan-50 text-cyan-700 border-cyan-200",
  hsbc: "bg-slate-50 text-slate-800 border-slate-200",
  amarillo: "bg-amber-50 text-amber-800 border-amber-200",
  default: "bg-slate-50 text-slate-700 border-slate-200",
};

function getBankStyle(banco: string | null) {
  if (!banco) return bankPalette.default;
  const key = banco.trim().toLowerCase();
  if (key.includes("bbva")) return bankPalette.bbva;
  if (key.includes("bancomer") || key.includes("bbva")) return bankPalette.bancomer;
  if (key.includes("santander")) return bankPalette.santander;
  if (key.includes("citibanamex") || key.includes("banamex")) return bankPalette.citibanamex;
  if (key.includes("hsbc")) return bankPalette.hsbc;
  return bankPalette.default;
}

function getBankCardStyle(banco: string | null) {
  if (!banco) return "border-slate-200 bg-slate-50";
  const key = banco.trim().toLowerCase();
  if (key.includes("bbva")) return "border-sky-200 bg-sky-50";
  if (key.includes("bancomer") || key.includes("bbva")) return "border-rose-200 bg-rose-50";
  if (key.includes("santander")) return "border-amber-200 bg-amber-50";
  if (key.includes("citibanamex") || key.includes("banamex")) return "border-cyan-200 bg-cyan-50";
  if (key.includes("hsbc")) return "border-slate-200 bg-slate-50";
  return "border-slate-200 bg-slate-50";
}

const bankOptions = ["BBVA", "Bancomer", "Santander", "Citibanamex", "HSBC", "Otro"];

type CuentaForm = {
  proveedor: string;
  giro: string;
  direccion: string;
  telefono: string;
  banco: string;
  referencia: string;
  cuenta_cie: string;
  clave_bancaria: string;
  beneficiario: string;
};

const initialFormState: CuentaForm = {
  proveedor: "",
  giro: "",
  direccion: "",
  telefono: "",
  banco: "BBVA",
  referencia: "",
  cuenta_cie: "",
  clave_bancaria: "",
  beneficiario: "",
};

export default function CuentasPage() {
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingCuentaId, setEditingCuentaId] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<Cuenta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<CuentaForm>(initialFormState);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterBank, setFilterBank] = useState("Todos");
  const [filterEstado, setFilterEstado] = useState("Todos");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedCuenta, setSelectedCuenta] = useState<Cuenta | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sessionLevel] = useState<number | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }

    const session = getEmployeeSession();
    return session?.nivel_jerarquia != null ? Number(session.nivel_jerarquia) : null;
  });

  const ITEMS_PER_PAGE = 10;
  const bankFilterOptions = ["Todos", ...bankOptions];
  const estadoOptions = ["Todos", "Activo", "Inactivo"];
  const canManageAccounts = Number(sessionLevel) === 1;

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        const cuentasData = await getCuentasAction();
        setCuentas(cuentasData);
      } catch (err) {
        console.error("Error cargando cuentas:", err);
        setError("No se pudieron obtener las cuentas. Revisa la conexión o la tabla de la base de datos.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const filteredCuentas = useMemo(() => {
    return cuentas.filter((cuenta) => {
      const search = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !search ||
        cuenta.proveedor.toLowerCase().includes(search) ||
        cuenta.giro.toLowerCase().includes(search) ||
        (cuenta.banco ?? "").toLowerCase().includes(search) ||
        (cuenta.beneficiario ?? "").toLowerCase().includes(search) ||
        (cuenta.cuenta_cie ?? "").toLowerCase().includes(search);

      const matchesBank =
        filterBank === "Todos" || (cuenta.banco ?? "").toLowerCase() === filterBank.toLowerCase();

      const activeStatus = cuenta.activo ? "activo" : "inactivo";
      const matchesEstado =
        filterEstado === "Todos" || activeStatus === filterEstado.toLowerCase();

      return matchesSearch && matchesBank && matchesEstado;
    });
  }, [cuentas, searchQuery, filterBank, filterEstado]);

  const totalPages = Math.max(Math.ceil(filteredCuentas.length / ITEMS_PER_PAGE), 1);
  const currentPageIndex = Math.min(currentPage, totalPages) - 1;
  const cuentasPage = filteredCuentas.slice(currentPageIndex * ITEMS_PER_PAGE, currentPageIndex * ITEMS_PER_PAGE + ITEMS_PER_PAGE);

  function resetModal() {
    setModalOpen(false);
    setModalMode("create");
    setEditingCuentaId(null);
    setForm(initialFormState);
    setError(null);
  }

  function openCreateModal() {
    setModalMode("create");
    setEditingCuentaId(null);
    setForm(initialFormState);
    setError(null);
    setModalOpen(true);
  }

  function openEditModal(cuenta: Cuenta) {
    setModalMode("edit");
    setEditingCuentaId(cuenta.id);
    setForm({
      proveedor: cuenta.proveedor ?? "",
      giro: cuenta.giro ?? "",
      direccion: cuenta.direccion ?? "",
      telefono: cuenta.telefono ?? "",
      banco: cuenta.banco ?? "Otro",
      referencia: cuenta.referencia ?? "",
      cuenta_cie: cuenta.cuenta_cie ?? "",
      clave_bancaria: cuenta.clave_bancaria ?? "",
      beneficiario: cuenta.beneficiario ?? "",
    });
    setError(null);
    setModalOpen(true);
  }

  async function handleSaveCuenta(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canManageAccounts) {
      setError("Solo los usuarios con jerarquía 1 pueden modificar cuentas.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (modalMode === "edit" && editingCuentaId) {
        const cuentaActual = cuentas.find((item) => item.id === editingCuentaId);
        const cuentaActualizada = await updateCuentaAction(editingCuentaId, {
          ...form,
          activo: cuentaActual?.activo ?? true,
        });

        setCuentas((current) => current.map((item) => (item.id === cuentaActualizada.id ? cuentaActualizada : item)));
        setSelectedCuenta(cuentaActualizada);
      } else {
        const nuevaCuenta = await createCuentaAction({
          ...form,
          activo: true,
        });

        setCuentas((current) => [nuevaCuenta, ...current]);
      }

      resetModal();
    } catch (err) {
      console.error("Error guardando cuenta:", err);
      setError(modalMode === "edit" ? "No se pudo actualizar la cuenta. Intenta nuevamente." : "No se pudo registrar la cuenta. Intenta nuevamente.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteCuenta() {
    if (!accountToDelete || !canManageAccounts) return;

    setSaving(true);
    setError(null);

    try {
      await deleteCuentaAction(accountToDelete.id);
      setCuentas((current) => current.filter((item) => item.id !== accountToDelete.id));
      if (selectedCuenta?.id === accountToDelete.id) {
        setSelectedCuenta(null);
      }
      setDeleteModalOpen(false);
      setAccountToDelete(null);
    } catch (err) {
      console.error("Error eliminando cuenta:", err);
      setError("No se pudo eliminar la cuenta. Intenta nuevamente.");
    } finally {
      setSaving(false);
    }
  }

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function copyToClipboard(value: string | null) {
    if (!value) return;
    await navigator.clipboard.writeText(value);
  }

  return (
    <main className="min-h-screen bg-transparent">
      <div className="max-w-7xl mx-auto p-6 sm:p-8">
        <section className="mb-8 rounded-3xl bg-slate-50 border border-slate-200 p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <h1 className="text-3xl font-semibold text-slate-900">Cuentas Bancarias</h1>
              <p className="mt-2 text-slate-600">Lista de cuentas con indicadores visuales por banco y un formulario rápido para dar de alta nuevas cuentas.</p>
            </div>

            {canManageAccounts ? (
              <button
                type="button"
                onClick={openCreateModal}
                className="rounded-full bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 shadow-sm active:scale-95"
              >
                Nueva cuenta
              </button>
            ) : (
              <div className="rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 shadow-sm">
                Solo jerarquía 1 puede modificar cuentas
              </div>
            )}
          </div>
        </section>

        <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Buscar en cuentas</h2>
              <p className="mt-1 text-sm text-slate-500">Escribe para buscar proveedor, banco, beneficiario o cuenta en la tabla.</p>
            </div>
            <button
              type="button"
              onClick={() => setFiltersOpen((open) => !open)}
              className="w-full sm:w-auto inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
            >
              <span className="text-base"></span>
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                </svg>
            </button>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Buscar en la tabla..."
              className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-500 focus:bg-white"
            />
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900">
              {loading ? "..." : `${filteredCuentas.length} cuentas`}
            </div>
          </div>

          {filtersOpen && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Banco</span>
                <select
                  value={filterBank}
                  onChange={(e) => {
                    setFilterBank(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-500 focus:bg-white"
                >
                  {bankFilterOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Estado</span>
                <select
                  value={filterEstado}
                  onChange={(e) => {
                    setFilterEstado(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-500 focus:bg-white"
                >
                  {estadoOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setFilterBank("Todos");
                    setFilterEstado("Todos");
                    setCurrentPage(1);
                  }}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-200"
                >
                  Limpiar filtros
                </button>
              </div>
            </div>
          )}
        </section>

        {selectedCuenta && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/40 px-4 py-6 backdrop-blur-sm">
            <div className="mx-auto mt-10 w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-200 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">Proveedor seleccionado</p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-900">{selectedCuenta.proveedor}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCuenta(null)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition"
                >
                  ×
                </button>
              </div>

              <div className="mt-6 space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-wider text-slate-500">Banco</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{selectedCuenta.banco || "Otro"}</p>
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-wider text-slate-500">Estado</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{selectedCuenta.activo ? "Activo" : "Inactivo"}</p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-wider text-slate-500">Giro</p>
                    <p className="mt-2 text-sm text-slate-700">{selectedCuenta.giro}</p>
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-wider text-slate-500">Beneficiario</p>
                    <p className="mt-2 text-sm text-slate-700">{selectedCuenta.beneficiario || "Sin beneficiario"}</p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs uppercase tracking-wider text-slate-500">Cuenta / CIE</p>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(selectedCuenta.cuenta_cie)}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                      >
                        Copiar
                      </button>
                    </div>
                    <p className="mt-2 text-sm font-mono text-slate-700">{selectedCuenta.cuenta_cie || "-"}</p>
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs uppercase tracking-wider text-slate-500">Clave bancaria</p>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(selectedCuenta.clave_bancaria)}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                      >
                        Copiar
                      </button>
                    </div>
                    <p className="mt-2 text-sm font-mono text-slate-700">{selectedCuenta.clave_bancaria || "-"}</p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-wider text-slate-500">Teléfono</p>
                    <p className="mt-2 text-sm text-slate-700">{selectedCuenta.telefono || "-"}</p>
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-wider text-slate-500">Dirección</p>
                    <p className="mt-2 text-sm text-slate-700">{selectedCuenta.direccion}</p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-wider text-slate-500">Referencia</p>
                    <p className="mt-2 text-sm text-slate-700">{selectedCuenta.referencia || "Sin referencia"}</p>
                  </div>
                  <div className="flex flex-col gap-3 sm:justify-end">
                    <button
                      type="button"
                      onClick={() => setSelectedCuenta(null)}
                      className="w-full rounded-3xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
                    >
                      Cerrar
                    </button>

                    {canManageAccounts && (
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCuenta(null);
                            openEditModal(selectedCuenta);
                          }}
                          className="w-full sm:flex-1 rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-700"
                        >
                          Editar cuenta
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCuenta(null);
                            setAccountToDelete(selectedCuenta);
                            setDeleteModalOpen(true);
                          }}
                          className="w-full sm:flex-1 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                        >
                          Eliminar cuenta
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <section className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm">
          <div className="space-y-4">
            {loading ? (
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-center text-slate-500">Cargando cuentas...</div>
            ) : filteredCuentas.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-center text-slate-500">No hay cuentas que coincidan con los filtros.</div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {cuentasPage.map((cuenta) => (
                  <div
                    key={cuenta.id}
                    className={`group w-full min-w-0 rounded-3xl border p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${getBankCardStyle(cuenta.banco)}`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedCuenta(cuenta)}
                      className="w-full text-left"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3 min-w-0">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Proveedor</p>
                          <p className="mt-2 text-base font-semibold text-slate-900 wrap-break-word">{cuenta.proveedor}</p>
                        </div>
                        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getBankStyle(cuenta.banco)}`}>
                          {cuenta.banco || "Otro"}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="min-w-0">
                          <p className="text-xs uppercase tracking-wider text-slate-500">Giro</p>
                          <p className="mt-1 text-sm text-slate-700 wrap-break-word">{cuenta.giro}</p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs uppercase tracking-wider text-slate-500">Estado</p>
                          <span className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${cuenta.activo ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"}`}>
                            {cuenta.activo ? "Activo" : "Inactivo"}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="min-w-0">
                          <p className="text-xs uppercase tracking-wider text-slate-500">Cuenta / CIE</p>
                          <p className="mt-1 text-sm font-mono text-slate-700 wrap-break-word">{cuenta.cuenta_cie ?? "-"}</p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs uppercase tracking-wider text-slate-500">Beneficiario</p>
                          <p className="mt-1 text-sm text-slate-700 wrap-break-word">{cuenta.beneficiario ?? "-"}</p>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="min-w-0">
                          <p className="text-xs uppercase tracking-wider text-slate-500">Teléfono</p>
                          <p className="mt-1 text-sm text-slate-700 wrap-break-word">{cuenta.telefono || "-"}</p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs uppercase tracking-wider text-slate-500">Dirección</p>
                          <p className="mt-1 text-sm text-slate-700 wrap-break-word">{cuenta.direccion}</p>
                        </div>
                      </div>
                    </button>

                    {canManageAccounts && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(cuenta)}
                          className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAccountToDelete(cuenta);
                            setDeleteModalOpen(true);
                          }}
                          className="rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                        >
                          Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {!loading && filteredCuentas.length > 0 && (
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">Mostrando {cuentasPage.length} de {filteredCuentas.length} cuentas</p>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
                  disabled={currentPage === 1}
                  className="inline-flex h-9 items-center justify-center rounded-full bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                >
                  Anterior
                </button>
                <span className="text-sm text-slate-600">Página {currentPage} de {totalPages}</span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="inline-flex h-9 items-center justify-center rounded-full bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </section>

        {deleteModalOpen && accountToDelete && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/40 px-4 py-6 backdrop-blur-sm">
            <div className="mx-auto mt-20 w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">Confirmar eliminación</h2>
              <p className="mt-3 text-sm text-slate-600">
                ¿Deseas eliminar la cuenta de <span className="font-semibold text-slate-900">{accountToDelete.proveedor}</span>? Esta acción no se puede deshacer.
              </p>

              {error && (
                <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              )}

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setDeleteModalOpen(false);
                    setAccountToDelete(null);
                    setError(null);
                  }}
                  className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleDeleteCuenta}
                  disabled={saving}
                  className="inline-flex items-center justify-center rounded-full bg-rose-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
                >
                  {saving ? "Eliminando..." : "Sí, eliminar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {modalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/40 px-4 py-6 backdrop-blur-sm">
            <div className="mx-auto mt-10 w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-200 sm:p-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">{modalMode === "edit" ? "Editar cuenta" : "Registrar nueva cuenta"}</h2>
                  <p className="mt-2 text-sm text-slate-500">Completa los datos para guardar esta cuenta en la base de datos.</p>
                </div>
                <button
                  type="button"
                  onClick={resetModal}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSaveCuenta} className="mt-6 grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Proveedor</span>
                  <input
                    type="text"
                    value={form.proveedor}
                    onChange={(e) => updateField("proveedor", e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-500 focus:bg-white"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Giro</span>
                  <input
                    type="text"
                    value={form.giro}
                    onChange={(e) => updateField("giro", e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-500 focus:bg-white"
                  />
                </label>

                <label className="block sm:col-span-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Dirección</span>
                  <input
                    type="text"
                    value={form.direccion}
                    onChange={(e) => updateField("direccion", e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-500 focus:bg-white"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Teléfono</span>
                  <input
                    type="tel"
                    value={form.telefono}
                    onChange={(e) => updateField("telefono", e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-500 focus:bg-white"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Banco</span>
                  <select
                    value={form.banco}
                    onChange={(e) => updateField("banco", e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-500 focus:bg-white"
                  >
                    {bankOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Referencia</span>
                  <input
                    type="text"
                    value={form.referencia}
                    onChange={(e) => updateField("referencia", e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-500 focus:bg-white"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Cuenta / CIE</span>
                  <input
                    type="text"
                    value={form.cuenta_cie}
                    onChange={(e) => updateField("cuenta_cie", e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-500 focus:bg-white"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Clave bancaria</span>
                  <input
                    type="text"
                    value={form.clave_bancaria}
                    onChange={(e) => updateField("clave_bancaria", e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-500 focus:bg-white"
                  />
                </label>

                <label className="block sm:col-span-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Beneficiario</span>
                  <input
                    type="text"
                    value={form.beneficiario}
                    onChange={(e) => updateField("beneficiario", e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-500 focus:bg-white"
                  />
                </label>

                {error && (
                  <div className="sm:col-span-2 rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {error}
                  </div>
                )}

                <div className="sm:col-span-2 flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={resetModal}
                    className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center justify-center rounded-full bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
                  >
                    {saving ? "Guardando..." : modalMode === "edit" ? "Guardar cambios" : "Guardar cuenta"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

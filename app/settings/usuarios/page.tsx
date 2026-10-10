"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import Image from "next/image";
import {
  actualizarJerarquiaAction,
  crearAdministradorDirectoAction,
  crearUsuarioDirectoAction,
  enviarInvitacionAction,
  getUsuariosAction,
  type Perfil,
} from "@/components/actions/usuarios.actions";
import { getEmployeeSession } from "@/lib/employeeSession";

type Rol = Perfil["rol"];
type CampoEditable = "nombre" | "rol" | "cargo" | "telefono" | "nivel_jerarquia";
type Modal = "usuario" | "administrador" | null;

const inputClass =
  "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10 disabled:cursor-not-allowed disabled:bg-slate-100";
const labelClass = "block text-sm font-medium text-slate-700";
const primaryButtonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-700/20 disabled:cursor-not-allowed disabled:opacity-60";

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-MX")
    .trim();
}

function roleStyle(role: Rol) {
  if (role === "Administrador") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }
  if (role === "Encargado") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-3xl border border-emerald-950/5 bg-white p-5 shadow-sm sm:p-6 ${className}`}
    >
      {children}
    </section>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className={labelClass}>
      {label}
      {children}
    </label>
  );
}

function ModalShell({
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
        aria-labelledby="user-modal-title"
        className="max-h-[95dvh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-7"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 id="user-modal-title" className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
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

export default function UsuariosPage() {
  const [session] = useState(() => getEmployeeSession());
  const unauthorized = !session || session.nivel_jerarquia !== 1;
  const [usuarios, setUsuarios] = useState<Perfil[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const [guardandoUsuarioId, setGuardandoUsuarioId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [modal, setModal] = useState<Modal>(null);
  const [showInvitaciones, setShowInvitaciones] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [busquedaProduccion, setBusquedaProduccion] = useState("");
  const [enviandoInvitacion, setEnviandoInvitacion] = useState(false);
  const [creandoUsuario, setCreandoUsuario] = useState(false);

  const [formInvitacion, setFormInvitacion] = useState({
    email: "",
    numero_empleado: "",
    cargo: "Almacén",
    telefono: "",
    nivel_jerarquia: 3,
    rol: "Operador" as Rol,
  });
  const [formAdmin, setFormAdmin] = useState({
    email: "",
    nombre: "",
    numero_empleado: "",
    cargo: "Dirección",
    telefono: "",
    nivel_jerarquia: 1,
  });
  const [formNuevo, setFormNuevo] = useState({
    email: "",
    nombre: "",
    numero_empleado: "",
    cargo: "Almacén",
    telefono: "",
    nivel_jerarquia: 3,
    rol: "Operador" as Rol,
  });

  const loadUsuarios = async () => {
    setLoading(true);
    setErrorCarga("");
    try {
      const data = await getUsuariosAction();
      setUsuarios(data);
    } catch (error) {
      console.error("No se pudieron cargar los perfiles desde Supabase:", error);
      setErrorCarga(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar los perfiles desde la base de datos."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (unauthorized) return;

    let active = true;
    getUsuariosAction()
      .then((data) => {
        if (active) {
          setUsuarios(data);
          setErrorCarga("");
        }
      })
      .catch((error: unknown) => {
        if (!active) return;
        console.error("No se pudieron cargar los perfiles desde Supabase:", error);
        setErrorCarga(
          error instanceof Error
            ? error.message
            : "No se pudieron cargar los perfiles desde la base de datos."
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [unauthorized]);

  const usuariosFiltrados = useMemo(() => {
    const query = normalize(busqueda);
    if (!query) return usuarios;
    return usuarios.filter((user) =>
      [
        user.nombre,
        user.numero_empleado,
        user.telefono,
        user.cargo,
        user.rol,
      ].some((value) => normalize(value || "").includes(query))
    );
  }, [busqueda, usuarios]);

  const usuariosProduccion = useMemo(() => {
    const query = normalize(busquedaProduccion);
    return usuarios
      .filter((user) => normalize(user.cargo || "").includes("produccion"))
      .filter((user) => {
        if (!query) return true;
        const employeeNumber = user.numero_empleado || "";
        return (
          normalize(user.nombre || "").includes(query) ||
          normalize(employeeNumber).includes(query) ||
          employeeNumber.replace(/\D/g, "").slice(-6).includes(query.replace(/\D/g, ""))
        );
      })
      .sort((first, second) =>
        String(first.nombre || "").localeCompare(String(second.nombre || ""), "es")
      );
  }, [busquedaProduccion, usuarios]);

  const administradores = usuarios.filter((user) => user.rol === "Administrador").length;
  const encargados = usuarios.filter((user) => user.rol === "Encargado").length;

  const handleGuardarCambiosLinea = async <Campo extends CampoEditable>(
    id: string,
    campo: Campo,
    valor: Perfil[Campo]
  ) => {
    const usuarioActual = usuarios.find((user) => user.id === id);
    if (!usuarioActual || guardandoUsuarioId) return;
    if (Object.is(usuarioActual[campo], valor)) return;
    if (campo === "nombre" && typeof valor === "string" && !valor.trim()) {
      setFeedback({ kind: "error", text: "El nombre del usuario no puede quedar vacío." });
      await loadUsuarios();
      return;
    }

    const valorGuardado =
      campo === "nombre" && typeof valor === "string"
        ? valor.trim()
        : valor;
    const usuarioActualizado = { ...usuarioActual, [campo]: valorGuardado };
    try {
      setGuardandoUsuarioId(id);
      setFeedback(null);
      await actualizarJerarquiaAction(id, {
        nombre: usuarioActualizado.nombre || "",
        rol: usuarioActualizado.rol,
        cargo: usuarioActualizado.cargo || "",
        telefono: usuarioActualizado.telefono || "",
        nivel_jerarquia: usuarioActualizado.nivel_jerarquia,
      });
      setUsuarios((current) =>
        current.map((user) => (user.id === id ? usuarioActualizado : user))
      );
      setFeedback({
        kind: "success",
        text: `Se guardaron los cambios de ${usuarioActual.nombre || "este usuario"}.`,
      });
    } catch (error) {
      console.error("No se pudieron guardar los cambios del perfil:", error);
      setFeedback({
        kind: "error",
        text:
          error instanceof Error
            ? error.message
            : "No se pudieron guardar los cambios en la base de datos.",
      });
      await loadUsuarios();
    } finally {
      setGuardandoUsuarioId(null);
    }
  };

  const handleEnviarInvitacion = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEnviandoInvitacion(true);
    setFeedback(null);
    try {
      await enviarInvitacionAction(formInvitacion);
      setFeedback({
        kind: "success",
        text: `La invitación para ${formInvitacion.email} quedó registrada.`,
      });
      setFormInvitacion({
        email: "",
        numero_empleado: "",
        cargo: "Almacén",
        telefono: "",
        nivel_jerarquia: 3,
        rol: "Operador",
      });
    } catch (error) {
      setFeedback({
        kind: "error",
        text: error instanceof Error ? error.message : "No se pudo registrar la invitación.",
      });
    } finally {
      setEnviandoInvitacion(false);
    }
  };

  const handleCrearAdminDirecto = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreandoUsuario(true);
    setFeedback(null);
    try {
      await crearAdministradorDirectoAction(formAdmin);
      setFeedback({
        kind: "success",
        text: `La cuenta de administrador para ${formAdmin.nombre} fue creada.`,
      });
      setFormAdmin({
        email: "",
        nombre: "",
        numero_empleado: "",
        cargo: "Dirección",
        telefono: "",
        nivel_jerarquia: 1,
      });
      setModal(null);
      await loadUsuarios();
    } catch (error) {
      setFeedback({
        kind: "error",
        text: error instanceof Error ? error.message : "No se pudo crear el administrador.",
      });
    } finally {
      setCreandoUsuario(false);
    }
  };

  const handleCrearUsuarioDirecto = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreandoUsuario(true);
    setFeedback(null);
    try {
      await crearUsuarioDirectoAction(formNuevo);
      setFeedback({
        kind: "success",
        text: `La cuenta de ${formNuevo.nombre || formNuevo.email} fue creada.`,
      });
      setFormNuevo({
        email: "",
        nombre: "",
        numero_empleado: "",
        cargo: "Almacén",
        telefono: "",
        nivel_jerarquia: 3,
        rol: "Operador",
      });
      setModal(null);
      await loadUsuarios();
    } catch (error) {
      setFeedback({
        kind: "error",
        text: error instanceof Error ? error.message : "No se pudo crear el usuario.",
      });
    } finally {
      setCreandoUsuario(false);
    }
  };

  if (unauthorized) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-slate-50 p-4 sm:p-8">
        <div className="mx-auto mt-10 max-w-xl rounded-3xl border border-rose-200 bg-white p-6 text-center shadow-sm sm:p-9">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-2xl text-rose-700">
            !
          </span>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">Acceso restringido</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Esta sección está disponible únicamente para usuarios con nivel jerárquico 1.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50/70 via-slate-50 to-amber-50/50 px-4 py-6 sm:px-6 sm:py-9 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-5 sm:space-y-7">
        <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950 via-emerald-900 to-green-800 p-5 text-white shadow-lg sm:p-8">
          <div className="absolute -right-10 -top-20 h-64 w-64 rounded-full border border-white/10" />
          <div className="absolute -right-2 -top-12 h-48 w-48 rounded-full border border-amber-300/15" />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Image
                src="/logo-mlopez.png"
                alt="Logotipo de M. López"
                width={64}
                height={64}
                className="h-14 w-14 shrink-0 rounded-2xl bg-white object-contain p-1 sm:h-16 sm:w-16"
              />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">
                  Administración
                </p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                  Equipo y accesos
                </h1>
                <p className="mt-1 max-w-xl text-sm text-emerald-100">
                  Administra perfiles, permisos e invitaciones del personal.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setFeedback(null);
                  setModal("administrador");
                }}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/20 sm:px-4"
              >
                + Administrador
              </button>
              <button
                type="button"
                onClick={() => {
                  setFeedback(null);
                  setModal("usuario");
                }}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-amber-400 px-3 py-2 text-sm font-bold text-emerald-950 shadow-sm transition hover:bg-amber-300 sm:px-4"
              >
                + Nuevo usuario
              </button>
            </div>
          </div>
        </header>

        {feedback && (
          <div
            role={feedback.kind === "error" ? "alert" : "status"}
            className={`flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-sm ${
              feedback.kind === "error"
                ? "border-rose-200 bg-rose-50 text-rose-800"
                : "border-emerald-200 bg-emerald-50 text-emerald-900"
            }`}
          >
            <p>{feedback.text}</p>
            <button
              type="button"
              aria-label="Cerrar mensaje"
              onClick={() => setFeedback(null)}
              className="shrink-0 rounded-lg px-2 text-lg leading-5 opacity-70 hover:opacity-100"
            >
              ×
            </button>
          </div>
        )}

        {errorCarga && (
          <div
            role="alert"
            className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-white p-4 text-sm text-rose-800 sm:flex-row sm:items-center sm:justify-between"
          >
            <p>{errorCarga}</p>
            <button
              type="button"
              onClick={() => void loadUsuarios()}
              disabled={loading}
              className="min-h-10 shrink-0 rounded-xl border border-rose-200 px-4 font-semibold transition hover:bg-rose-50 disabled:opacity-60"
            >
              {loading ? "Conectando..." : "Reintentar conexión"}
            </button>
          </div>
        )}

        <section aria-label="Resumen del equipo" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "Personal activo", value: loading ? "…" : usuarios.length, icon: "👥", tone: "text-emerald-800 bg-emerald-100" },
            { label: "Administradores", value: loading ? "…" : administradores, icon: "🛡️", tone: "text-emerald-800 bg-emerald-100" },
            { label: "Encargados", value: loading ? "…" : encargados, icon: "⭐", tone: "text-amber-800 bg-amber-100" },
            { label: "Conexión", value: loading ? "Revisando" : errorCarga ? "Con error" : "Activa", icon: loading ? "↻" : errorCarga ? "!" : "✓", tone: errorCarga ? "text-rose-800 bg-rose-100" : "text-emerald-800 bg-emerald-100" },
          ].map((stat) => (
            <div key={stat.label} className="flex min-w-0 items-center gap-3 rounded-2xl border border-white bg-white p-4 shadow-sm sm:p-5">
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg ${stat.tone}`}>
                {stat.icon}
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-slate-500 sm:text-sm">{stat.label}</p>
                <p className="mt-0.5 truncate text-xl font-bold text-slate-900 sm:text-2xl">{stat.value}</p>
              </div>
            </div>
          ))}
        </section>

        <Panel>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Directorio</p>
              <h2 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">Personal activo</h2>
              <p className="mt-1 text-sm text-slate-500">
                Busca personas y actualiza su puesto, jerarquía o permisos.
              </p>
            </div>
            <label className="w-full sm:max-w-sm">
              <span className="sr-only">Buscar en el personal activo</span>
              <span className="relative block">
                <span aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">⌕</span>
                <input
                  type="search"
                  value={busqueda}
                  onChange={(event) => setBusqueda(event.target.value)}
                  placeholder="Buscar nombre, empleado, área o rol"
                  className={`${inputClass} pl-10`}
                />
              </span>
            </label>
          </div>

          {loading ? (
            <div className="mt-5 space-y-3" aria-label="Cargando usuarios">
              {[1, 2, 3].map((item) => (
                <div key={item} className="h-16 animate-pulse rounded-2xl bg-slate-100" />
              ))}
            </div>
          ) : errorCarga ? (
            <div className="mt-5 rounded-2xl border border-dashed border-rose-200 bg-rose-50/70 px-4 py-10 text-center">
              <p className="font-semibold text-rose-800">No se pudo cargar el directorio</p>
              <p className="mt-1 text-sm text-rose-700">Revisa la conexión y vuelve a intentarlo.</p>
            </div>
          ) : usuariosFiltrados.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center">
              <p className="font-semibold text-slate-800">
                {usuarios.length ? "No encontramos coincidencias" : "Aún no hay perfiles registrados"}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {usuarios.length ? "Prueba con otro nombre, número o área." : "Crea un usuario o registra una invitación para comenzar."}
              </p>
            </div>
          ) : (
            <>
              <p className="mt-5 text-xs font-medium text-slate-500">
                {usuariosFiltrados.length} {usuariosFiltrados.length === 1 ? "persona" : "personas"}
                {busqueda ? " encontradas" : " en el directorio"}
              </p>

              <div className="mt-3 hidden overflow-x-auto rounded-2xl border border-slate-200 md:block">
                <table className="w-full min-w-[850px] text-left text-sm">
                  <thead className="bg-emerald-50/70 text-xs uppercase tracking-wide text-emerald-950/70">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Colaborador</th>
                      <th className="px-4 py-3 font-semibold">Teléfono</th>
                      <th className="px-4 py-3 font-semibold">Área / puesto</th>
                      <th className="px-4 py-3 font-semibold">Jerarquía</th>
                      <th className="px-4 py-3 font-semibold">Rol</th>
                      <th className="px-4 py-3 text-center font-semibold">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {usuariosFiltrados.map((user) => (
                      <tr key={user.id} className="transition hover:bg-emerald-50/30">
                        <td className="px-4 py-3">
                          <input
                            aria-label={`Nombre de ${user.numero_empleado || "usuario"}`}
                            type="text"
                            maxLength={150}
                            value={user.nombre || ""}
                            placeholder="Escribe el nombre"
                            disabled={guardandoUsuarioId !== null}
                            onChange={(event) =>
                              setUsuarios((current) =>
                                current.map((item) =>
                                  item.id === user.id ? { ...item, nombre: event.target.value } : item
                                )
                              )
                            }
                            onBlur={(event) =>
                              void handleGuardarCambiosLinea(user.id, "nombre", event.target.value)
                            }
                            className="w-full max-w-56 rounded-lg border border-transparent bg-transparent px-2 py-1.5 font-semibold text-slate-900 outline-none transition placeholder:font-normal placeholder:text-slate-400 hover:bg-white focus:border-emerald-300 focus:bg-white"
                          />
                          <p className="mt-0.5 font-mono text-xs text-slate-500">{user.numero_empleado || "Sin número de empleado"}</p>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            aria-label={`Teléfono de ${user.nombre || user.numero_empleado || "usuario"}`}
                            type="tel"
                            value={user.telefono || ""}
                            placeholder="Agregar teléfono"
                            disabled={guardandoUsuarioId !== null}
                            onChange={(event) =>
                              setUsuarios((current) =>
                                current.map((item) =>
                                  item.id === user.id ? { ...item, telefono: event.target.value } : item
                                )
                              )
                            }
                            onBlur={(event) =>
                              void handleGuardarCambiosLinea(user.id, "telefono", event.target.value)
                            }
                            className="w-36 rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-sm outline-none transition hover:bg-white focus:border-emerald-300 focus:bg-white"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <select
                            aria-label={`Área de ${user.nombre || user.numero_empleado || "usuario"}`}
                            value={user.cargo || "Almacén"}
                            disabled={guardandoUsuarioId !== null}
                            onChange={(event) => void handleGuardarCambiosLinea(user.id, "cargo", event.target.value)}
                            className="max-w-40 rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-sm outline-none transition hover:bg-white focus:border-emerald-300 focus:bg-white disabled:opacity-60"
                          >
                            <option value="Dirección">Dirección</option>
                            <option value="Almacén">Almacén</option>
                            <option value="Recibo">Recibo</option>
                            <option value="Cuarto Frío">Cuarto Frío</option>
                            <option value="Calidad">Calidad</option>
                            <option value="Produccion">Producción</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            aria-label={`Jerarquía de ${user.nombre || user.numero_empleado || "usuario"}`}
                            value={user.nivel_jerarquia}
                            disabled={guardandoUsuarioId !== null}
                            onChange={(event) => void handleGuardarCambiosLinea(user.id, "nivel_jerarquia", Number(event.target.value))}
                            className="rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-sm outline-none transition hover:bg-white focus:border-emerald-300 focus:bg-white disabled:opacity-60"
                          >
                            <option value={1}>1 · Dirección</option>
                            <option value={2}>2 · Gerencia</option>
                            <option value={3}>3 · Operación</option>
                            <option value={4}>4 · Personal</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            aria-label={`Rol de ${user.nombre || user.numero_empleado || "usuario"}`}
                            value={user.rol}
                            disabled={guardandoUsuarioId !== null}
                            onChange={(event) => void handleGuardarCambiosLinea(user.id, "rol", event.target.value as Rol)}
                            className={`rounded-full border px-3 py-1.5 text-xs font-semibold outline-none disabled:opacity-60 ${roleStyle(user.rol)}`}
                          >
                            <option value="Operador">Operador</option>
                            <option value="Encargado">Encargado</option>
                            <option value="Administrador">Administrador</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-800">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            {guardandoUsuarioId === user.id ? "Guardando" : "Activo"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 space-y-3 md:hidden">
                {usuariosFiltrados.map((user) => (
                  <article key={user.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 font-bold text-emerald-900">
                          {(user.nombre || user.numero_empleado || "?").slice(0, 1).toLocaleUpperCase("es-MX")}
                        </span>
                        <div className="min-w-0">
                          <input
                            aria-label={`Nombre de ${user.numero_empleado || "usuario"}`}
                            type="text"
                            maxLength={150}
                            value={user.nombre || ""}
                            placeholder="Escribe el nombre"
                            disabled={guardandoUsuarioId !== null}
                            onChange={(event) =>
                              setUsuarios((current) =>
                                current.map((item) =>
                                  item.id === user.id ? { ...item, nombre: event.target.value } : item
                                )
                              )
                            }
                            onBlur={(event) =>
                              void handleGuardarCambiosLinea(user.id, "nombre", event.target.value)
                            }
                            className="w-full min-w-0 rounded-lg border border-transparent bg-transparent px-1 py-1 font-semibold text-slate-900 outline-none transition placeholder:font-normal placeholder:text-slate-400 hover:bg-white focus:border-emerald-300 focus:bg-white"
                          />
                          <p className="mt-0.5 truncate font-mono text-xs text-slate-500">{user.numero_empleado || "Sin número de empleado"}</p>
                        </div>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${roleStyle(user.rol)}`}>
                        {user.rol}
                      </span>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <FormField label="Teléfono">
                        <input
                          type="tel"
                          value={user.telefono || ""}
                          placeholder="Agregar teléfono"
                          disabled={guardandoUsuarioId !== null}
                          onChange={(event) =>
                            setUsuarios((current) =>
                              current.map((item) =>
                                item.id === user.id ? { ...item, telefono: event.target.value } : item
                              )
                            )
                          }
                          onBlur={(event) =>
                            void handleGuardarCambiosLinea(user.id, "telefono", event.target.value)
                          }
                          className={inputClass}
                        />
                      </FormField>
                      <FormField label="Área / puesto">
                        <select
                          value={user.cargo || "Almacén"}
                          disabled={guardandoUsuarioId !== null}
                          onChange={(event) => void handleGuardarCambiosLinea(user.id, "cargo", event.target.value)}
                          className={inputClass}
                        >
                          <option value="Dirección">Dirección</option>
                          <option value="Almacén">Almacén</option>
                          <option value="Recibo">Recibo</option>
                          <option value="Cuarto Frío">Cuarto Frío</option>
                          <option value="Calidad">Calidad</option>
                          <option value="Produccion">Producción</option>
                        </select>
                      </FormField>
                      <FormField label="Jerarquía">
                        <select
                          value={user.nivel_jerarquia}
                          disabled={guardandoUsuarioId !== null}
                          onChange={(event) => void handleGuardarCambiosLinea(user.id, "nivel_jerarquia", Number(event.target.value))}
                          className={inputClass}
                        >
                          <option value={1}>1 · Dirección</option>
                          <option value={2}>2 · Gerencia</option>
                          <option value={3}>3 · Operación</option>
                          <option value={4}>4 · Personal</option>
                        </select>
                      </FormField>
                      <FormField label="Rol del sistema">
                        <select
                          value={user.rol}
                          disabled={guardandoUsuarioId !== null}
                          onChange={(event) => void handleGuardarCambiosLinea(user.id, "rol", event.target.value as Rol)}
                          className={inputClass}
                        >
                          <option value="Operador">Operador</option>
                          <option value="Encargado">Encargado</option>
                          <option value="Administrador">Administrador</option>
                        </select>
                      </FormField>
                    </div>
                    {guardandoUsuarioId === user.id && (
                      <p className="mt-3 text-xs font-medium text-emerald-800" role="status">Guardando cambios…</p>
                    )}
                  </article>
                ))}
              </div>
            </>
          )}
        </Panel>

        <Panel>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">Área de producción</p>
              <h2 className="mt-1 text-xl font-bold text-slate-900">Personal de producción</h2>
              <p className="mt-1 text-sm text-slate-500">Consulta rápidamente el personal asignado a esta área.</p>
            </div>
            <label className="w-full sm:max-w-xs">
              <span className="sr-only">Buscar personal de producción</span>
              <input
                type="search"
                value={busquedaProduccion}
                onChange={(event) => setBusquedaProduccion(event.target.value)}
                placeholder="Nombre o número de empleado"
                className={inputClass}
              />
            </label>
          </div>
          {loading ? (
            <div className="mt-4 h-20 animate-pulse rounded-2xl bg-slate-100" />
          ) : errorCarga ? (
            <p className="mt-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">No se pudo consultar esta lista.</p>
          ) : usuariosProduccion.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-500">
              {busquedaProduccion ? "No hay coincidencias en producción." : "Todavía no hay personal registrado en producción."}
            </p>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {usuariosProduccion.map((user) => (
                <article key={user.id} className="flex min-w-0 items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white font-bold text-emerald-900 shadow-sm">
                    {(user.nombre || "?").slice(0, 1).toLocaleUpperCase("es-MX")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-900">{user.nombre || "Sin nombre"}</p>
                    <p className="mt-0.5 truncate font-mono text-xs text-slate-500">{user.numero_empleado || "Sin número"}</p>
                  </div>
                  <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold ${roleStyle(user.rol)}`}>
                    {user.rol}
                  </span>
                </article>
              ))}
            </div>
          )}
        </Panel>

        <Panel>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Incorporación</p>
              <h2 className="mt-1 text-xl font-bold text-slate-900">Invitar personal</h2>
              <p className="mt-1 text-sm text-slate-500">
                Registra una invitación para que el colaborador complete sus credenciales.
              </p>
            </div>
            <button
              type="button"
              aria-expanded={showInvitaciones}
              onClick={() => setShowInvitaciones((visible) => !visible)}
              className="min-h-10 self-start rounded-xl border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-50 sm:self-auto"
            >
              {showInvitaciones ? "Ocultar formulario" : "Mostrar formulario"}
            </button>
          </div>

          {showInvitaciones && (
            <form onSubmit={handleEnviarInvitacion} className="mt-5 border-t border-slate-100 pt-5">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <FormField label="Número de empleado">
                  <input
                    type="text"
                    required
                    autoComplete="off"
                    placeholder="Ej. EMP-88"
                    value={formInvitacion.numero_empleado}
                    onChange={(event) => setFormInvitacion({ ...formInvitacion, numero_empleado: event.target.value })}
                    className={inputClass}
                  />
                </FormField>
                <FormField label="Correo electrónico">
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="persona@empresa.com"
                    value={formInvitacion.email}
                    onChange={(event) => setFormInvitacion({ ...formInvitacion, email: event.target.value })}
                    className={inputClass}
                  />
                </FormField>
                <FormField label="Teléfono">
                  <input
                    type="tel"
                    autoComplete="tel"
                    placeholder="311 123 4567"
                    value={formInvitacion.telefono}
                    onChange={(event) => setFormInvitacion({ ...formInvitacion, telefono: event.target.value })}
                    className={inputClass}
                  />
                </FormField>
                <FormField label="Área / puesto">
                  <select
                    value={formInvitacion.cargo}
                    onChange={(event) => setFormInvitacion({ ...formInvitacion, cargo: event.target.value })}
                    className={inputClass}
                  >
                    <option value="Almacén">Almacén</option>
                    <option value="Recibo">Recibo</option>
                    <option value="Cuarto Frío">Cuarto Frío</option>
                    <option value="Calidad">Calidad</option>
                    <option value="Produccion">Producción</option>
                  </select>
                </FormField>
                <FormField label="Jerarquía">
                  <select
                    value={formInvitacion.nivel_jerarquia}
                    onChange={(event) => setFormInvitacion({ ...formInvitacion, nivel_jerarquia: Number(event.target.value) })}
                    className={inputClass}
                  >
                    <option value={2}>Nivel 2 · Encargado</option>
                    <option value={3}>Nivel 3 · Operador</option>
                  </select>
                </FormField>
                <FormField label="Rol asignado">
                  <select
                    value={formInvitacion.rol}
                    onChange={(event) => setFormInvitacion({ ...formInvitacion, rol: event.target.value as Rol })}
                    className={inputClass}
                  >
                    <option value="Operador">Operador</option>
                    <option value="Encargado">Encargado</option>
                  </select>
                </FormField>
              </div>
              <div className="mt-5 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs leading-5 text-slate-500">
                  La invitación se registra en el sistema con el correo y número indicados.
                </p>
                <button type="submit" disabled={enviandoInvitacion} className={`${primaryButtonClass} w-full sm:w-auto`}>
                  {enviandoInvitacion ? "Registrando…" : "Registrar invitación"}
                </button>
              </div>
            </form>
          )}
        </Panel>
      </div>

      {modal === "administrador" && (
        <ModalShell
          title="Crear administrador"
          description="La cuenta quedará activa con permisos administrativos."
          onClose={() => {
            if (!creandoUsuario) setModal(null);
          }}
        >
          {feedback?.kind === "error" ? (
            <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {feedback.text}
            </div>
          ) : null}
          <form onSubmit={handleCrearAdminDirecto} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Nombre completo">
                <input
                  type="text"
                  required
                  autoComplete="name"
                  placeholder="Nombre y apellidos"
                  value={formAdmin.nombre}
                  onChange={(event) => setFormAdmin({ ...formAdmin, nombre: event.target.value })}
                  className={inputClass}
                />
              </FormField>
              <FormField label="Número de empleado">
                <input
                  type="text"
                  required
                  placeholder="ADM-01"
                  value={formAdmin.numero_empleado}
                  onChange={(event) => setFormAdmin({ ...formAdmin, numero_empleado: event.target.value })}
                  className={inputClass}
                />
              </FormField>
              <FormField label="Correo de acceso">
                <input
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="persona@empresa.com"
                  value={formAdmin.email}
                  onChange={(event) => setFormAdmin({ ...formAdmin, email: event.target.value })}
                  className={inputClass}
                />
              </FormField>
              <FormField label="Teléfono">
                <input
                  type="tel"
                  autoComplete="tel"
                  placeholder="311 123 4567"
                  value={formAdmin.telefono}
                  onChange={(event) => setFormAdmin({ ...formAdmin, telefono: event.target.value })}
                  className={inputClass}
                />
              </FormField>
              <FormField label="Área / puesto">
                <select
                  value={formAdmin.cargo}
                  onChange={(event) => setFormAdmin({ ...formAdmin, cargo: event.target.value })}
                  className={inputClass}
                >
                  <option value="Dirección">Dirección</option>
                  <option value="Almacén">Almacén</option>
                  <option value="Recibo">Recibo</option>
                  <option value="Cuarto Frío">Cuarto Frío</option>
                  <option value="Produccion">Producción</option>
                  <option value="Calidad">Calidad</option>
                </select>
              </FormField>
              <FormField label="Jerarquía">
                <select
                  value={formAdmin.nivel_jerarquia}
                  onChange={(event) => setFormAdmin({ ...formAdmin, nivel_jerarquia: Number(event.target.value) })}
                  className={inputClass}
                >
                  <option value={1}>Nivel 1 · Dirección</option>
                  <option value={2}>Nivel 2 · Gerencia</option>
                  <option value={3}>Nivel 3 · Operación</option>
                  <option value={4}>Nivel 4 · Personal</option>
                </select>
              </FormField>
            </div>
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs leading-5 text-amber-900">
              La cuenta se crea de inmediato. Comparte las instrucciones de acceso con la persona por un canal seguro.
            </p>
            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={creandoUsuario}
                onClick={() => setModal(null)}
                className="min-h-11 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                Cancelar
              </button>
              <button type="submit" disabled={creandoUsuario} className={primaryButtonClass}>
                {creandoUsuario ? "Creando cuenta…" : "Crear administrador"}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {modal === "usuario" && (
        <ModalShell
          title="Crear usuario"
          description="Agrega el perfil y activa el acceso al sistema."
          onClose={() => {
            if (!creandoUsuario) setModal(null);
          }}
        >
          {feedback?.kind === "error" ? (
            <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {feedback.text}
            </div>
          ) : null}
          <form onSubmit={handleCrearUsuarioDirecto} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Nombre completo">
                <input
                  type="text"
                  required
                  autoComplete="name"
                  placeholder="Nombre y apellidos"
                  value={formNuevo.nombre}
                  onChange={(event) => setFormNuevo({ ...formNuevo, nombre: event.target.value })}
                  className={inputClass}
                />
              </FormField>
              <FormField label="Número de empleado">
                <input
                  type="text"
                  required
                  placeholder="EMP-01"
                  value={formNuevo.numero_empleado}
                  onChange={(event) => setFormNuevo({ ...formNuevo, numero_empleado: event.target.value })}
                  className={inputClass}
                />
              </FormField>
              <FormField label="Correo de acceso">
                <input
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="persona@empresa.com"
                  value={formNuevo.email}
                  onChange={(event) => setFormNuevo({ ...formNuevo, email: event.target.value })}
                  className={inputClass}
                />
              </FormField>
              <FormField label="Teléfono">
                <input
                  type="tel"
                  autoComplete="tel"
                  placeholder="311 123 4567"
                  value={formNuevo.telefono}
                  onChange={(event) => setFormNuevo({ ...formNuevo, telefono: event.target.value })}
                  className={inputClass}
                />
              </FormField>
              <FormField label="Área / puesto">
                <input
                  type="text"
                  value={formNuevo.cargo}
                  onChange={(event) => setFormNuevo({ ...formNuevo, cargo: event.target.value })}
                  className={inputClass}
                />
              </FormField>
              <FormField label="Jerarquía">
                <select
                  value={formNuevo.nivel_jerarquia}
                  onChange={(event) => setFormNuevo({ ...formNuevo, nivel_jerarquia: Number(event.target.value) })}
                  className={inputClass}
                >
                  <option value={1}>Nivel 1 · Dirección</option>
                  <option value={2}>Nivel 2 · Gerencia</option>
                  <option value={3}>Nivel 3 · Operación</option>
                </select>
              </FormField>
              <FormField label="Rol del sistema">
                <select
                  value={formNuevo.rol}
                  onChange={(event) => setFormNuevo({ ...formNuevo, rol: event.target.value as Rol })}
                  className={inputClass}
                >
                  <option value="Operador">Operador</option>
                  <option value="Encargado">Encargado</option>
                  <option value="Administrador">Administrador</option>
                </select>
              </FormField>
            </div>
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs leading-5 text-amber-900">
              La cuenta se crea de inmediato. Comparte las instrucciones de acceso con la persona por un canal seguro.
            </p>
            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={creandoUsuario}
                onClick={() => setModal(null)}
                className="min-h-11 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                Cancelar
              </button>
              <button type="submit" disabled={creandoUsuario} className={primaryButtonClass}>
                {creandoUsuario ? "Creando cuenta…" : "Crear usuario"}
              </button>
            </div>
          </form>
        </ModalShell>
      )}
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getEmployeeSession } from "@/lib/employeeSession";
import { 
  getUsuariosAction, 
  actualizarJerarquiaAction, 
  enviarInvitacionAction, 
  crearAdministradorDirectoAction,
  crearUsuarioDirectoAction,
  type Perfil 
} from "@/components/actions/usuarios.actions";

export default function UsuariosPage() {
  const router = useRouter();
  const [session, setSession] = useState(() => getEmployeeSession());
  const [unauthorized, setUnauthorized] = useState(false);
  const [usuarios, setUsuarios] = useState<Perfil[]>([]);
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState("");
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [showInvitaciones, setShowInvitaciones] = useState(true);
  const [nuevoModalOpen, setNuevoModalOpen] = useState(false);

  const [formInvitacion, setFormInvitacion] = useState({
    email: "",
    numero_empleado: "",
    cargo: "Almacén",
    telefono: "",
    nivel_jerarquia: 3,
    rol: "Operador" as Perfil["rol"]
  });

  const [formAdmin, setFormAdmin] = useState({
    email: "",
    nombre: "",
    numero_empleado: "",
    cargo: "Dirección",
    telefono: "",
    nivel_jerarquia: 1
  });

  const [formNuevo, setFormNuevo] = useState({
    email: "",
    nombre: "",
    numero_empleado: "",
    cargo: "Almacén",
    telefono: "",
    nivel_jerarquia: 3,
    rol: "Operador" as Perfil["rol"]
  });

  const [busquedaProduccion, setBusquedaProduccion] = useState("");

  const isProduccionUser = (user: Perfil) => {
    const cargo = (user.cargo || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return cargo.includes("produccion") || cargo.includes("produccion");
  };

  const usuariosProduccion = usuarios
    .filter(isProduccionUser)
    .filter((user) => {
      const query = busquedaProduccion.trim().toLowerCase();
      if (!query) return true;

      const nombre = (user.nombre || "").toLowerCase();
      const numero = (user.numero_empleado || "").toLowerCase();
      const ultimos = (user.numero_empleado || "").replace(/\D/g, "").slice(-6);

      return nombre.includes(query) || numero.includes(query) || ultimos.includes(query.replace(/\D/g, ""));
    })
    .sort((a, b) => String(a.nombre || "").localeCompare(String(b.nombre || "")));

  async function loadUsuarios() {
    try {
      const data = await getUsuariosAction();
      setUsuarios(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!session || session.nivel_jerarquia !== 1) {
      setUnauthorized(true);
      setLoading(false);
      return;
    }

    loadUsuarios();
  }, [session]);

  const handleGuardarCambiosLinea = async (id: string, campo: keyof Perfil, valor: any) => {
    const usuarioActual = usuarios.find(u => u.id === id);
    if (!usuarioActual) return;

    const payload = {
      rol: usuarioActual.rol,
      cargo: usuarioActual.cargo || "",
      telefono: usuarioActual.telefono || "",
      nivel_jerarquia: usuarioActual.nivel_jerarquia,
      [campo]: valor
    };

    try {
      setUsuarios(usuarios.map(u => u.id === id ? { ...u, [campo]: valor } : u));
      await actualizarJerarquiaAction(id, payload);
    } catch (err) {
      alert("Error al actualizar datos.");
      loadUsuarios();
    }
  };

  const handleEnviarInvitacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formInvitacion.email.trim() || !formInvitacion.numero_empleado.trim()) return;

    try {
      await enviarInvitacionAction(formInvitacion);
      setMensaje(`✉️ Invitación listada con éxito para ${formInvitacion.email}`);
      setFormInvitacion({ email: "", numero_empleado: "", cargo: "Almacén", telefono: "", nivel_jerarquia: 3, rol: "Operador" });
      loadUsuarios();
    } catch (err: any) {
      setMensaje(err.message || "Error al invitar");
    }
  };

  const handleCrearAdminDirecto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAdmin.email.trim() || !formAdmin.nombre.trim()) return;

    try {
      await crearAdministradorDirectoAction(formAdmin);
      alert(`👑 Administrador ${formAdmin.nombre} registrado de forma directa en el sistema.`);
      setFormAdmin({ email: "", nombre: "", numero_empleado: "", cargo: "Dirección", telefono: "", nivel_jerarquia: 1 });
      setAdminModalOpen(false);
      loadUsuarios();
    } catch (err: any) {
      alert(err.message || "Error al registrar Administrador");
    }
  };

  const handleCrearUsuarioDirecto = async (e: React.FormEvent) => {
    e.preventDefault();
    // Nota: si el rol es Administrador también funciona con esta acción
    try {
      await crearUsuarioDirectoAction(formNuevo);
      alert(`Usuario ${formNuevo.nombre || formNuevo.email} creado correctamente.`);
      setFormNuevo({ email: "", nombre: "", numero_empleado: "", cargo: "Almacén", telefono: "", nivel_jerarquia: 3, rol: "Operador" });
      setNuevoModalOpen(false);
      loadUsuarios();
    } catch (err: any) {
      alert(err.message || "Error al crear usuario");
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {unauthorized ? (
        <div className="mt-12 max-w-3xl mx-auto rounded-3xl border border-rose-200 bg-rose-50 p-8 text-rose-700 shadow-sm">
          <h2 className="text-2xl font-semibold">Acceso denegado</h2>
          <p className="mt-3 text-slate-700 leading-7">Esta sección solo está disponible para usuarios con <strong>nivel jerárquico 1</strong>.</p>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-3 items-start">
          <section className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200 shadow-sm lg:col-span-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg sm:text-xl font-medium text-slate-800">Usuarios de Producción</h2>
                <p className="text-xs text-slate-500">Busca por nombre o por los últimos dígitos del empleado.</p>
              </div>
              <label className="w-full sm:max-w-xs">
                <span className="sr-only">Buscar usuario de producción</span>
                <input
                  type="search"
                  value={busquedaProduccion}
                  onChange={(e) => setBusquedaProduccion(e.target.value)}
                  placeholder="Buscar nombre o últimos dígitos..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700 outline-none transition focus:border-sky-500 focus:bg-white"
                />
              </label>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {usuariosProduccion.length === 0 ? (
                <div className="col-span-full rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                  No hay usuarios de producción registrados.
                </div>
              ) : (
                usuariosProduccion.map((user) => (
                  <div key={user.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 shadow-sm transition hover:border-sky-200 hover:bg-sky-50/40">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">{user.nombre || "Sin nombre"}</p>
                        <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-500">Producción</p>
                      </div>
                      <span className="rounded-full bg-sky-100 px-2 py-1 text-[10px] font-semibold text-sky-700">
                        {user.rol || "Operador"}
                      </span>
                    </div>

                    <div className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-slate-500">Últimos dígitos</p>
                      <p className="mt-1 font-mono text-sm font-bold text-slate-800">
                        {user.numero_empleado ? user.numero_empleado.replace(/\D/g, "").slice(-4) || "—" : "—"}
                      </p>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                      <span>Empleado</span>
                      <span className="font-mono text-slate-700">{user.numero_empleado || "Sin número"}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {showInvitaciones && (
            <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm lg:col-span-1 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-medium text-slate-800">Enviar Invitación</h2>
                  <p className="text-xs text-slate-500">Manda un correo para que el personal operativo/encargado cree sus propias credenciales.</p>
                </div>
                <div className="text-right">
                  <button type="button" onClick={() => setShowInvitaciones(false)} className="text-sm text-slate-500 hover:text-slate-700">Ocultar</button>
                </div>
              </div>
              <form onSubmit={handleEnviarInvitacion} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="text-xs font-medium text-slate-600">No. Empleado</span>
                  <input type="text" required placeholder="Ej. EMP-88" value={formInvitacion.numero_empleado} onChange={(e) => setFormInvitacion({...formInvitacion, numero_empleado: e.target.value})} className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-sky-500" />
                </label>

                <label className="block space-y-1">
                  <span className="text-xs font-medium text-slate-600">Teléfono</span>
                  <input type="tel" placeholder="3111234567" value={formInvitacion.telefono} onChange={(e) => setFormInvitacion({...formInvitacion, telefono: e.target.value})} className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-sky-500" />
                </label>
              </div>

              <label className="block space-y-1">
                <span className="text-xs font-medium text-slate-600">Correo Electrónico</span>
                <input type="email" required placeholder="staff@empresa.com" value={formInvitacion.email} onChange={(e) => setFormInvitacion({...formInvitacion, email: e.target.value})} className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-sky-500" />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="text-xs font-medium text-slate-600">Área / Categoría</span>
                  <select value={formInvitacion.cargo} onChange={(e) => setFormInvitacion({...formInvitacion, cargo: e.target.value})} className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-sky-500 bg-white">
                    <option value="Almacén">Almacén</option>
                    <option value="Recibo">Recibo</option>
                    <option value="Cuarto Frío">Cuarto Frío</option>
                    <option value="Calidad">Calidad</option>
                  </select>
                </label>

                <label className="block space-y-1">
                  <span className="text-xs font-medium text-slate-600">Jerarquía</span>
                  <select value={formInvitacion.nivel_jerarquia} onChange={(e) => setFormInvitacion({...formInvitacion, nivel_jerarquia: Number(e.target.value)})} className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-sky-500">
                    <option value={2}>Nivel 2 (Medio)</option>
                    <option value={3}>Nivel 3 (Bajo)</option>
                  </select>
                </label>
              </div>

              <label className="block space-y-1">
                <span className="text-xs font-medium text-slate-600">Rol asignado</span>
                <select value={formInvitacion.rol} onChange={(e) => setFormInvitacion({...formInvitacion, rol: e.target.value as Perfil["rol"]})} className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-sky-500">
                  <option value="Operador">Operador (Básico)</option>
                  <option value="Encargado">Encargado (Escritura)</option>
                </select>
              </label>

              <button type="submit" className="w-full rounded-xl bg-sky-600 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 shadow-sm">Enviar Invitación</button>
              {mensaje && <p className="text-xs text-center mt-2 text-sky-700 font-medium bg-sky-50 p-2 rounded-lg">{mensaje}</p>}
            </form>
          </section>
          )}

          <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm lg:col-span-2 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-medium text-slate-800">Estructura de Personal Activo</h2>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setShowInvitaciones((s) => !s)} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-700">{showInvitaciones ? 'Ocultar invitaciones' : 'Mostrar invitaciones'}</button>
                <button type="button" onClick={() => setNuevoModalOpen(true)} className="rounded-full bg-sky-600 px-3 py-1 text-sm font-semibold text-white hover:bg-sky-700">Nuevo usuario</button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-500 font-medium">
                    <th className="pb-3 text-xs uppercase">No. Empleado</th>
                    <th className="pb-3 text-xs uppercase">Colaborador</th>
                    <th className="pb-3 text-xs uppercase">Teléfono</th>
                    <th className="pb-3 text-xs uppercase">Área / Puesto</th>
                    <th className="pb-3 text-center text-xs uppercase">Jerarquía</th>
                    <th className="pb-3 text-center text-xs uppercase">Rol Sistema</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan={6} className="py-8 text-center text-slate-400">Cargando la base de datos...</td></tr>
                  ) : (
                    usuarios.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 text-slate-900 font-mono text-xs">{user.numero_empleado || "—"}</td>
                        <td className="py-3"><div className="font-medium text-slate-800">{user.nombre || "Invitación en proceso"}</div></td>
                        <td className="py-3">
                          <input type="text" value={user.telefono || ""} placeholder="Añadir tel" onChange={(e) => setUsuarios(usuarios.map(u => u.id === user.id ? { ...u, telefono: e.target.value } : u))} onBlur={(e) => handleGuardarCambiosLinea(user.id, "telefono", e.target.value)} className="bg-transparent hover:bg-slate-100 focus:bg-white border border-transparent focus:border-slate-200 px-2 py-1 rounded-lg text-slate-700 outline-none w-28 font-mono text-xs" />
                        </td>
                        <td className="py-3">
                          <select value={user.cargo || "Almacén"} onChange={(e) => { setUsuarios(usuarios.map(u => u.id === user.id ? { ...u, cargo: e.target.value } : u)); handleGuardarCambiosLinea(user.id, "cargo", e.target.value); }} className="bg-transparent hover:bg-slate-100 focus:bg-white border border-transparent focus:border-slate-200 px-2 py-1 rounded-lg text-sm text-slate-700 outline-none">
                            <option value="Dirección">Dirección</option>
                            <option value="Almacén">Almacén</option>
                            <option value="Recibo">Recibo</option>
                            <option value="Cuarto Frío">Cuarto Frío</option>
                            <option value="Calidad">Calidad</option>
                            <option value="Produccion">Produccion</option>
                          </select>
                        </td>
                        <td className="py-3 text-center">
                          <select value={user.nivel_jerarquia} onChange={(e) => handleGuardarCambiosLinea(user.id, "nivel_jerarquia", Number(e.target.value))} className="bg-slate-100 text-slate-800 text-xs rounded-lg px-2 py-1 outline-none font-medium">
                            <option value={1}>1 (Dirección)</option>
                            <option value={2}>2 (Gerencia)</option>
                            <option value={3}>3 (Operador)</option>
                          </select>
                        </td>
                        <td className="py-3 text-center">
                          <select value={user.rol} onChange={(e) => handleGuardarCambiosLinea(user.id, "rol", e.target.value as Perfil["rol"])} className={`rounded-full px-3 py-1 text-xs font-semibold border bg-transparent outline-none ${ user.rol === "Administrador" ? "border-purple-200 text-purple-700 bg-purple-50" : user.rol === "Encargado" ? "border-amber-200 text-amber-700 bg-amber-50" : "border-slate-200 text-slate-700 bg-slate-50" }`}>
                            <option value="Operador">Operador</option>
                            <option value="Encargado">Encargado</option>
                            <option value="Administrador">Administrador</option>
                          </select>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {adminModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-200 sm:p-8">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-2xl font-semibold text-purple-950">Alta de Administrador Directo</h2>
                <p className="text-sm text-slate-500 mt-1">Registra de inmediato a un líder con permisos totales.</p>
              </div>
              <button type="button" onClick={() => setAdminModalOpen(false)} className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200">×</button>
            </div>

            <form onSubmit={handleCrearAdminDirecto} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <label className="block space-y-1 col-span-1">
                  <span className="text-xs font-medium text-slate-700">No. Empleado</span>
                  <input type="text" required placeholder="ADM-01" value={formAdmin.numero_empleado} onChange={(e) => setFormAdmin({...formAdmin, numero_empleado: e.target.value})} className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-purple-500" />
                </label>

                <label className="block space-y-1 col-span-2">
                  <span className="text-xs font-medium text-slate-700">Nombre Completo</span>
                  <input type="text" required placeholder="Ej. Carlos Slim" value={formAdmin.nombre} onChange={(e) => setFormAdmin({...formAdmin, nombre: e.target.value})} className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-purple-500" />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="text-xs font-medium text-slate-700">Correo de Acceso</span>
                  <input type="email" required placeholder="admin@empresa.com" value={formAdmin.email} onChange={(e) => setFormAdmin({...formAdmin, email: e.target.value})} className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-purple-500" />
                </label>

                <label className="block space-y-1">
                  <span className="text-xs font-medium text-slate-700">Teléfono</span>
                  <input type="tel" placeholder="3119998877" value={formAdmin.telefono} onChange={(e) => setFormAdmin({...formAdmin, telefono: e.target.value})} className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-purple-500" />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="text-xs font-medium text-slate-700">Área / Cargo Directivo</span>
                  <select value={formAdmin.cargo} onChange={(e) => setFormAdmin({...formAdmin, cargo: e.target.value})} className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-purple-500 bg-white">
                    <option value="Dirección">Dirección Central</option>
                    <option value="Almacén">Almacén </option>
                    <option value="Recibo">Recibo </option>
                    <option value="Cuarto Frío">Cuarto Frío </option>
                    <option value="Produccion">Produccion </option>
                    <option value="Calidad">Calidad </option>
                  </select>
                </label>

                <label className="block space-y-1">
                  <span className="text-xs font-medium text-slate-700">Nivel Jerárquico</span>
                  <select value={formAdmin.nivel_jerarquia} onChange={(e) => setFormAdmin({...formAdmin, nivel_jerarquia: Number(e.target.value)})} className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-purple-500">
                    <option value={1}>1 (Admin)</option>
                    <option value={2}>2 (Lider)</option>
                    <option value={3}>3 (Operador)</option>
                    <option value={4}>4 (Empleado)</option>
                  </select>
                </label>
              </div>

              <blockquote className="text-xs text-purple-800 bg-purple-50 p-3 rounded-xl border border-purple-100">⚠️ El sistema creará la cuenta inmediatamente y se le asignará la clave temporal <strong>PasswordTemporal2026*</strong> para su primer ingreso.</blockquote>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setAdminModalOpen(false)} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancelar</button>
                <button type="submit" className="rounded-full bg-purple-700 px-5 py-2 text-sm font-semibold text-white hover:bg-purple-800 transition shadow-sm">Guardar y Activar Admin</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {nuevoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="mt-10 w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-200 sm:p-8">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-2xl font-semibold">Alta de Nuevo Usuario</h2>
                <p className="text-sm text-slate-500 mt-1">Crea un usuario directamente en el sistema (se genera contraseña temporal).</p>
              </div>
              <button type="button" onClick={() => setNuevoModalOpen(false)} className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200">×</button>
            </div>

            <form onSubmit={handleCrearUsuarioDirecto} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <label className="block space-y-1 col-span-1">
                  <span className="text-xs font-medium text-slate-700">No. Empleado</span>
                  <input type="text" placeholder="USR-01" value={formNuevo.numero_empleado} onChange={(e) => setFormNuevo({...formNuevo, numero_empleado: e.target.value})} className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-sky-500" />
                </label>

                <label className="block space-y-1 col-span-2">
                  <span className="text-xs font-medium text-slate-700">Nombre Completo</span>
                  <input type="text" placeholder="Ej. Juan Pérez" value={formNuevo.nombre} onChange={(e) => setFormNuevo({...formNuevo, nombre: e.target.value})} className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-sky-500" />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="text-xs font-medium text-slate-700">Correo</span>
                  <input type="email" placeholder="usuario@empresa.com" value={formNuevo.email} onChange={(e) => setFormNuevo({...formNuevo, email: e.target.value})} className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-sky-500" />
                </label>

                <label className="block space-y-1">
                  <span className="text-xs font-medium text-slate-700">Teléfono</span>
                  <input type="tel" placeholder="3111234567" value={formNuevo.telefono} onChange={(e) => setFormNuevo({...formNuevo, telefono: e.target.value})} className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-sky-500" />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="text-xs font-medium text-slate-700">Área / Cargo</span>
                  <input type="text" value={formNuevo.cargo} onChange={(e) => setFormNuevo({...formNuevo, cargo: e.target.value})} className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-sky-500" />
                </label>

                <label className="block space-y-1">
                  <span className="text-xs font-medium text-slate-700">Jerarquía</span>
                  <select value={formNuevo.nivel_jerarquia} onChange={(e) => setFormNuevo({...formNuevo, nivel_jerarquia: Number(e.target.value)})} className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-sky-500">
                    <option value={1}>1 (Admin)</option>
                    <option value={2}>2 (Lider)</option>
                    <option value={3}>3 (Operador)</option>
                  </select>
                </label>
              </div>

              <label className="block space-y-1">
                <span className="text-xs font-medium text-slate-700">Rol</span>
                <select value={formNuevo.rol} onChange={(e) => setFormNuevo({...formNuevo, rol: e.target.value as Perfil["rol"]})} className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-sky-500">
                  <option value="Operador">Operador</option>
                  <option value="Encargado">Encargado</option>
                  <option value="Administrador">Administrador</option>
                </select>
              </label>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setNuevoModalOpen(false)} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancelar</button>
                <button type="submit" className="rounded-full bg-sky-600 px-5 py-2 text-sm font-semibold text-white hover:bg-sky-700 transition shadow-sm">Crear usuario</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

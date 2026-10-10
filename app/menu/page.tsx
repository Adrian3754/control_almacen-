import Link from "next/link";

const modules = [
  { href: "/dashboard", label: "Inicio", description: "Resumen del almacén", icon: "🏠" },
  { href: "/lotes", label: "Lotes", description: "Consulta y registra lotes", icon: "📋" },
  { href: "/movimientos", label: "Movimientos", description: "Entradas y salidas", icon: "🔄" },
  { href: "/inventario", label: "Materiales y compras", description: "Existencias y recepciones por área", icon: "🧰" },
  { href: "/cortes", label: "Cortes", description: "Registro de placas, productores, peso y lote", icon: "🌿" },
  { href: "/tarimas", label: "Tarimas", description: "Administra tarimas", icon: "📦" },
  { href: "/calidad/muestreo", label: "Calidad", description: "Registro de muestreos", icon: "✅" },
  { href: "/sorteo", label: "Sorteo", description: "Consulta el módulo de sorteo", icon: "🎯" },
  { href: "/cuentas", label: "Cuentas", description: "Consulta cuentas", icon: "🧾" },
  { href: "/profile", label: "Mi perfil", description: "Consulta tu perfil", icon: "👤" },
];

export default function MenuPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">
            M. López
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Menú de módulos
          </h1>
          <p className="mt-2 max-w-2xl text-slate-600">
            Selecciona una sección. La navegación permanece disponible desde el
            menú lateral o el botón de menú en el teléfono.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {modules.map((module) => (
            <Link
              key={module.href}
              href={module.href}
              className="group flex min-h-32 items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
            >
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-2xl transition group-hover:bg-emerald-100">
                {module.icon}
              </span>
              <span>
                <span className="block font-semibold text-slate-900">
                  {module.label}
                </span>
                <span className="mt-1 block text-sm text-slate-500">
                  {module.description}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
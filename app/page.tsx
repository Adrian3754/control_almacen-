"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getEmployeeSession } from "@/lib/employeeSession";

export default function HomePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Verificamos si el trabajador ya tiene una sesión activa en el navegador
    const session = getEmployeeSession();
    if (session) {
      // Si ya inició sesión, lo enviamos directo a su Dashboard de trabajo
      router.replace("/dashboard");
    } else {
      // Si no hay sesión, mostramos la Landing Page informativa
      setChecking(false);
    }
  }, [router]);

  // Evitamos que parpadee la landing si el usuario ya está autenticado
  if (checking) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col justify-between">
      
      {/* =========================================================================
          BARRA DE NAVEGACIÓN SUPERIOR (HEADER PÚBLICO)
          ========================================================================= */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          
          {/* Brand / Logo */}
          <div className="flex items-center gap-2">
            <span className="text-2xl">🌱</span>
            <span className="text-xl font-bold tracking-tight text-slate-900">Control Almacén</span>
          </div>

          {/* Menú para pantallas medianas/grandes */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#mision" className="hover:text-sky-600 transition">Misión y Visión</a>
            <a href="#valores" className="hover:text-sky-600 transition">Valores</a>
            <a href="#grupos" className="hover:text-sky-600 transition">Grupos de Trabajo</a>
          </nav>

          {/* Botón de Acceso para Colaboradores */}
          <div className="hidden md:flex items-center gap-4">
            <Link 
              href="/login" 
              className="rounded-full bg-sky-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 active:scale-95"
            >
              Iniciar Sesión
            </Link>
          </div>

          {/* Botón menú móvil */}
          <button 
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm"
          >
            {mobileMenuOpen ? "✕" : "☰"}
          </button>
        </div>

        {/* Desplegable Móvil */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-slate-200 px-6 py-4 space-y-3 shadow-lg">
            <a href="#mision" onClick={() => setMobileMenuOpen(false)} className="block text-sm font-medium text-slate-700">Misión y Visión</a>
            <a href="#valores" onClick={() => setMobileMenuOpen(false)} className="block text-sm font-medium text-slate-700">Valores</a>
            <a href="#grupos" onClick={() => setMobileMenuOpen(false)} className="block text-sm font-medium text-slate-700">Grupos de Trabajo</a>
            <div className="pt-2 border-t border-slate-100">
              <Link 
                href="/login" 
                className="block text-center rounded-full bg-sky-600 py-2.5 text-sm font-semibold text-white shadow-sm"
              >
                Iniciar Sesión
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* =========================================================================
          CONTENIDO INFORMATIVO
          ========================================================================= */}
      <main className="flex-1">
        
        {/* HERO */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 md:py-24 text-center">
          <span className="inline-block bg-sky-50 text-sky-700 border border-sky-200 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-6">
            Gestión & Operaciones
          </span>
          <h1 className="text-4xl md:text-6xl font-bold text-slate-900 tracking-tight max-w-3xl mx-auto">
            Innovación y control total en la cadena de almacén
          </h1>
          <p className="mt-6 text-lg text-slate-600 max-w-2xl mx-auto">
            Plataforma centralizada para la administración de lotes, tarimas, cuartos fríos y control operativo.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link 
              href="/login" 
              className="rounded-full bg-sky-600 px-8 py-3.5 text-base font-semibold text-white shadow-md transition hover:bg-sky-700 active:scale-95"
            >
              Acceso a Colaboradores
            </Link>
          </div>
        </section>

        {/* MISIÓN Y VISIÓN */}
        <section id="mision" className="bg-white border-y border-slate-200 py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8 shadow-sm">
              <div className="text-3xl mb-4">🎯</div>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">Nuestra Misión</h2>
              <p className="text-slate-600 leading-relaxed">
                Garantizar un procesamiento eficiente, seguro y de alta calidad en cada etapa del almacén, optimizando el manejo de inventarios, tarimas y logística interna para cumplir con los más altos estándares.
              </p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8 shadow-sm">
              <div className="text-3xl mb-4">🔭</div>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">Nuestra Visión</h2>
              <p className="text-slate-600 leading-relaxed">
                Consolidarnos como una organización referente en la gestión agroindustrial e inventarios, destacando por el uso de herramientas tecnológicas avanzadas, la precisión de nuestros datos y la excelencia operativa.
              </p>
            </div>
          </div>
        </section>

        {/* VALORES */}
        <section id="valores" className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
          <div className="text-center max-w-xl mx-auto mb-12">
            <h2 className="text-3xl font-bold text-slate-900">Nuestros Valores</h2>
            <p className="text-slate-600 mt-2">Los pilares que fundamentan nuestras actividades diarias.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm">
              <span className="text-2xl">🤝</span>
              <h3 className="text-lg font-bold text-slate-900 mt-4 mb-2">Compromiso</h3>
              <p className="text-sm text-slate-600">Dedicación con la calidad del producto y la seguridad de nuestro equipo.</p>
            </div>
            <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm">
              <span className="text-2xl">⚡</span>
              <h3 className="text-lg font-bold text-slate-900 mt-4 mb-2">Eficiencia</h3>
              <p className="text-sm text-slate-600">Optimización constante de procesos para el flujo rápido de lotes y cargas.</p>
            </div>
            <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm">
              <span className="text-2xl">🛡️</span>
              <h3 className="text-lg font-bold text-slate-900 mt-4 mb-2">Transparencia</h3>
              <p className="text-sm text-slate-600">Precisión y trazabilidad en el registro de cada movimiento e inventario.</p>
            </div>
            <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm">
              <span className="text-2xl">🚀</span>
              <h3 className="text-lg font-bold text-slate-900 mt-4 mb-2">Innovación</h3>
              <p className="text-sm text-slate-600">Integración de sistemas digitales para agilizar las operaciones en planta.</p>
            </div>
          </div>
        </section>

        {/* GRUPOS INTEGRADOS */}
        <section id="grupos" className="bg-slate-100 border-t border-slate-200 py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="text-center max-w-xl mx-auto mb-12">
              <h2 className="text-3xl font-bold text-slate-900">Grupos de Trabajo Integrados</h2>
              <p className="text-slate-600 mt-2">Nuestras áreas especializadas para mantener el control del inventario.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm">
                <h3 className="text-xl font-bold text-slate-900 mb-2">Recepción y Lotes</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Supervisan la llegada de camiones, pesan la materia prima e ingresan los lotes iniciales al sistema.
                </p>
              </div>
              <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm">
                <h3 className="text-xl font-bold text-slate-900 mb-2">Operaciones y Tarimas</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Encargados del empaque, armado de tarimas, traslados a cuarto frío y control de pesajes netos.
                </p>
              </div>
              <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm">
                <h3 className="text-xl font-bold text-slate-900 mb-2">Administración y Control</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Gestionan los permisos de empleados, visualizan los reportes consolidados e inventarios generales.
                </p>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="bg-white border-t border-slate-200 py-8 text-center text-xs text-slate-500">
        <p>© {new Date().getFullYear()} Control Almacén. Todos los derechos reservados.</p>
      </footer>

    </div>
  );
}
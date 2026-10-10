"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { getEmployeeSession } from "@/lib/employeeSession";

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const session = getEmployeeSession();
    if (session) {
      window.location.replace("/dashboard");
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col justify-between selection:bg-amber-200 selection:text-amber-900">
      
      {/* =========================================================================
          BARRA DE NAVEGACIÓN SUPERIOR (HEADER PÚBLICO)
          ========================================================================= */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-emerald-100 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          
          {/* Brand / Logo M. López */}
          <div className="flex items-center gap-3">
            <Image
              src="/logo-mlopez.png"
              alt="Logotipo de M. López"
              width={48}
              height={48}
              priority
              className="h-12 w-12 rounded-2xl object-contain shadow-sm"
            />
            <div>
              <span className="text-xl font-bold tracking-tight text-slate-900 block leading-none">
                M. LÓPEZ
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 mt-1 block">
                Empresa Exportadora de Yaca
              </span>
            </div>
          </div>

          {/* Menú Escritorio */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
            <a href="#mision" className="hover:text-emerald-600 transition">Misión y Visión</a>
            <a href="#valores" className="hover:text-emerald-600 transition">Nuestros Valores</a>
            <a href="#empresa" className="hover:text-emerald-600 transition">Sobre Nosotros</a>
          </nav>

          {/* Botón de Acceso para Colaboradores */}
          <div className="hidden md:flex items-center gap-4">
            <Link 
              href="/login" 
              className="rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700 active:scale-95 flex items-center gap-2"
            >
              <span>Acceso Personal</span>
              <span className="text-amber-300">→</span>
            </Link>
          </div>

          {/* Botón menú móvil */}
          <button 
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2.5 rounded-2xl bg-emerald-50 text-emerald-800 font-bold text-sm border border-emerald-200"
          >
            {mobileMenuOpen ? "✕" : "☰"}
          </button>
        </div>

        {/* Desplegable Móvil */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-emerald-100 px-6 py-5 space-y-4 shadow-xl">
            <a href="#mision" onClick={() => setMobileMenuOpen(false)} className="block text-sm font-semibold text-slate-700 hover:text-emerald-600">Misión y Visión</a>
            <a href="#valores" onClick={() => setMobileMenuOpen(false)} className="block text-sm font-semibold text-slate-700 hover:text-emerald-600">Nuestros Valores</a>
            <a href="#empresa" onClick={() => setMobileMenuOpen(false)} className="block text-sm font-semibold text-slate-700 hover:text-emerald-600">Sobre Nosotros</a>
            <div className="pt-3 border-t border-slate-100">
              <Link 
                href="/login" 
                onClick={() => setMobileMenuOpen(false)}
                className="block text-center rounded-full bg-emerald-600 py-3 text-sm font-bold text-white shadow-md shadow-emerald-600/20"
              >
                Acceso Personal M. López
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* =========================================================================
          CONTENIDO INFORMATIVO PRINCIPAL
          ========================================================================= */}
      <main className="flex-1">
        
        {/* HERO SECTION */}
        <section className="relative overflow-hidden bg-gradient-to-b from-emerald-50/60 via-slate-50 to-white py-20 md:py-28">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center relative z-10">
            <span className="inline-flex items-center gap-2 bg-amber-100/80 text-amber-900 border border-amber-300 px-4 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wider mb-6 shadow-xs">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
              Exportación de Yaca de Alta Calidad a EE. UU. 🇺🇸🇲🇽
            </span>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 tracking-tight max-w-4xl mx-auto leading-tight">
              Calidad internacional y excelencia en la agroexportación de <span className="text-emerald-600 underline decoration-amber-400 decoration-wavy decoration-2">Yaca</span>
            </h1>
            <p className="mt-6 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              En <strong className="text-slate-900">M. López</strong> estamos comprometidos con llevar la mejor fruta de México al mercado internacional, garantizando los más altos estándares de calidad, frescura e inocuidad en cada envío.
            </p>
            <div className="mt-9 flex flex-col sm:flex-row justify-center items-center gap-4">
              <Link 
                href="/login" 
                className="w-full sm:w-auto rounded-full bg-emerald-600 px-8 py-4 text-base font-bold text-white shadow-lg shadow-emerald-600/25 transition hover:bg-emerald-700 active:scale-95"
              >
                Ingreso al Sistema Interno
              </Link>
              <a 
                href="#mision" 
                className="w-full sm:w-auto rounded-full border border-slate-300 bg-white px-8 py-4 text-base font-semibold text-slate-700 hover:bg-slate-50 transition active:scale-95"
              >
                Conocer Nuestra Misión
              </a>
            </div>
          </div>
        </section>

        {/* MISIÓN Y VISIÓN */}
        <section id="mision" className="bg-white border-y border-slate-200/80 py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            <div className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50/40 to-white p-8 sm:p-10 shadow-sm relative">
              <span className="text-4xl mb-4 block">🎯</span>
              <h2 className="text-2xl font-black text-slate-900 mb-3">Nuestra Misión</h2>
              <p className="text-slate-600 leading-relaxed text-sm sm:text-base">
                Ofrecer productos agroalimentarios de la más alta calidad y frescura al mercado internacional, impulsando el desarrollo sostenible de nuestro sector y garantizando la satisfacción de nuestros clientes y aliados comerciales mediante el trabajo en equipo y la excelencia en cada proceso.
              </p>
            </div>
            <div className="rounded-3xl border border-amber-100 bg-gradient-to-br from-amber-50/40 to-white p-8 sm:p-10 shadow-sm relative">
              <span className="text-4xl mb-4 block">🌍</span>
              <h2 className="text-2xl font-black text-slate-900 mb-3">Nuestra Visión</h2>
              <p className="text-slate-600 leading-relaxed text-sm sm:text-base">
                Consolidarnos como una empresa agroexportadora referente en el mercado de Estados Unidos y a nivel internacional, destacando por la confianza, consistencia en la calidad de nuestros productos, innovación constante y compromiso continuo con nuestro personal y el medio ambiente.
              </p>
            </div>
          </div>
        </section>

        {/* VALORES */}
        <section id="valores" className="bg-slate-100/80 border-b border-slate-200 py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="text-center max-w-xl mx-auto mb-12">
              <h2 className="text-3xl font-black text-slate-900">Nuestros Valores</h2>
              <p className="text-slate-600 mt-2 text-sm">Los principios éticos y profesionales que guían a la gran familia M. López.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="rounded-3xl bg-white border border-slate-200/80 p-6 shadow-xs">
                <span className="text-3xl block mb-3">🏅</span>
                <h3 className="text-lg font-bold text-slate-900 mb-1">Calidad e Excelencia</h3>
                <p className="text-xs text-slate-600 leading-relaxed">Buscamos superar siempre los requerimientos internacionales en cada producto que entregamos.</p>
              </div>
              <div className="rounded-3xl bg-white border border-slate-200/80 p-6 shadow-xs">
                <span className="text-3xl block mb-3">🤝</span>
                <h3 className="text-lg font-bold text-slate-900 mb-1">Compromiso y Responsabilidad</h3>
                <p className="text-xs text-slate-600 leading-relaxed">Actuamos con seriedad, transparencia y dedición constante con nuestros clientes y equipo.</p>
              </div>
              <div className="rounded-3xl bg-white border border-slate-200/80 p-6 shadow-xs">
                <span className="text-3xl block mb-3">🌿</span>
                <h3 className="text-lg font-bold text-slate-900 mb-1">Inocuidad y Seguridad</h3>
                <p className="text-xs text-slate-600 leading-relaxed">Cuidamos la salud de los consumidores finales asegurando estándares sanitarios estrictos.</p>
              </div>
              <div className="rounded-3xl bg-white border border-slate-200/80 p-6 shadow-xs">
                <span className="text-3xl block mb-3">👥</span>
                <h3 className="text-lg font-bold text-slate-900 mb-1">Trabajo en Equipo</h3>
                <p className="text-xs text-slate-600 leading-relaxed">Fomentamos un ambiente colaborador donde el talento humano es nuestro activo más valioso.</p>
              </div>
            </div>
          </div>
        </section>

        {/* SOBRE LA EMPRESA */}
        <section id="empresa" className="py-20 max-w-7xl mx-auto px-4 sm:px-6">
          <div className="bg-gradient-to-br from-emerald-900 to-green-950 text-white rounded-3xl p-8 sm:p-12 shadow-xl relative overflow-hidden">
            <div className="relative z-10 grid items-center gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,3fr)]">
              <div className="mx-auto flex h-48 w-48 items-center justify-center rounded-3xl bg-white p-3 shadow-xl md:h-56 md:w-56">
                <Image
                  src="/logo-mlopez.png"
                  alt="Logotipo de M. López"
                  width={512}
                  height={512}
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="max-w-3xl">
              <span className="text-amber-400 text-xs font-bold uppercase tracking-wider bg-amber-400/10 px-3 py-1 rounded-md border border-amber-400/20">
                Empresa Agroexportadora
              </span>
              <h2 className="text-3xl sm:text-4xl font-black mt-4 mb-4">Empresa M. López</h2>
              <p className="text-emerald-100 text-sm sm:text-base leading-relaxed mb-6">
                Somos una empresa dedicada con orgullo a la comercialización e internacionalización de frutas tropicales de alta demanda como la yaca. Gracias al esfuerzo continuo de nuestros colaboradores y al enfoque en la mejora continua, conectamos el trabajo agrícola de México con las exigencias del mercado norteamericano.
              </p>
              <div className="flex flex-wrap gap-4 text-xs font-semibold text-emerald-200">
                <span className="bg-white/10 px-3 py-1.5 rounded-full">✓ Exportación a EE. UU.</span>
                <span className="bg-white/10 px-3 py-1.5 rounded-full">✓ Calidad Internacional</span>
                <span className="bg-white/10 px-3 py-1.5 rounded-full">✓ Desarrollo Sostenible</span>
              </div>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="bg-white border-t border-slate-200 py-8 text-center text-xs text-slate-500">
        <p>© {new Date().getFullYear()} Empresa M. López. Todos los derechos reservados.</p>
      </footer>

    </div>
  );
}
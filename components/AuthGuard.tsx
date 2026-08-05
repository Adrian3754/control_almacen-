"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthGuard() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const publicPaths = ["/login"];

    // 1. Si ya estás en una ruta pública, no hagas nada.
    if (publicPaths.includes(pathname)) {
      return;
    }

    let isMounted = true;

    // 2. Verificar la sesión actual al montar el componente
    const verifySession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!isMounted) return;

      if (!session) {
        router.replace("/login");
      }
    };

    verifySession();

    // 3. Escuchar cambios en el estado de autenticación (Logouts, tokens expirados, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;

      // Si el usuario no tiene sesión o explícitamente se desloguea
      if (!session || event === "SIGNED_OUT") {
        router.replace("/login");
      }
    });

    // 4. Limpieza del efecto
    return () => {
      isMounted = false; // <-- AQUÍ estaba el error (decía active = false)
      subscription.unsubscribe(); // <-- Limpieza correcta de la suscripción
    };
  }, [pathname, router]);

  return null;
}
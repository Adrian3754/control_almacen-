"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getEmployeeSession } from "@/lib/employeeSession";

export default function AuthGuard() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/login") {
      return;
    }

    const session = getEmployeeSession();

    if (!session) {
      router.replace("/login");
      return;
    }

    if (pathname.startsWith("/usuarios") && session.nivel_jerarquia !== 1) {
      router.replace("/dashboard");
      return;
    }

    if (pathname.startsWith("/settings") && session.nivel_jerarquia !== 1) {
      router.replace("/dashboard");
      return;
    }
  }, [pathname, router]);

  return null;
}

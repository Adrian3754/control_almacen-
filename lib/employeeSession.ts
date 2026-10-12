export type EmployeeSession = {
  numero_empleado: string;
  nombre?: string;
  cargo?: string;
  rol?: "Administrador" | "Encargado" | "Operador";
  nivel_jerarquia?: number;
  telefono?: string;
  email?: string;
  foto?: string;
  loggedAt: string;
};

export function getEmployeeSession(): EmployeeSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = localStorage.getItem("employeeSession");
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as EmployeeSession;
  } catch {
    return null;
  }
}

export function saveEmployeeSession(session: EmployeeSession) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem("employeeSession", JSON.stringify(session));
  window.dispatchEvent(new Event("employeeSessionChanged"));
}

export function clearEmployeeSession() {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem("employeeSession");
  window.dispatchEvent(new Event("employeeSessionChanged"));
}

import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "mlopez_employee_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

type SessionPayload = {
  numero_empleado: string;
  expires_at: number;
};

function getSigningKey() {
  const key = process.env.EMPLOYEE_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("Falta configurar EMPLOYEE_SESSION_SECRET o SUPABASE_SERVICE_ROLE_KEY.");
  }
  return key;
}

function signature(payload: string) {
  return createHmac("sha256", getSigningKey()).update(payload).digest();
}

export async function setServerEmployeeSession(numeroEmpleado: string) {
  const payload: SessionPayload = {
    numero_empleado: numeroEmpleado,
    expires_at: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const token = `${encodedPayload}.${signature(encodedPayload).toString("base64url")}`;
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function getServerEmployeeSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;

  const [encodedPayload, encodedSignature, extraPart] = token.split(".");
  if (!encodedPayload || !encodedSignature || extraPart !== undefined) return null;

  let suppliedSignature: Buffer;
  let payload: SessionPayload;
  try {
    suppliedSignature = Buffer.from(encodedSignature, "base64url");
    const expectedSignature = signature(encodedPayload);
    if (
      suppliedSignature.length !== expectedSignature.length ||
      !timingSafeEqual(suppliedSignature, expectedSignature)
    ) {
      return null;
    }

    const decoded: unknown = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8")
    );
    if (
      typeof decoded !== "object" ||
      decoded === null ||
      !("numero_empleado" in decoded) ||
      typeof decoded.numero_empleado !== "string" ||
      !decoded.numero_empleado.trim() ||
      !("expires_at" in decoded) ||
      typeof decoded.expires_at !== "number"
    ) {
      return null;
    }
    payload = {
      numero_empleado: decoded.numero_empleado,
      expires_at: decoded.expires_at,
    };
  } catch {
    return null;
  }

  if (payload.expires_at <= Math.floor(Date.now() / 1000)) return null;
  return payload;
}

export async function clearServerEmployeeSession() {
  (await cookies()).delete(COOKIE_NAME);
}

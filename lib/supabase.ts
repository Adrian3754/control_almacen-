import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Cambiado aquí para que coincida con tu nuevo .env
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; 

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env or .env.local."
  );
}

// Cliente público para usar en componentes con "use client"
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const createPublicSupabaseClient = () => createClient(supabaseUrl, supabaseAnonKey);

// Cliente de servidor (para bypass de RLS / operaciones administrativas)
export const createServerSupabaseClient = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY in environment variables for server-side Supabase access."
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};

// Cliente exclusivo para Supabase Auth Admin.
// Auth Admin necesita la service_role legacy en formato JWT, no una llave sb_secret_*.
export const createAuthAdminSupabaseClient = () => {
  const authAdminKey =
    process.env.SUPABASE_AUTH_ADMIN_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!authAdminKey) {
    throw new Error(
      "Falta SUPABASE_AUTH_ADMIN_KEY o SUPABASE_SERVICE_ROLE_KEY para operaciones de Supabase Auth Admin."
    );
  }

  if (authAdminKey.startsWith("sb_secret_") || authAdminKey.split(".").length !== 3) {
    throw new Error(
      "Supabase Auth Admin requiere una service_role key legacy en formato JWT. Agrega SUPABASE_AUTH_ADMIN_KEY con la llave service_role legacy del proyecto."
    );
  }

  return createClient(supabaseUrl, authAdminKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};

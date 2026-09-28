import { createClient as createSupabaseClient } from "@supabase/supabase-js"

/**
 * Cliente con clave de servicio. SOLO se usa en el servidor.
 * Sirve para dar de alta cuentas ya confirmadas, porque el proveedor de correo
 * integrado de Supabase no entrega mensajes a direcciones externas.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!key) {
    throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY")
  }

  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

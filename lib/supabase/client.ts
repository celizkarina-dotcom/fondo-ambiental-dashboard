import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js"

let client: SupabaseClient | undefined

/**
 * Cliente del navegador. La sesión se guarda en el almacenamiento del navegador
 * (no en cookies), así el ingreso funciona también cuando el tablero se muestra
 * dentro del panel institucional (iframe), igual que Chatarra con Firebase.
 */
export function createClient() {
  if (client) return client

  client = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storageKey: "fondo-ambiental-sesion",
    },
  })

  return client
}

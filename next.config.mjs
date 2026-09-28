/** @type {import('next').NextConfig} */

// Sitios que pueden mostrar este tablero dentro de un marco (iframe).
// El panel institucional es el único; se puede sumar otro separándolo con un espacio.
const FRAME_ANCESTORS = "'self' https://v0-institutional.vercel.app"

const nextConfig = {
  images: { unoptimized: true },
  // La integración de Supabase en Vercel crea SUPABASE_URL y SUPABASE_ANON_KEY.
  // Acá se exponen al navegador con los nombres que usa el tablero.
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.SUPABASE_PUBLISHABLE_KEY,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [{ key: "Content-Security-Policy", value: `frame-ancestors ${FRAME_ANCESTORS}` }],
      },
    ]
  },
}

export default nextConfig

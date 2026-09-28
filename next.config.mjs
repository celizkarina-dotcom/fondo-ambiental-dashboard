/** @type {import('next').NextConfig} */

// Sitios que pueden mostrar este tablero dentro de un marco (iframe).
// El panel institucional es el único; se puede sumar otro separándolo con un espacio.
const FRAME_ANCESTORS = "'self' https://v0-institutional.vercel.app"

const nextConfig = {
  images: { unoptimized: true },
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

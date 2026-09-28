# Fondo Ambiental — proyecto propio

Tablero del Fondo Ambiental de la Provincia de Córdoba como proyecto separado del panel
institucional, igual que Chatarra o Promoción Ambiental. El panel lo muestra dentro de un
marco (iframe) desde `app/economia-circular/residuos/fondo-ambiental/page.tsx`.

- **Base de datos:** la misma de Supabase que usa el panel (`supabase-fuchsia-flower`), tabla
  `fund_records`, con una columna por cada tipo de equipo (24 tipos, igual que la planilla
  *2026 - Solicitud Municipios Fondo Ambiental*).
- **Usuarios:** los mismos del panel (tabla `profiles`, roles admin / editor / viewer).
  Se entra con el mismo correo y contraseña.
- **Sincronización:** las altas, ediciones y bajas se ven al instante para todos (Supabase Realtime).
- **Quién puede mostrarlo en un marco:** solo el panel (`next.config.mjs`, `FRAME_ANCESTORS`).

## Variables de entorno (Vercel)

Se cargan solas al conectar la base desde **Storage → supabase-fuchsia-flower → Connect Project**.

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (solo se usa en el servidor, para dar de alta cuentas)

## Historial

- 28/09/2026: separado del panel. Se agregan los 24 tipos de equipo y la pestaña
  *Vehículos por localidad*; se corrigen coordenadas; se reemplaza el fondo de mapa de CARTO
  (pedía clave) por Esri. Script aplicado: `supabase/20260928_fondo_ambiental_tipos_equipamiento.sql`.

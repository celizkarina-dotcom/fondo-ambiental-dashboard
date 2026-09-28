"use client"

import { useMemo, useState } from "react"
import { CircleMarker, MapContainer, Popup, TileLayer, Tooltip } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import { EQUIPMENT_FIELDS, formatCurrency, totalEquipment, type FundRecord } from "@/lib/fondo-ambiental/types"
import { Button } from "@/components/ui/button"

/** Etapa 1 usa el azul institucional, etapa 2 el naranja de los graficos. */
const STAGE_COLOR: Record<number, string> = {
  1: "#1e5bb5",
  2: "#e5700a",
}

function stageColor(etapa: number) {
  return STAGE_COLOR[etapa] ?? "#4b5563"
}

export function MapPanel({ records }: { records: FundRecord[] }) {
  const [mode, setMode] = useState<"calor" | "marcadores">("marcadores")

  const points = useMemo(() => records.filter((r) => r.lat != null && r.lng != null), [records])

  const maxMonto = useMemo(() => Math.max(1, ...points.map((r) => Number(r.monto) || 0)), [points])

  /** El radio crece con la raiz del monto para que un caso grande no tape el resto. */
  function radiusFor(monto: number) {
    const ratio = Math.sqrt((Number(monto) || 0) / maxMonto)
    return mode === "calor" ? 10 + ratio * 34 : 6 + ratio * 18
  }

  return (
    <section aria-label="Mapa de inversión" className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">Mapa de inversión</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Tocá un punto para ver el detalle del municipio. El tamaño refleja el monto invertido.
          </p>
        </div>

        <div className="flex gap-2" role="group" aria-label="Modo de visualización">
          <Button
            type="button"
            size="sm"
            variant={mode === "calor" ? "default" : "outline"}
            onClick={() => setMode("calor")}
            className={mode === "calor" ? "" : "bg-transparent"}
          >
            Mapa de calor
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === "marcadores" ? "default" : "outline"}
            onClick={() => setMode("marcadores")}
            className={mode === "marcadores" ? "" : "bg-transparent"}
          >
            Marcadores
          </Button>
        </div>
      </div>

      <div className="h-[520px] w-full overflow-hidden rounded-lg border border-border">
        <MapContainer
          center={[-32.1, -64.2]}
          zoom={7}
          scrollWheelZoom
          style={{ height: "100%", width: "100%" }}
          aria-label="Mapa de la provincia de Córdoba"
        >
          {/* Fondo gris claro de Esri: no requiere clave (CARTO empezó a mostrar "API KEY REQUIRED"). */}
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
            attribution="Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors"
            maxZoom={16}
          />
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
            maxZoom={16}
          />

          {points.map((r) => {
            const color = stageColor(r.etapa)
            const equipos = totalEquipment(r)
            const detalle = EQUIPMENT_FIELDS.filter((f) => Number(r[f.key]) > 0).map(
              (f) => [f.label, Number(r[f.key])] as const,
            )

            return (
              <CircleMarker
                key={r.id}
                center={[r.lat as number, r.lng as number]}
                radius={radiusFor(Number(r.monto))}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: mode === "calor" ? 0.4 : 0.75,
                  weight: mode === "calor" ? 0 : 1.5,
                }}
              >
                <Tooltip direction="top">{r.municipio}</Tooltip>
                <Popup>
                  <div className="flex min-w-52 flex-col gap-1.5">
                    <strong className="text-sm">{r.municipio}</strong>
                    <span className="text-xs text-neutral-600">
                      {r.departamento} · Etapa {r.etapa} ({r.anio})
                    </span>
                    {r.regional_entity ? (
                      <span className="text-xs text-neutral-600">{r.regional_entity}</span>
                    ) : null}
                    <span className="text-sm font-semibold">{formatCurrency(Number(r.monto))}</span>
                    <span className="text-xs text-neutral-600">
                      {equipos} {equipos === 1 ? "equipo" : "equipos"}
                    </span>
                    <ul className="m-0 flex list-none flex-col gap-0.5 p-0 text-xs">
                      {detalle.map(([label, qty]) => (
                        <li key={label}>
                          {label}: {qty}
                        </li>
                      ))}
                    </ul>
                  </div>
                </Popup>
              </CircleMarker>
            )
          })}
        </MapContainer>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-sm">
        <span className="flex items-center gap-2">
          <span className="size-3 rounded-full" style={{ background: STAGE_COLOR[1] }} aria-hidden="true" />
          Etapa 1 (2024)
        </span>
        <span className="flex items-center gap-2">
          <span className="size-3 rounded-full" style={{ background: STAGE_COLOR[2] }} aria-hidden="true" />
          Etapa 2 (2025)
        </span>
        <span className="text-xs text-muted-foreground">
          {points.length} de {records.length} registros tienen coordenadas cargadas
        </span>
      </div>
    </section>
  )
}

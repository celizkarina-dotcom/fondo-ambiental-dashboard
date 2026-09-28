"use client"

import { useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { EQUIPMENT_FIELDS, formatCurrency, type FundRecord } from "@/lib/fondo-ambiental/types"

/** Vehículos, maquinaria y contenedores: lo que el área necesita ver por localidad. */
const VEHICLE_KEYS = [
  "camion_compactador",
  "camion_reciclaje",
  "camion_volcador",
  "compactador",
  "moto_carga",
  "autoelevador",
  "topadora",
  "pala_cargadora",
  "retroexcavadora",
  "bateas_roll_off",
  "caja_abierta",
] as const

const VEHICLE_FIELDS = VEHICLE_KEYS.map((key) => EQUIPMENT_FIELDS.find((f) => f.key === key)!)

export function VehiclesPanel({ records }: { records: FundRecord[] }) {
  const rows = useMemo(
    () =>
      records
        .filter((r) => VEHICLE_FIELDS.some((f) => Number(r[f.key]) > 0))
        .sort(
          (a, b) =>
            a.departamento.localeCompare(b.departamento, "es") ||
            (a.municipio || a.regional_entity || "").localeCompare(b.municipio || b.regional_entity || "", "es"),
        ),
    [records],
  )

  const totals = useMemo(
    () =>
      VEHICLE_FIELDS.map((f) => ({
        label: f.label,
        cantidad: rows.reduce((sum, r) => sum + (Number(r[f.key]) || 0), 0),
      }))
        .filter((t) => t.cantidad > 0)
        .sort((a, b) => b.cantidad - a.cantidad),
    [rows],
  )

  return (
    <section aria-label="Vehículos por localidad" className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">Vehículos, maquinaria y contenedores por localidad</h2>
        <p className="text-sm text-muted-foreground">
          Qué tipo de vehículo recibió cada localidad o ente, tal como figura en la base.
        </p>
      </div>

      {totals.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {totals.map((t) => (
            <Badge key={t.label} variant="secondary" className="font-normal tabular-nums">
              {t.label} {t.cantidad}
            </Badge>
          ))}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Localidad / ente</th>
              <th className="px-3 py-2">Departamento</th>
              <th className="px-3 py-2">Vehículos y maquinaria</th>
              <th className="px-3 py-2 text-center">Etapa</th>
              <th className="px-3 py-2 text-right">Monto del registro</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-muted-foreground">
                  No hay vehículos con los filtros actuales.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-border align-top">
                  <td className="px-3 py-2 font-medium">
                    {r.municipio || r.regional_entity}
                    {r.municipio && r.regional_entity ? (
                      <div className="text-xs font-normal text-muted-foreground">{r.regional_entity}</div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{r.departamento}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1.5">
                      {VEHICLE_FIELDS.filter((f) => Number(r[f.key]) > 0).map((f) => (
                        <Badge key={f.key} variant="secondary" className="font-normal tabular-nums">
                          {f.label} {Number(r[f.key])}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center tabular-nums">{r.etapa}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{formatCurrency(Number(r.monto))}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-sm text-muted-foreground">
        {rows.length} {rows.length === 1 ? "registro" : "registros"} con vehículos, maquinaria o contenedores.
      </p>
    </section>
  )
}

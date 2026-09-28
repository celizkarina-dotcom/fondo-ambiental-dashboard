"use client"

import { useMemo } from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { EQUIPMENT_FIELDS, totalEquipment, type FundRecord } from "@/lib/fondo-ambiental/types"

export function EquipmentPanel({ records }: { records: FundRecord[] }) {
  const byType = useMemo(
    () =>
      EQUIPMENT_FIELDS.map((field) => ({
        tipo: field.label,
        cantidad: records.reduce((sum, r) => sum + (Number(r[field.key]) || 0), 0),
      }))
        .filter((d) => d.cantidad > 0)
        .sort((a, b) => b.cantidad - a.cantidad),
    [records],
  )

  const byDepartment = useMemo(() => {
    const totals = new Map<string, number>()

    for (const r of records) {
      totals.set(r.departamento, (totals.get(r.departamento) ?? 0) + totalEquipment(r))
    }

    return Array.from(totals, ([departamento, cantidad]) => ({ departamento, cantidad }))
      .filter((d) => d.cantidad > 0)
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 12)
  }, [records])

  const totalUnits = byType.reduce((sum, d) => sum + d.cantidad, 0)

  return (
    <section aria-label="Equipamiento" className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">Equipamiento por tipo</h2>
          <p className="text-sm text-muted-foreground">{totalUnits.toLocaleString("es-AR")} unidades entregadas</p>
        </div>

        {/* Cada tipo lleva su propia fila para que se lean todas las etiquetas (camiones incluidos). */}
        <ChartContainer
          config={{ cantidad: { label: "Unidades", color: "var(--chart-2)" } }}
          className="w-full"
          style={{ height: Math.max(340, byType.length * 26 + 40) }}
        >
          <BarChart data={byType} layout="vertical" margin={{ left: 8, right: 24 }}>
            <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="tipo"
              width={170}
              interval={0}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
            />
            <ChartTooltip content={<ChartTooltipContent />} cursor={{ fill: "var(--color-muted)" }} />
            <Bar dataKey="cantidad" fill="var(--color-chart-2)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ChartContainer>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">Equipos por departamento</h2>
          <p className="text-sm text-muted-foreground">Los 12 departamentos con más unidades</p>
        </div>

        <ChartContainer
          config={{ cantidad: { label: "Unidades", color: "var(--chart-1)" } }}
          className="h-[340px] w-full"
        >
          <BarChart data={byDepartment} margin={{ left: 4, right: 8, bottom: 60 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="departamento"
              tickLine={false}
              axisLine={false}
              angle={-45}
              textAnchor="end"
              interval={0}
              height={70}
              tick={{ fontSize: 10 }}
            />
            <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={32} />
            <ChartTooltip content={<ChartTooltipContent />} cursor={{ fill: "var(--color-muted)" }} />
            <Bar dataKey="cantidad" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </div>
    </section>
  )
}

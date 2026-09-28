"use client"

import { useMemo } from "react"
import { Bar, BarChart, Cell, Pie, PieChart, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { formatCompact, formatCurrency, type FundRecord } from "@/lib/fondo-ambiental/types"

const SLICE_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
  "var(--color-primary)",
]

export function InvestmentPanel({ records }: { records: FundRecord[] }) {
  const byDepartment = useMemo(() => {
    const totals = new Map<string, number>()

    for (const r of records) {
      totals.set(r.departamento, (totals.get(r.departamento) ?? 0) + Number(r.monto || 0))
    }

    return Array.from(totals, ([departamento, monto]) => ({ departamento, monto })).sort((a, b) => b.monto - a.monto)
  }, [records])

  const top10 = byDepartment.slice(0, 10)

  // Las porciones chicas se agrupan para que la torta siga siendo legible.
  const donut = useMemo(() => {
    const top5 = byDepartment.slice(0, 5)
    const restTotal = byDepartment.slice(5).reduce((sum, d) => sum + d.monto, 0)

    return restTotal > 0 ? [...top5, { departamento: "Otros", monto: restTotal }] : top5
  }, [byDepartment])

  const total = byDepartment.reduce((sum, d) => sum + d.monto, 0)

  return (
    <section aria-label="Inversión" className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">Inversión por departamento</h2>
          <p className="text-sm text-muted-foreground">Los 10 departamentos con mayor monto</p>
        </div>

        <ChartContainer config={{ monto: { label: "Monto", color: "var(--chart-1)" } }} className="h-[380px] w-full">
          <BarChart data={top10} layout="vertical" margin={{ left: 8, right: 16 }}>
            <XAxis type="number" tickFormatter={(v) => formatCompact(Number(v))} tickLine={false} axisLine={false} />
            <YAxis
              type="category"
              dataKey="departamento"
              width={130}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
            />
            <ChartTooltip
              content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />}
              cursor={{ fill: "var(--color-muted)" }}
            />
            <Bar dataKey="monto" fill="var(--color-chart-1)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ChartContainer>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">Distribución de la inversión</h2>
          <p className="text-sm text-muted-foreground">
            Participación sobre {formatCompact(total)} en {byDepartment.length} departamentos
          </p>
        </div>

        <ChartContainer config={{ monto: { label: "Monto" } }} className="h-[300px] w-full">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} />
            <Pie data={donut} dataKey="monto" nameKey="departamento" innerRadius={65} outerRadius={110} strokeWidth={2}>
              {donut.map((entry, index) => (
                <Cell key={entry.departamento} fill={SLICE_COLORS[index % SLICE_COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>

        <ul className="flex flex-col gap-2">
          {donut.map((entry, index) => (
            <li key={entry.departamento} className="flex items-center justify-between gap-3 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ background: SLICE_COLORS[index % SLICE_COLORS.length] }}
                  aria-hidden="true"
                />
                <span className="truncate">{entry.departamento}</span>
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {total > 0 ? ((entry.monto / total) * 100).toFixed(1) : "0.0"}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

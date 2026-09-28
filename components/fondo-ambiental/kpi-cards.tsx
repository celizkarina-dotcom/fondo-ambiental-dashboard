"use client"

import { useMemo } from "react"
import { Building2, DollarSign, Map, Package } from "lucide-react"
import { formatMillions, totalEquipment, type FundRecord } from "@/lib/fondo-ambiental/types"

export function KpiCards({ records }: { records: FundRecord[] }) {
  const stats = useMemo(() => {
    const municipios = new Set(records.map((r) => r.municipio).filter(Boolean)).size
    const departamentos = new Set(records.map((r) => r.departamento)).size
    const monto = records.reduce((sum, r) => sum + Number(r.monto || 0), 0)
    const equipos = records.reduce((sum, r) => sum + totalEquipment(r), 0)

    return { municipios, departamentos, monto, equipos }
  }, [records])

  const cards = [
    {
      label: "Total municipios",
      value: stats.municipios.toLocaleString("es-AR"),
      icon: Building2,
      bg: "bg-gradient-to-br from-blue-500 to-blue-700",
    },
    {
      label: "Total departamentos",
      value: stats.departamentos.toLocaleString("es-AR"),
      icon: Map,
      bg: "bg-gradient-to-br from-teal-500 to-emerald-700",
    },
    {
      label: "Monto total invertido",
      value: `$${formatMillions(stats.monto)}`,
      hint: "millones en equipamiento",
      icon: DollarSign,
      bg: "bg-gradient-to-br from-amber-500 to-orange-600",
    },
    {
      label: "Equipos entregados",
      value: stats.equipos.toLocaleString("es-AR"),
      hint: "unidades",
      icon: Package,
      bg: "bg-gradient-to-br from-violet-500 to-purple-700",
    },
  ]

  return (
    <section aria-label="Indicadores principales" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map(({ label, value, hint, icon: Icon, bg }) => (
        <div key={label} className={`flex flex-col gap-3 rounded-xl p-5 text-white shadow-sm ${bg}`}>
          <div className="flex items-start justify-between gap-3">
            <span className="text-sm font-medium leading-relaxed text-white/90">{label}</span>
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/20">
              <Icon className="size-4" aria-hidden="true" />
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-3xl font-bold tracking-tight tabular-nums">{value}</span>
            {hint ? <span className="text-xs text-white/80">{hint}</span> : null}
          </div>
        </div>
      ))}
    </section>
  )
}

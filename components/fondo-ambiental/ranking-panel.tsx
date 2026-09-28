"use client"

import { useMemo } from "react"
import { formatCurrency, totalEquipment, type FundRecord } from "@/lib/fondo-ambiental/types"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

function RankTable({
  title,
  subtitle,
  rows,
  valueHeader,
}: {
  title: string
  subtitle: string
  rows: { municipio: string; departamento: string; value: string }[]
  valueHeader: string
}) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">#</TableHead>
            <TableHead>Localidad</TableHead>
            <TableHead>Departamento</TableHead>
            <TableHead className="text-right">{valueHeader}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow key={`${row.municipio}-${row.departamento}`}>
              <TableCell className="font-semibold tabular-nums text-muted-foreground">{index + 1}</TableCell>
              <TableCell className="font-medium">{row.municipio}</TableCell>
              <TableCell className="text-muted-foreground">{row.departamento}</TableCell>
              <TableCell className="text-right font-semibold tabular-nums">{row.value}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export function RankingPanel({ records }: { records: FundRecord[] }) {
  const byInvestment = useMemo(
    () =>
      [...records]
        .sort((a, b) => Number(b.monto) - Number(a.monto))
        .slice(0, 10)
        .map((r) => ({
          municipio: r.municipio,
          departamento: r.departamento,
          value: formatCurrency(Number(r.monto)),
        })),
    [records],
  )

  const byEquipment = useMemo(
    () =>
      [...records]
        .sort((a, b) => totalEquipment(b) - totalEquipment(a))
        .slice(0, 10)
        .map((r) => ({
          municipio: r.municipio,
          departamento: r.departamento,
          value: String(totalEquipment(r)),
        })),
    [records],
  )

  return (
    <section aria-label="Ranking" className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <RankTable
        title="Top 10 por inversión"
        subtitle="Municipios con mayor monto invertido"
        rows={byInvestment}
        valueHeader="Monto"
      />
      <RankTable
        title="Top 10 por equipamiento"
        subtitle="Municipios con mayor cantidad de equipos"
        rows={byEquipment}
        valueHeader="Equipos"
      />
    </section>
  )
}

"use client"

import { Download, Plus, RotateCcw, Search } from "lucide-react"
import { EQUIPMENT_FIELDS, type FundRecord } from "@/lib/fondo-ambiental/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RecordDialog } from "./record-dialog"

type Props = {
  dep: string
  mun: string
  regional: string
  query: string
  departments: string[]
  municipalities: string[]
  regionalEntities: string[]
  onDepChange: (value: string) => void
  onMunChange: (value: string) => void
  onRegionalChange: (value: string) => void
  onQueryChange: (value: string) => void
  onReset: () => void
  filtered: FundRecord[]
  canWrite: boolean
  departmentOptions: string[]
  municipalityOptions: string[]
  regionalEntityOptions: string[]
  allRecords: FundRecord[]
  onSaved: () => void
}

const ALL = "__todos__"

export function FiltersBar({
  dep,
  mun,
  regional,
  query,
  departments,
  municipalities,
  regionalEntities,
  onDepChange,
  onMunChange,
  onRegionalChange,
  onQueryChange,
  onReset,
  filtered,
  canWrite,
  departmentOptions,
  municipalityOptions,
  regionalEntityOptions,
  allRecords,
  onSaved,
}: Props) {
  /** Exporta lo que se ve en pantalla, en CSV con separador ; para Excel en español. */
  function downloadCsv() {
    const headers = [
      "Departamento",
      "Localidad",
      "Ente/Comunidad Regional",
      ...EQUIPMENT_FIELDS.map((f) => f.label),
      "Monto",
      "Etapa",
      "Anio",
      "Latitud",
      "Longitud",
    ]

    const rows = filtered.map((r) => {
      return [
        r.departamento,
        r.municipio,
        r.regional_entity ?? "",
        ...EQUIPMENT_FIELDS.map((f) => String(Number(r[f.key]) || 0)),
        String(Number(r.monto) || 0),
        String(r.etapa),
        String(r.anio),
        r.lat != null ? String(r.lat) : "",
        r.lng != null ? String(r.lng) : "",
      ]
    })

    const escape = (value: string) => (/[";\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value)
    const csv = [headers, ...rows].map((row) => row.map(escape).join(";")).join("\r\n")

    // El BOM evita que Excel rompa las tildes y la enie.
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")

    link.href = url
    link.download = `fondo-ambiental-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section aria-label="Filtros" className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end">
        <div className="flex min-w-44 flex-1 flex-col gap-2">
          <Label htmlFor="filtro-dep" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Departamento
          </Label>
          <Select value={dep || ALL} onValueChange={(v) => onDepChange(v === ALL ? "" : v)}>
            <SelectTrigger id="filtro-dep" className="w-full">
              <SelectValue placeholder="Todos los departamentos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos los departamentos</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex min-w-44 flex-1 flex-col gap-2">
          <Label htmlFor="filtro-mun" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Localidad
          </Label>
          <Select value={mun || ALL} onValueChange={(v) => onMunChange(v === ALL ? "" : v)}>
            <SelectTrigger id="filtro-mun" className="w-full">
              <SelectValue placeholder="Todos los municipios" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos los municipios</SelectItem>
              {municipalities.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex min-w-52 flex-1 flex-col gap-2">
          <Label htmlFor="filtro-regional" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Ente/Comunidad Regional
          </Label>
          <Select value={regional || ALL} onValueChange={(v) => onRegionalChange(v === ALL ? "" : v)}>
            <SelectTrigger id="filtro-regional" className="w-full">
              <SelectValue placeholder="Todos los entes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos los entes</SelectItem>
              {regionalEntities.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex min-w-52 flex-1 flex-col gap-2">
          <Label
            htmlFor="filtro-buscar"
            className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            Buscar
          </Label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="filtro-buscar"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Buscar localidad o departamento"
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" onClick={onReset} className="gap-2 bg-transparent">
            <RotateCcw className="size-4" aria-hidden="true" />
            Restablecer
          </Button>

          <Button type="button" variant="outline" onClick={downloadCsv} className="gap-2 bg-transparent">
            <Download className="size-4" aria-hidden="true" />
            Descargar
          </Button>

          {canWrite ? (
            <RecordDialog
              departmentOptions={departmentOptions}
              municipalityOptions={municipalityOptions}
              regionalEntityOptions={regionalEntityOptions}
              allRecords={allRecords}
              onSaved={onSaved}
              trigger={
                <Button type="button" className="gap-2">
                  <Plus className="size-4" aria-hidden="true" />
                  Nuevo registro
                </Button>
              }
            />
          ) : null}
        </div>
      </div>
    </section>
  )
}

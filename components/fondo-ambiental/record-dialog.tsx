"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import { Loader2 } from "lucide-react"
import { createRecord, updateRecord } from "@/lib/fondo-ambiental/actions"
import { EQUIPMENT_FIELDS, type FundRecord } from "@/lib/fondo-ambiental/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

/** Mayúsculas, sin tildes ni espacios sobrantes: para comparar nombres. */
function normalizeName(value: string | null | undefined) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase()
}

/** Igual que normalizeName, unificando las variantes conocidas de departamentos. */
function normalizeDepartment(value: string | null | undefined) {
  const name = normalizeName(value)
  if (["PTE ROQUE S PENA", "ROQUE SAENZ PENA", "PRESIDENTE ROQUE SAENZ PENA"].includes(name)) {
    return "PRESIDENTE ROQUE SAENZ PENA"
  }
  return name
}

type Props = {
  trigger: ReactNode
  record?: FundRecord
  departmentOptions: string[]
  municipalityOptions: string[]
  regionalEntityOptions: string[]
  /** Se usa para autocompletar departamento y coordenadas al escribir una localidad conocida. */
  allRecords: FundRecord[]
  onSaved: () => void
}

export function RecordDialog({
  trigger,
  record,
  departmentOptions,
  municipalityOptions,
  regionalEntityOptions,
  allRecords,
  onSaved,
}: Props) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [departamento, setDepartamento] = useState(record?.departamento ?? "")
  const [municipio, setMunicipio] = useState(record?.municipio ?? "")
  const [regionalEntity, setRegionalEntity] = useState(record?.regional_entity ?? "")
  const [lat, setLat] = useState(record?.lat != null ? String(record.lat) : "")
  const [lng, setLng] = useState(record?.lng != null ? String(record.lng) : "")

  const isEdit = Boolean(record)

  // Indice por localidad para completar departamento y coordenadas automaticamente.
  // Cada localidad pertenece a un solo departamento.
  const byMunicipality = useMemo(() => {
    const map = new Map<string, FundRecord>()
    for (const r of allRecords) {
      const key = normalizeName(r.municipio)
      if (key && !map.has(key)) map.set(key, r)
    }
    return map
  }, [allRecords])

  // Si ya se eligió un departamento conocido, la lista sugiere solo sus localidades.
  const suggestedMunicipalities = useMemo(() => {
    const dep = normalizeDepartment(departamento)
    const known = allRecords.some((r) => normalizeDepartment(r.departamento) === dep)
    if (!dep || !known) return municipalityOptions
    return municipalityOptions.filter((m) => {
      const match = byMunicipality.get(normalizeName(m))
      return !match || normalizeDepartment(match.departamento) === dep
    })
  }, [departamento, allRecords, municipalityOptions, byMunicipality])

  /** Devuelve el departamento correcto si la localidad ya existe en otro departamento. */
  function departmentConflict(): string | null {
    const key = normalizeName(municipio)
    if (!key) return null
    const other = allRecords.find(
      (r) =>
        r.id !== record?.id &&
        normalizeName(r.municipio) === key &&
        normalizeDepartment(r.departamento) !== normalizeDepartment(departamento),
    )
    return other ? other.departamento : null
  }

  useEffect(() => {
    if (!open) return
    setError(null)
    setDepartamento(record?.departamento ?? "")
    setMunicipio(record?.municipio ?? "")
    setRegionalEntity(record?.regional_entity ?? "")
    setLat(record?.lat != null ? String(record.lat) : "")
    setLng(record?.lng != null ? String(record.lng) : "")
  }, [open, record])

  function handleMunicipioChange(value: string) {
    setMunicipio(value)

    const match = byMunicipality.get(normalizeName(value))
    if (!match) return

    // El departamento se fija siempre con el de la localidad (no puede ser otro).
    setDepartamento(match.departamento)
    // El resto se completa solo si todavia no se cargo.
    if (!regionalEntity && match.regional_entity) setRegionalEntity(match.regional_entity)
    if (!lat && match.lat != null) setLat(String(match.lat))
    if (!lng && match.lng != null) setLng(String(match.lng))
  }

  async function handleSubmit(formData: FormData) {
    const correctDepartment = departmentConflict()
    if (correctDepartment) {
      setError(
        `La localidad ${municipio.trim().toUpperCase()} pertenece al departamento ${correctDepartment}. Corregí el departamento o la localidad.`,
      )
      return
    }

    setPending(true)
    setError(null)

    const result = record ? await updateRecord(record.id, formData) : await createRecord(formData)

    setPending(false)

    if (!result.ok) {
      setError(result.error ?? "No pudimos guardar el registro.")
      return
    }

    setOpen(false)
    onSaved()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>

      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar registro" : "Nuevo registro"}</DialogTitle>
          <DialogDescription className="leading-relaxed">
            {isEdit
              ? "Los cambios quedan registrados en la auditoría con tu usuario y la fecha."
              : "Al escribir una localidad ya cargada, se completan el departamento y las coordenadas."}
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="departamento">Departamento</Label>
              <Input
                id="departamento"
                name="departamento"
                list="fa-departamentos"
                value={departamento}
                onChange={(e) => setDepartamento(e.target.value)}
                placeholder="COLON"
                required
                autoComplete="off"
              />
              <datalist id="fa-departamentos">
                {departmentOptions.map((d) => (
                  <option key={d} value={d} />
                ))}
              </datalist>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="municipio">Localidad</Label>
              <Input
                id="municipio"
                name="municipio"
                list="fa-municipios"
                value={municipio}
                onChange={(e) => handleMunicipioChange(e.target.value)}
                placeholder="VILLA ALLENDE"
                autoComplete="off"
              />
              <datalist id="fa-municipios">
                {suggestedMunicipalities.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="regional_entity">Ente/Comunidad Regional</Label>
              <Input
                id="regional_entity"
                name="regional_entity"
                list="fa-entes-regionales"
                value={regionalEntity}
                onChange={(e) => setRegionalEntity(e.target.value)}
                placeholder="COMUNIDAD REGIONAL"
                autoComplete="off"
              />
              <datalist id="fa-entes-regionales">
                {regionalEntityOptions.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </div>
          </div>

          <p className="-mt-2 text-xs leading-relaxed text-muted-foreground">
            Completá una localidad o un Ente/Comunidad Regional. El departamento siempre es obligatorio.
          </p>

          <fieldset className="flex flex-col gap-3">
            <legend className="text-sm font-semibold">Equipamiento entregado</legend>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {EQUIPMENT_FIELDS.map(({ key, label }) => (
                <div key={key} className="flex flex-col gap-2">
                  <Label htmlFor={key} className="text-xs font-normal text-muted-foreground">
                    {label}
                  </Label>
                  <Input
                    id={key}
                    name={key}
                    type="number"
                    min={0}
                    step={1}
                    defaultValue={record ? Number(record[key]) || 0 : 0}
                    className="tabular-nums"
                  />
                </div>
              ))}
            </div>
          </fieldset>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="monto">Monto invertido (ARS)</Label>
              <Input
                id="monto"
                name="monto"
                type="number"
                min={0}
                step="0.01"
                defaultValue={record ? Number(record.monto) : 0}
                className="tabular-nums"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="etapa">Etapa</Label>
              <Input
                id="etapa"
                name="etapa"
                type="number"
                min={1}
                step={1}
                defaultValue={record?.etapa ?? 2}
                className="tabular-nums"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="anio">Año</Label>
              <Input
                id="anio"
                name="anio"
                type="number"
                min={2000}
                max={2100}
                step={1}
                defaultValue={record?.anio ?? new Date().getFullYear()}
                className="tabular-nums"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="lat">Latitud</Label>
              <Input
                id="lat"
                name="lat"
                type="number"
                step="any"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="-31.29"
                className="tabular-nums"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="lng">Longitud</Label>
              <Input
                id="lng"
                name="lng"
                type="number"
                step="any"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                placeholder="-64.29"
                className="tabular-nums"
              />
            </div>
          </div>

          {error ? (
            <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm leading-relaxed text-destructive">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="bg-transparent">
              Cancelar
            </Button>
            <Button type="submit" disabled={pending} className="gap-2">
              {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
              {isEdit ? "Guardar cambios" : "Crear registro"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

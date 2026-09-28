"use client"

import { useState } from "react"
import { Pencil, Trash2 } from "lucide-react"
import { deleteRecord } from "@/lib/fondo-ambiental/actions"
import { EQUIPMENT_FIELDS, formatCurrency, type FundRecord } from "@/lib/fondo-ambiental/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { RecordDialog } from "./record-dialog"

type Props = {
  records: FundRecord[]
  canWrite: boolean
  departmentOptions: string[]
  municipalityOptions: string[]
  regionalEntityOptions: string[]
  allRecords: FundRecord[]
  onSaved: () => void
}

export function ManagementPanel({
  records,
  canWrite,
  departmentOptions,
  municipalityOptions,
  regionalEntityOptions,
  allRecords,
  onSaved,
}: Props) {
  const [target, setTarget] = useState<FundRecord | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function confirmDelete() {
    if (!target) return

    setPending(true)
    const result = await deleteRecord(target.id)
    setPending(false)

    if (!result.ok) {
      setError(result.error ?? "No pudimos eliminar el registro.")
      return
    }

    setTarget(null)
    setError(null)
    onSaved()
  }

  return (
    <section aria-label="Gestión de registros" className="flex flex-col gap-4">
      {!canWrite ? (
        <p className="rounded-lg bg-secondary px-4 py-3 text-sm leading-relaxed text-secondary-foreground">
          Tu cuenta es de solo lectura. Podés consultar y descargar los datos, pero no editarlos.
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="rounded-lg bg-destructive/10 px-4 py-3 text-sm leading-relaxed text-destructive">
          {error}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">#</TableHead>
              <TableHead className="min-w-36">Departamento</TableHead>
              <TableHead className="min-w-36">Localidad</TableHead>
              <TableHead className="min-w-44">Ente/Comunidad Regional</TableHead>
              <TableHead className="min-w-64">Equipamiento</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead className="text-center">Etapa</TableHead>
              <TableHead className="text-center">Año</TableHead>
              {canWrite ? <TableHead className="text-center">Acciones</TableHead> : null}
            </TableRow>
          </TableHeader>

          <TableBody>
            {records.map((record, index) => (
              <TableRow key={record.id}>
                <TableCell className="tabular-nums text-muted-foreground">{index + 1}</TableCell>
                <TableCell className="text-muted-foreground">{record.departamento}</TableCell>
                <TableCell className="font-medium">{record.municipio}</TableCell>
                <TableCell className="text-muted-foreground">{record.regional_entity ?? "—"}</TableCell>

                <TableCell>
                  {(() => {
                    const entries = EQUIPMENT_FIELDS.filter((f) => Number(record[f.key]) > 0).map(
                      (f) => [f.label, Number(record[f.key])] as const,
                    )
                    if (entries.length === 0) return <span className="text-muted-foreground/40">–</span>
                    return (
                      <div className="flex flex-wrap gap-1.5">
                        {entries.map(([label, qty]) => (
                          <Badge key={label} variant="secondary" className="font-normal tabular-nums">
                            {label} {qty}
                          </Badge>
                        ))}
                      </div>
                    )
                  })()}
                </TableCell>

                <TableCell className="whitespace-nowrap text-right font-semibold tabular-nums">
                  {formatCurrency(Number(record.monto))}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant={record.etapa === 1 ? "secondary" : "default"} className="font-normal">
                    {record.etapa}
                  </Badge>
                </TableCell>
                <TableCell className="text-center tabular-nums">{record.anio}</TableCell>

                {canWrite ? (
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      <RecordDialog
                        record={record}
                        departmentOptions={departmentOptions}
                        municipalityOptions={municipalityOptions}
                        regionalEntityOptions={regionalEntityOptions}
                        allRecords={allRecords}
                        onSaved={onSaved}
                        trigger={
                          <Button type="button" variant="ghost" size="icon" aria-label={`Editar ${record.municipio}`}>
                            <Pencil className="size-4" aria-hidden="true" />
                          </Button>
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setTarget(record)}
                        aria-label={`Eliminar ${record.municipio}`}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <p className="text-sm text-muted-foreground">
        {records.length} {records.length === 1 ? "registro" : "registros"} en la vista actual
      </p>

      <AlertDialog open={target !== null} onOpenChange={(open) => !open && setTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{`¿Eliminar ${target?.municipio ?? ""}?`}</AlertDialogTitle>
            <AlertDialogDescription className="leading-relaxed">
              El registro sale del tablero pero queda guardado en la auditoría, así que un administrador puede
              restaurarlo si hizo falta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void confirmDelete()
              }}
              disabled={pending}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {pending ? "Eliminando" : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}

"use client"

import { useState } from "react"
import { RotateCcw, Trash2, UserPlus } from "lucide-react"
import { createTeamUser, deleteTeamUser, restoreRecord, updateUserRole } from "@/lib/fondo-ambiental/actions"
import type { AuditEntry, Profile, Role } from "@/lib/fondo-ambiental/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const ACTION_LABEL: Record<string, string> = {
  INSERT: "Alta",
  UPDATE: "Edición",
  DELETE: "Eliminación",
  DELETE_HARD: "Borrado definitivo",
  RESTORE: "Restauración",
}

const ROLE_LABEL: Record<Role, string> = {
  admin: "Administrador",
  editor: "Editor",
  viewer: "Solo lectura",
}

type Props = {
  role: Role
  users: Profile[]
  audit: AuditEntry[]
  currentUserId: string
  deletedIds: string[]
  onChanged: () => void | Promise<void>
}

export function AdminPanel({ role, users, audit, currentUserId, deletedIds, onChanged }: Props) {
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  async function handleRoleChange(userId: string, nextRole: Role) {
    setBusy(userId)
    const result = await updateUserRole(userId, nextRole)
    setBusy(null)

    setMessage(
      result.ok
        ? { kind: "ok", text: "Permiso actualizado." }
        : { kind: "error", text: result.error ?? "No pudimos actualizar el permiso." },
    )
    if (result.ok) await onChanged()
  }

  async function handleRestore(recordId: string) {
    setBusy(recordId)
    const result = await restoreRecord(recordId)
    setBusy(null)

    setMessage(
      result.ok
        ? { kind: "ok", text: "Registro restaurado." }
        : { kind: "error", text: result.error ?? "No pudimos restaurar el registro." },
    )
    if (result.ok) await onChanged()
  }

  async function handleCreateUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)

    setCreating(true)
    const result = await createTeamUser(data)
    setCreating(false)

    if (result.ok) {
      const email = String(data.get("email") ?? "")
      setMessage({
        kind: "ok",
        text: `Cuenta creada para ${email}. Pasale la contraseña temporal para que pueda ingresar y cambiarla.`,
      })
      form.reset()
      await onChanged()
    } else {
      setMessage({ kind: "error", text: result.error ?? "No pudimos crear la cuenta." })
    }
  }

  async function handleRemoveUser(userId: string, email: string) {
    setBusy(userId)
    const result = await deleteTeamUser(userId)
    setBusy(null)

    setMessage(
      result.ok
        ? { kind: "ok", text: `Se quitó el acceso de ${email}.` }
        : { kind: "error", text: result.error ?? "No pudimos quitar la cuenta." },
    )
    if (result.ok) await onChanged()
  }

  /** Solo los registros que hoy estan dados de baja se pueden restaurar. */
  const restorable = new Set(deletedIds)

  return (
    <section aria-label="Usuarios y auditoría" className="flex flex-col gap-6">
      {message ? (
        <p
          role="status"
          className={`rounded-lg px-4 py-3 text-sm leading-relaxed ${
            message.kind === "ok" ? "bg-chart-2/10 text-chart-2" : "bg-destructive/10 text-destructive"
          }`}
        >
          {message.text}
        </p>
      ) : null}

      {role === "admin" ? (
        <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold">Usuarios y permisos</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Los editores pueden cargar y modificar registros. Los usuarios de solo lectura únicamente consultan.
            </p>
          </div>

          <form
            onSubmit={handleCreateUser}
            className="grid gap-3 rounded-lg border border-border bg-muted/40 p-4 sm:grid-cols-2 lg:grid-cols-5"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-user-name" className="text-xs font-medium uppercase tracking-wide">
                Nombre
              </Label>
              <Input id="new-user-name" name="full_name" placeholder="Nombre y apellido" autoComplete="off" />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-user-email" className="text-xs font-medium uppercase tracking-wide">
                Correo
              </Label>
              <Input
                id="new-user-email"
                name="email"
                type="email"
                required
                placeholder="nombre@cba.gov.ar"
                autoComplete="off"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-user-password" className="text-xs font-medium uppercase tracking-wide">
                Contraseña temporal
              </Label>
              <Input
                id="new-user-password"
                name="password"
                type="text"
                required
                minLength={8}
                placeholder="Mínimo 8 caracteres"
                autoComplete="off"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-user-role" className="text-xs font-medium uppercase tracking-wide">
                Permiso
              </Label>
              <select
                id="new-user-role"
                name="role"
                defaultValue="editor"
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="editor">Editor</option>
                <option value="viewer">Solo lectura</option>
                <option value="admin">Administrador</option>
              </select>
            </div>

            <div className="flex items-end">
              <Button type="submit" disabled={creating} className="w-full gap-2">
                <UserPlus className="size-4" aria-hidden="true" />
                {creating ? "Creando…" : "Dar de alta"}
              </Button>
            </div>
          </form>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Correo</TableHead>
                  <TableHead>Alta</TableHead>
                  <TableHead className="w-48">Permiso</TableHead>
                  <TableHead className="w-24 text-center">Acceso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.full_name ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString("es-AR")}
                    </TableCell>
                    <TableCell>
                      {user.id === currentUserId ? (
                        <Badge variant="secondary" className="font-normal">
                          {ROLE_LABEL[user.role]} (vos)
                        </Badge>
                      ) : (
                        <Select
                          value={user.role}
                          disabled={busy === user.id}
                          onValueChange={(value) => void handleRoleChange(user.id, value as Role)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Administrador</SelectItem>
                            <SelectItem value="editor">Editor</SelectItem>
                            <SelectItem value="viewer">Solo lectura</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {user.id === currentUserId ? (
                        <span className="text-muted-foreground/40">–</span>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={busy === user.id}
                          onClick={() => void handleRemoveUser(user.id, user.email ?? "la cuenta")}
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                          <span className="sr-only">Quitar acceso de {user.email}</span>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">Auditoría de cambios</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Últimos {audit.length} movimientos. Las eliminaciones se pueden restaurar.
          </p>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">Fecha</TableHead>
                <TableHead>Acción</TableHead>
                <TableHead>Registro</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead className="text-center">Revertir</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {audit.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    Todavía no hay movimientos registrados.
                  </TableCell>
                </TableRow>
              ) : null}

              {audit.map((entry) => {
                const data = (entry.new_data ?? entry.old_data ?? {}) as Record<string, unknown>
                const municipio = typeof data.municipio === "string" ? data.municipio : "—"
                const departamento = typeof data.departamento === "string" ? data.departamento : ""

                return (
                  <TableRow key={entry.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {new Date(entry.created_at).toLocaleString("es-AR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={entry.action.startsWith("DELETE") ? "destructive" : "secondary"}
                        className="font-normal"
                      >
                        {ACTION_LABEL[entry.action] ?? entry.action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{municipio}</span>
                      {departamento ? (
                        <span className="block text-xs text-muted-foreground">{departamento}</span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{entry.actor_email ?? "sistema"}</TableCell>
                    <TableCell className="text-center">
                      {entry.action === "DELETE" && entry.record_id && restorable.has(entry.record_id) ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={busy === entry.record_id}
                          onClick={() => void handleRestore(entry.record_id as string)}
                          className="gap-2 bg-transparent"
                        >
                          <RotateCcw className="size-3.5" aria-hidden="true" />
                          Restaurar
                        </Button>
                      ) : (
                        <span className="text-muted-foreground/40">–</span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </section>
  )
}

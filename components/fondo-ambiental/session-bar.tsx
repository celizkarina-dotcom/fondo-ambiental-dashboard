"use client"

import { LogOut } from "lucide-react"
import { signOut } from "@/lib/fondo-ambiental/actions"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { Profile, Role } from "@/lib/fondo-ambiental/types"

const ROLE_LABEL: Record<Role, string> = {
  admin: "Administrador",
  editor: "Editor",
  viewer: "Solo lectura",
}

type Props = {
  profile: Profile | null
  role: Role
  live: "connecting" | "on" | "off"
  lastSync: Date | null
}

export function SessionBar({ profile, role, live, lastSync }: Props) {
  const liveLabel =
    live === "on" ? "Sincronizado entre usuarios" : live === "connecting" ? "Conectando" : "Sin conexión en vivo"

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
          {(profile?.full_name ?? profile?.email ?? "?").slice(0, 1).toUpperCase()}
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold leading-tight">{profile?.full_name ?? profile?.email}</span>
          <span className="text-xs text-muted-foreground">{ROLE_LABEL[role]}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="outline" className="gap-2 font-normal">
          <span
            className={`size-2 rounded-full ${
              live === "on" ? "bg-chart-2" : live === "connecting" ? "animate-pulse bg-chart-4" : "bg-destructive"
            }`}
            aria-hidden="true"
          />
          {liveLabel}
        </Badge>

        {lastSync ? (
          <span className="text-xs text-muted-foreground">
            Última actualización:{" "}
            {lastSync.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </span>
        ) : null}

        <form action={() => { void signOut() }}>
          <Button type="submit" variant="outline" size="sm" className="gap-2 bg-transparent">
            <LogOut className="size-4" aria-hidden="true" />
            Salir
          </Button>
        </form>
      </div>
    </div>
  )
}

"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import dynamic from "next/dynamic"
import { BarChart3, Boxes, MapPin, Settings, Trophy, Truck, Users } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { AuditEntry, FundRecord, Profile, Role } from "@/lib/fondo-ambiental/types"
import { FiltersBar } from "./filters-bar"
import { KpiCards } from "./kpi-cards"
import { InvestmentPanel } from "./investment-panel"
import { EquipmentPanel } from "./equipment-panel"
import { VehiclesPanel } from "./vehicles-panel"
import { RankingPanel } from "./ranking-panel"
import { ManagementPanel } from "./management-panel"
import { AdminPanel } from "./admin-panel"
import { SessionBar } from "./session-bar"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"

// Leaflet toca el DOM, asi que se carga solo en el navegador.
const MapPanel = dynamic(() => import("./map-panel").then((m) => m.MapPanel), {
  ssr: false,
  loading: () => <Skeleton className="h-[520px] w-full rounded-xl" />,
})

type TabId = "mapa" | "inversion" | "equipamiento" | "vehiculos" | "ranking" | "gestion" | "admin"

type Props = {
  initialRecords: FundRecord[]
  profile: Profile | null
  role: Role
  initialAudit: AuditEntry[]
  initialUsers: Profile[]
  deletedIds: string[]
}

export function FondoAmbientalDashboard({
  initialRecords,
  profile,
  role,
  initialAudit,
  initialUsers,
  deletedIds,
}: Props) {
  const [records, setRecords] = useState<FundRecord[]>(initialRecords)
  const [audit, setAudit] = useState<AuditEntry[]>(initialAudit)
  const [deleted, setDeleted] = useState<string[]>(deletedIds)
  const [users, setUsers] = useState<Profile[]>(initialUsers)
  const [tab, setTab] = useState<TabId>("mapa")
  const [dep, setDep] = useState("")
  const [mun, setMun] = useState("")
  const [regional, setRegional] = useState("")
  const [query, setQuery] = useState("")
  const [live, setLive] = useState<"connecting" | "on" | "off">("connecting")
  const [lastSync, setLastSync] = useState<Date | null>(null)

  const canWrite = role === "admin" || role === "editor"

  /** Vuelve a leer la tabla completa: se usa tras cada cambio propio o ajeno. */
  const refresh = useCallback(async () => {
    const supabase = createClient()

    const { data, error } = await supabase
      .from("fund_records")
      .select("*")
      .is("deleted_at", null)
      .order("departamento", { ascending: true })
      .order("municipio", { ascending: true })

    if (error) {
      console.log("[v0] refresh error:", error.message)
      return
    }

    setRecords((data ?? []) as FundRecord[])
    setLastSync(new Date())

    if (canWrite) {
      const [{ data: auditData }, { data: deletedData }] = await Promise.all([
        supabase
          .from("audit_log")
          .select("id, table_name, record_id, action, actor_email, old_data, new_data, created_at")
          .order("created_at", { ascending: false })
          .limit(150),
        supabase.from("fund_records").select("id").not("deleted_at", "is", null),
      ])

      if (auditData) setAudit(auditData as AuditEntry[])
      if (deletedData) setDeleted((deletedData as { id: string }[]).map((row) => row.id))
    }

    if (role === "admin") {
      const { data: usersData } = await supabase
        .from("profiles")
        .select("id, email, full_name, role, created_at")
        .order("created_at", { ascending: true })

      if (usersData) setUsers(usersData as Profile[])
    }
  }, [canWrite, role])

  // Sincronizacion en vivo: cualquier alta, edicion o baja llega a todos los conectados.
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel("fondo-ambiental-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "fund_records" }, () => {
        void refresh()
      })
      .subscribe((status: string) => {
        if (status === "SUBSCRIBED") {
          setLive("on")
          setLastSync(new Date())
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          setLive("off")
        }
      })

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [refresh])

  const departments = useMemo(
    () => Array.from(new Set(records.map((r) => r.departamento))).sort((a, b) => a.localeCompare(b, "es")),
    [records],
  )

  const municipalities = useMemo(() => {
    const pool = dep ? records.filter((r) => r.departamento === dep) : records
    return Array.from(new Set(pool.map((r) => r.municipio).filter(Boolean))).sort((a, b) => a.localeCompare(b, "es"))
  }, [records, dep])

  const regionalEntities = useMemo(() => {
    const pool = dep ? records.filter((r) => r.departamento === dep) : records
    return Array.from(new Set(pool.map((r) => r.regional_entity).filter((value): value is string => Boolean(value))))
      .sort((a, b) => a.localeCompare(b, "es"))
  }, [records, dep])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()

    return records.filter((r) => {
      if (dep && r.departamento !== dep) return false
      if (mun && r.municipio !== mun) return false
      if (regional && r.regional_entity !== regional) return false
      if (q && !`${r.municipio} ${r.departamento} ${r.regional_entity ?? ""}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [records, dep, mun, regional, query])

  const resetFilters = useCallback(() => {
    setDep("")
    setMun("")
    setRegional("")
    setQuery("")
  }, [])

  const handleDepChange = useCallback((value: string) => {
    setDep(value)
    setMun("")
    setRegional("")
  }, [])

  const tabs: { id: TabId; label: string; icon: typeof MapPin }[] = [
    { id: "mapa", label: "Mapa interactivo", icon: MapPin },
    { id: "inversion", label: "Inversión", icon: BarChart3 },
    { id: "equipamiento", label: "Equipamiento", icon: Boxes },
    { id: "vehiculos", label: "Vehículos por localidad", icon: Truck },
    { id: "ranking", label: "Ranking", icon: Trophy },
    { id: "gestion", label: "Gestión", icon: Settings },
    ...(canWrite ? [{ id: "admin" as TabId, label: "Usuarios y auditoría", icon: Users }] : []),
  ]

  return (
    <main className="flex-1 px-4 py-6 md:px-8">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-6">
        <header className="flex flex-col gap-2 rounded-xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-balance">Fondo Ambiental</h1>
            <Badge className="gap-2 border-0 bg-emerald-100 px-3 py-1 font-medium text-emerald-800 hover:bg-emerald-100">
              <span className="size-2 rounded-full bg-emerald-500" aria-hidden="true" />
              Sincronizado
            </Badge>
          </div>
          <p className="max-w-2xl leading-relaxed text-muted-foreground">
            Equipamiento ambiental financiado por municipio y departamento. Las altas, ediciones y bajas se reflejan al
            instante para todo el equipo.
          </p>
        </header>

        <SessionBar profile={profile} role={role} live={live} lastSync={lastSync} />

        <FiltersBar
          dep={dep}
          mun={mun}
          regional={regional}
          query={query}
          departments={departments}
          municipalities={municipalities}
          regionalEntities={regionalEntities}
          onDepChange={handleDepChange}
          onMunChange={setMun}
          onRegionalChange={setRegional}
          onQueryChange={setQuery}
          onReset={resetFilters}
          filtered={filtered}
          canWrite={canWrite}
          departmentOptions={departments}
          municipalityOptions={Array.from(new Set(records.map((r) => r.municipio).filter(Boolean))).sort((a, b) =>
            a.localeCompare(b, "es"),
          )}
          regionalEntityOptions={Array.from(
            new Set(records.map((r) => r.regional_entity).filter((value): value is string => Boolean(value))),
          ).sort((a, b) => a.localeCompare(b, "es"))}
          allRecords={records}
          onSaved={refresh}
        />

        <KpiCards records={filtered} />

        <nav aria-label="Vistas del tablero" className="flex flex-wrap gap-2 border-b border-border pb-px">
          {tabs.map(({ id, label, icon: Icon }) => {
            const active = tab === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                aria-current={active ? "page" : undefined}
                className={`-mb-px flex items-center gap-2 rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="size-4" aria-hidden="true" />
                {label}
              </button>
            )
          })}
        </nav>

        {filtered.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <p className="font-medium">No hay registros que coincidan con el filtro</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Probá restablecer los filtros para ver todos los municipios.
            </p>
          </div>
        ) : null}

        {tab === "mapa" ? <MapPanel records={filtered} /> : null}
        {tab === "inversion" ? <InvestmentPanel records={filtered} /> : null}
        {tab === "equipamiento" ? <EquipmentPanel records={filtered} /> : null}
        {tab === "vehiculos" ? <VehiclesPanel records={filtered} /> : null}
        {tab === "ranking" ? <RankingPanel records={filtered} /> : null}
        {tab === "gestion" ? (
          <ManagementPanel
            records={filtered}
            canWrite={canWrite}
            departmentOptions={departments}
            municipalityOptions={Array.from(new Set(records.map((r) => r.municipio).filter(Boolean))).sort((a, b) =>
              a.localeCompare(b, "es"),
            )}
            regionalEntityOptions={Array.from(
              new Set(records.map((r) => r.regional_entity).filter((value): value is string => Boolean(value))),
            ).sort((a, b) => a.localeCompare(b, "es"))}
            allRecords={records}
            onSaved={refresh}
          />
        ) : null}
        {tab === "admin" && canWrite ? (
          <AdminPanel
            role={role}
            users={users}
            audit={audit}
            currentUserId={profile?.id ?? ""}
            deletedIds={deleted}
            onChanged={refresh}
          />
        ) : null}
      </div>
    </main>
  )
}

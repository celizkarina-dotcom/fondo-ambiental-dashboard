"use client"

import { useCallback, useEffect, useState } from "react"
import type { Session } from "@supabase/supabase-js"
import { Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { fetchRole, signOut } from "@/lib/fondo-ambiental/actions"
import type { AuditEntry, FundRecord, Profile, Role } from "@/lib/fondo-ambiental/types"
import { Button } from "@/components/ui/button"
import { FondoAmbientalDashboard } from "./dashboard"
import { LoginForm } from "./login-form"

type Loaded = {
  profile: Profile
  role: Role
  records: FundRecord[]
  audit: AuditEntry[]
  users: Profile[]
  deletedIds: string[]
}

type State =
  | { kind: "checking" }
  | { kind: "login" }
  | { kind: "loading" }
  | { kind: "no-access"; email: string }
  | { kind: "error"; message: string }
  | { kind: "ready"; data: Loaded }

function Centered({ children }: { children: React.ReactNode }) {
  return <main className="flex min-h-svh items-center justify-center bg-muted/40 p-4">{children}</main>
}

export function AppGate() {
  const [state, setState] = useState<State>({ kind: "checking" })

  const load = useCallback(async (session: Session | null) => {
    if (!session) {
      setState({ kind: "login" })
      return
    }
    setState({ kind: "loading" })

    const supabase = createClient()
    const user = session.user

    try {
      const { data: profileRow } = await supabase
        .from("profiles")
        .select("id, email, full_name, role, created_at")
        .eq("id", user.id)
        .maybeSingle()

      const role = (profileRow?.role as Role | undefined) ?? (await fetchRole(user.id, user.email))
      if (!role) {
        setState({ kind: "no-access", email: user.email ?? "" })
        return
      }
      const canWrite = role === "admin" || role === "editor"

      const [records, audit, deleted, users] = await Promise.all([
        supabase
          .from("fund_records")
          .select("*")
          .is("deleted_at", null)
          .order("departamento", { ascending: true })
          .order("municipio", { ascending: true }),
        canWrite
          ? supabase
              .from("audit_log")
              .select("id, table_name, record_id, action, actor_email, old_data, new_data, created_at")
              .order("created_at", { ascending: false })
              .limit(150)
          : Promise.resolve({ data: [], error: null }),
        canWrite
          ? supabase.from("fund_records").select("id").not("deleted_at", "is", null)
          : Promise.resolve({ data: [], error: null }),
        role === "admin"
          ? supabase.from("profiles").select("id, email, full_name, role, created_at").order("created_at", { ascending: true })
          : Promise.resolve({ data: [], error: null }),
      ])

      if (records.error) throw new Error(records.error.message)

      setState({
        kind: "ready",
        data: {
          role,
          profile: {
            id: user.id,
            email: profileRow?.email ?? user.email ?? "",
            full_name: profileRow?.full_name ?? (user.user_metadata?.full_name as string | undefined) ?? null,
            role,
            created_at: profileRow?.created_at ?? user.created_at ?? new Date().toISOString(),
          },
          records: (records.data ?? []) as FundRecord[],
          audit: (audit.data ?? []) as AuditEntry[],
          users: (users.data ?? []) as Profile[],
          deletedIds: ((deleted.data ?? []) as { id: string }[]).map((row) => row.id),
        },
      })
    } catch (e) {
      console.error("[fondo-ambiental] carga inicial:", e instanceof Error ? e.message : e)
      setState({ kind: "error", message: "No se pudo abrir la base compartida del Fondo Ambiental." })
    }
  }, [])

  useEffect(() => {
    const supabase = createClient()
    let current: string | null = null

    supabase.auth.getSession().then(({ data }) => {
      current = data.session?.user.id ?? null
      void load(data.session)
    })

    // Reacciona solo al ingresar o salir; la renovación del token no recarga el tablero.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user.id !== current) {
        current = session?.user.id ?? null
        void load(session)
      } else if (event === "SIGNED_OUT") {
        current = null
        setState({ kind: "login" })
      }
    })
    return () => sub.subscription.unsubscribe()
  }, [load])

  if (state.kind === "checking" || state.kind === "loading") {
    return (
      <Centered>
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          {state.kind === "checking" ? "Abriendo el Fondo Ambiental" : "Cargando registros"}
        </p>
      </Centered>
    )
  }

  if (state.kind === "login") {
    return (
      <Centered>
        <div className="w-full max-w-sm">
          <LoginForm />
        </div>
      </Centered>
    )
  }

  if (state.kind === "no-access" || state.kind === "error") {
    return (
      <Centered>
        <div className="flex w-full max-w-sm flex-col gap-4 rounded-xl border border-border bg-card p-6 text-sm leading-relaxed">
          <p className="font-semibold">
            {state.kind === "no-access" ? "Tu cuenta no tiene acceso al Fondo Ambiental" : "No pudimos abrir el tablero"}
          </p>
          <p className="text-muted-foreground">
            {state.kind === "no-access"
              ? `Ingresaste como ${state.email}. Pedile a un administrador del panel que te dé permiso.`
              : `${state.message} Revisá tu conexión y volvé a intentar.`}
          </p>
          <Button type="button" variant="outline" onClick={() => void signOut()}>
            Ingresar con otra cuenta
          </Button>
        </div>
      </Centered>
    )
  }

  const { data } = state
  return (
    <FondoAmbientalDashboard
      initialRecords={data.records}
      profile={data.profile}
      role={data.role}
      initialAudit={data.audit}
      initialUsers={data.users}
      deletedIds={data.deletedIds}
    />
  )
}

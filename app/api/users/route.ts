import { NextResponse, type NextRequest } from "next/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { createAdminClient } from "@/lib/supabase/admin"
import type { Role } from "@/lib/fondo-ambiental/types"

export const dynamic = "force-dynamic"

const ROLES: Role[] = ["admin", "editor", "viewer"]

function fail(error: string, status = 200) {
  return NextResponse.json({ ok: false, error }, { status })
}

/** Cliente que actúa con la sesión de quien llama (respeta las políticas RLS). */
function userClient(token: string) {
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
}

async function requireAdmin(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (!token) return { error: "Tu sesión venció. Volvé a ingresar." } as const

  const admin = createAdminClient()
  const { data, error } = await admin.auth.getUser(token)
  if (error || !data.user) return { error: "Tu sesión venció. Volvé a ingresar." } as const

  const { data: profile } = await admin.from("profiles").select("role").eq("id", data.user.id).maybeSingle()
  if (profile?.role !== "admin") return { error: "Solo un administrador puede gestionar cuentas." } as const

  return { admin, user: data.user, supabase: userClient(token) } as const
}

export async function POST(request: NextRequest) {
  let createdUserId: string | null = null
  try {
    const access = await requireAdmin(request)
    if ("error" in access) return fail(access.error!)
    const { admin, supabase } = access

    const body = await request.json().catch(() => ({}))
    const email = String(body.email ?? "").trim().toLowerCase()
    const fullName = String(body.full_name ?? "").trim()
    const password = String(body.password ?? "")
    const role = String(body.role ?? "viewer") as Role

    if (!email.includes("@")) return fail("Ingresá un correo válido.")
    if (password.length < 8) return fail("La contraseña temporal debe tener al menos 8 caracteres.")
    if (!ROLES.includes(role)) return fail("Rol inválido.")

    const displayName = fullName || email.split("@")[0]
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: displayName },
    })

    if (error || !data.user) {
      if (error?.message?.toLowerCase().includes("already")) return fail("Ese correo ya tiene una cuenta en el panel.")
      return fail("No pudimos crear la cuenta. Intentá de nuevo.")
    }
    createdUserId = data.user.id

    // El rol se asigna con la sesión de la administradora, como en el panel.
    const { data: updated, error: profileError } = await supabase
      .from("profiles")
      .update({ full_name: displayName, role })
      .eq("id", createdUserId)
      .select("id")
      .maybeSingle()

    if (profileError || !updated) {
      await admin.auth.admin.deleteUser(createdUserId)
      return fail("No pudimos asignar el permiso a la nueva cuenta.")
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("[fondo-ambiental] POST /api/users:", e instanceof Error ? e.message : e)
    if (createdUserId) {
      try {
        await createAdminClient().auth.admin.deleteUser(createdUserId)
      } catch {}
    }
    return fail("No pudimos crear la cuenta. Reintentá en unos segundos.")
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const access = await requireAdmin(request)
    if ("error" in access) return fail(access.error!)
    const { user, supabase } = access

    const body = await request.json().catch(() => ({}))
    const userId = String(body.userId ?? "")
    const role = String(body.role ?? "") as Role
    if (!userId) return fail("Falta el usuario.")
    if (userId === user.id) return fail("No podés cambiar tu propio rol.")
    if (!ROLES.includes(role)) return fail("Rol inválido.")

    const { data, error } = await supabase.from("profiles").update({ role }).eq("id", userId).select("id").maybeSingle()
    if (error || !data) return fail("No pudimos actualizar el permiso.")
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("[fondo-ambiental] PATCH /api/users:", e instanceof Error ? e.message : e)
    return fail("No pudimos actualizar el permiso.")
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const access = await requireAdmin(request)
    if ("error" in access) return fail(access.error!)
    const { admin, user } = access

    const body = await request.json().catch(() => ({}))
    const userId = String(body.userId ?? "")
    if (!userId) return fail("Falta el usuario.")
    if (userId === user.id) return fail("No podés quitar tu propia cuenta.")

    const { error } = await admin.auth.admin.deleteUser(userId)
    if (error) return fail("No pudimos quitar la cuenta.")
    await admin.from("profiles").delete().eq("id", userId)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("[fondo-ambiental] DELETE /api/users:", e instanceof Error ? e.message : e)
    return fail("No pudimos quitar la cuenta.")
  }
}

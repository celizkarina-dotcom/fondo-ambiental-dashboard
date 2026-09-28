import { createClient } from "@/lib/supabase/client"
import { EQUIPMENT_FIELDS, type Role } from "./types"

export type ActionResult = { ok: boolean; error?: string }

const SESSION_EXPIRED = "Tu sesión venció. Volvé a ingresar."
const READ_ONLY = "Tu cuenta es de solo lectura. Pedile a un administrador permiso de edición."

async function currentUser() {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return { supabase, user: session?.user ?? null, token: session?.access_token ?? null }
}

/** Rol del usuario según la tabla `profiles` (la misma del panel). */
export async function fetchRole(userId: string, email?: string | null): Promise<Role | null> {
  const supabase = createClient()
  let r = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle()
  if (r.data?.role) return r.data.role as Role
  if (email) {
    r = await supabase.from("profiles").select("role").eq("email", email.trim().toLowerCase()).maybeSingle()
    if (r.data?.role) return r.data.role as Role
  }
  return null
}

function normalizeDepartment(value: FormDataEntryValue | null) {
  const department = String(value ?? "").trim().toUpperCase()
  if (department === "UNION") return "UNIÓN"
  if (["PTE ROQUE S PEÑA", "ROQUE SAENZ PEÑA", "PRESIDENTE ROQUE SAENZ PEÑA"].includes(department)) {
    return "PRESIDENTE ROQUE SÁENZ PEÑA"
  }
  return department
}

function parseForm(formData: FormData) {
  const wholeNumber = (key: string) => {
    const raw = Number(formData.get(key) ?? 0)
    return Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : 0
  }

  const monto = Number(formData.get("monto") ?? 0)
  const lat = formData.get("lat") ? Number(formData.get("lat")) : null
  const lng = formData.get("lng") ? Number(formData.get("lng")) : null

  const payload: Record<string, unknown> = {
    departamento: normalizeDepartment(formData.get("departamento")),
    municipio: String(formData.get("municipio") ?? "").trim().toUpperCase(),
    regional_entity: String(formData.get("regional_entity") ?? "").trim().toUpperCase() || null,
    monto: Number.isFinite(monto) && monto >= 0 ? monto : 0,
    etapa: wholeNumber("etapa") || 1,
    anio: wholeNumber("anio") || new Date().getFullYear(),
    lat: lat !== null && Number.isFinite(lat) ? lat : null,
    lng: lng !== null && Number.isFinite(lng) ? lng : null,
  }

  // Una columna por tipo de equipo; las columnas genéricas ya no se usan.
  for (const field of EQUIPMENT_FIELDS) payload[field.key] = wholeNumber(field.key)
  payload.vehiculo = 0
  payload.otro = 0

  return payload
}

function validateLocation(payload: Record<string, unknown>): string | null {
  if (!payload.departamento) return "El departamento es obligatorio."
  if (!payload.municipio && !payload.regional_entity) return "Completá una localidad o un Ente/Comunidad Regional."
  return null
}

async function requireEditor() {
  const { supabase, user } = await currentUser()
  if (!user) return { supabase, user: null, error: SESSION_EXPIRED }
  const role = await fetchRole(user.id, user.email)
  if (role !== "admin" && role !== "editor") return { supabase, user: null, error: READ_ONLY }
  return { supabase, user, error: null }
}

export async function createRecord(formData: FormData): Promise<ActionResult> {
  const { supabase, user, error: accessError } = await requireEditor()
  if (!user) return { ok: false, error: accessError ?? SESSION_EXPIRED }

  const payload = parseForm(formData)
  const validationError = validateLocation(payload)
  if (validationError) return { ok: false, error: validationError }

  const { error } = await supabase
    .from("fund_records")
    .insert({ ...payload, created_by: user.id, updated_by: user.id })
    .select("id")
    .single()

  if (error) {
    console.error("[fondo-ambiental] createRecord:", error.message)
    return { ok: false, error: "No pudimos guardar el registro. Intentá de nuevo." }
  }
  return { ok: true }
}

export async function updateRecord(id: string, formData: FormData): Promise<ActionResult> {
  const { supabase, user, error: accessError } = await requireEditor()
  if (!user) return { ok: false, error: accessError ?? SESSION_EXPIRED }

  const payload = parseForm(formData)
  const validationError = validateLocation(payload)
  if (validationError) return { ok: false, error: validationError }

  const { data, error } = await supabase
    .from("fund_records")
    .update({ ...payload, updated_by: user.id })
    .eq("id", id)
    .select("id")
    .maybeSingle()

  if (error || !data) {
    console.error("[fondo-ambiental] updateRecord:", error?.message ?? "Registro no disponible")
    return { ok: false, error: "No pudimos actualizar el registro. Recargá la página e intentá de nuevo." }
  }
  return { ok: true }
}

/** Baja lógica: desaparece del tablero pero queda en la auditoría. */
export async function deleteRecord(id: string): Promise<ActionResult> {
  const { supabase, user, error: accessError } = await requireEditor()
  if (!user) return { ok: false, error: accessError ?? SESSION_EXPIRED }

  const { data, error } = await supabase
    .from("fund_records")
    .update({ deleted_at: new Date().toISOString(), deleted_by: user.id, updated_by: user.id })
    .eq("id", id)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle()

  if (error || !data) {
    console.error("[fondo-ambiental] deleteRecord:", error?.message ?? "Registro no disponible")
    return { ok: false, error: "No pudimos eliminar el registro. Recargá la página e intentá de nuevo." }
  }
  return { ok: true }
}

export async function restoreRecord(id: string): Promise<ActionResult> {
  const { supabase, user, error: accessError } = await requireEditor()
  if (!user) return { ok: false, error: accessError ?? SESSION_EXPIRED }

  const { data, error } = await supabase
    .from("fund_records")
    .update({ deleted_at: null, deleted_by: null, updated_by: user.id })
    .eq("id", id)
    .not("deleted_at", "is", null)
    .select("id")
    .maybeSingle()

  if (error || !data) {
    console.error("[fondo-ambiental] restoreRecord:", error?.message ?? "Registro no disponible")
    return { ok: false, error: "No pudimos restaurar el registro." }
  }
  return { ok: true }
}

/* ---------- Usuarios: pasan por el servidor, que tiene la clave de servicio ---------- */

async function callUsersApi(method: "POST" | "PATCH" | "DELETE", body: Record<string, unknown>): Promise<ActionResult> {
  const { token } = await currentUser()
  if (!token) return { ok: false, error: SESSION_EXPIRED }
  try {
    const res = await fetch("/api/users", {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
    const data = (await res.json().catch(() => null)) as ActionResult | null
    return data ?? { ok: false, error: "No pudimos completar la operación." }
  } catch {
    return { ok: false, error: "No pudimos conectar con el servidor. Revisá tu conexión." }
  }
}

export async function createTeamUser(formData: FormData): Promise<ActionResult> {
  return callUsersApi("POST", {
    email: String(formData.get("email") ?? ""),
    full_name: String(formData.get("full_name") ?? ""),
    password: String(formData.get("password") ?? ""),
    role: String(formData.get("role") ?? "viewer"),
  })
}

export async function deleteTeamUser(userId: string): Promise<ActionResult> {
  return callUsersApi("DELETE", { userId })
}

export async function updateUserRole(userId: string, nextRole: Role): Promise<ActionResult> {
  return callUsersApi("PATCH", { userId, role: nextRole })
}

export async function signOut() {
  await createClient().auth.signOut()
  window.location.reload()
}

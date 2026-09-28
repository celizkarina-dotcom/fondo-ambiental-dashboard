export type Role = "admin" | "editor" | "viewer"

export type Profile = {
  id: string
  email: string | null
  full_name: string | null
  role: Role
  created_at: string
}

export type FundRecord = {
  id: string
  departamento: string
  municipio: string
  regional_entity: string | null
  // Equipamiento: una columna por tipo, igual que la planilla SOLICITUD MUNICIPIOS FONDO AMBIENTAL.
  chipeadora: number
  prensa: number
  peletizadora: number
  compostadora: number
  trituradora: number
  extrusora: number
  cinta: number
  infraestructura: number
  membrana: number
  topadora: number
  pala_cargadora: number
  retroexcavadora: number
  bateas_roll_off: number
  caja_abierta: number
  camion_compactador: number
  camion_volcador: number
  camion_reciclaje: number
  compactador: number
  moto_carga: number
  alambrado_perimetral: number
  balanza: number
  bascula: number
  autoelevador: number
  cicatrizacion_basural: number
  /** Columnas genéricas anteriores. Ya no se cargan ni se muestran; quedan en la base por compatibilidad. */
  vehiculo?: number
  otro?: number
  monto: number
  etapa: number
  anio: number
  lat: number | null
  lng: number | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type AuditEntry = {
  id: number
  table_name: string
  record_id: string | null
  action: string
  actor_email: string | null
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  created_at: string
}

/**
 * Tipos de equipamiento, en el mismo orden y con los mismos nombres que la planilla
 * "SOLICITUD MUNICIPIOS FONDO AMBIENTAL". Cada vehículo figura con su tipo real
 * (camión compactador, camión de reciclaje, etc.): no hay categorías "Vehículo" ni "Otro".
 */
export const EQUIPMENT_FIELDS = [
  { key: "chipeadora", label: "Chipeadora", short: "Chip." },
  { key: "prensa", label: "Prensa hidráulica", short: "Prensa" },
  { key: "peletizadora", label: "Peletizadora", short: "Pelet." },
  { key: "compostadora", label: "Compostadora", short: "Compost." },
  { key: "trituradora", label: "Trituradora", short: "Tritur." },
  { key: "extrusora", label: "Extrusora", short: "Extrus." },
  { key: "cinta", label: "Cinta transportadora", short: "Cinta" },
  { key: "infraestructura", label: "Mejoras / infraestructura", short: "Infra." },
  { key: "membrana", label: "Membrana", short: "Membr." },
  { key: "topadora", label: "Topadora", short: "Topad." },
  { key: "pala_cargadora", label: "Pala cargadora", short: "Pala carg." },
  { key: "retroexcavadora", label: "Retroexcavadora", short: "Retroexc." },
  { key: "bateas_roll_off", label: "Bateas roll off", short: "Bateas" },
  { key: "caja_abierta", label: "Caja abierta", short: "Caja ab." },
  { key: "camion_compactador", label: "Camión compactador", short: "Cam. compact." },
  { key: "camion_volcador", label: "Camión volcador de residuos", short: "Cam. volc." },
  { key: "camion_reciclaje", label: "Camión de reciclaje", short: "Cam. recicl." },
  { key: "compactador", label: "Compactador", short: "Compact." },
  { key: "moto_carga", label: "Moto carga", short: "Moto" },
  { key: "alambrado_perimetral", label: "Alambrado perimetral", short: "Alambr." },
  { key: "balanza", label: "Balanza", short: "Balanza" },
  { key: "bascula", label: "Báscula", short: "Báscula" },
  { key: "autoelevador", label: "Autoelevador", short: "Autoelev." },
  { key: "cicatrizacion_basural", label: "Cicatrización de basural", short: "Cicatr." },
] as const

export type EquipmentKey = (typeof EQUIPMENT_FIELDS)[number]["key"]

export function totalEquipment(record: FundRecord) {
  return EQUIPMENT_FIELDS.reduce((sum, field) => sum + (Number(record[field.key]) || 0), 0)
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value)
}

/** Cantidad de millones, con punto de miles como se escribe en Argentina. Ej: 3.739 */
export function formatMillions(value: number) {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(value / 1_000_000)
}

/** Version corta para ejes de graficos y globos del mapa. Ej: $3.739 M */
export function formatCompact(value: number) {
  if (value >= 1_000_000) return `$${formatMillions(value)} M`
  if (value >= 1_000) return `$${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(value / 1_000)} mil`
  return formatCurrency(value)
}

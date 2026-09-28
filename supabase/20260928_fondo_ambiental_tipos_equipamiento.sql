-- Fondo Ambiental: 24 tipos de equipamiento + recarga desde la base oficial.
-- Fuente: 2026 - SOLICITUD MUNICIPIOS FONDO AMBIENTAL.xlsx (130 filas, columna A = legacy_id).
-- Resultado esperado: 130 registros, 121 municipios, 21 departamentos,
-- $6.893.387.497,70 y 188 equipos.
--
-- Qué hace:
--   1. Guarda una copia completa en private.fund_records_backup_20260928.
--   2. Agrega una columna por cada tipo de equipo de la planilla (camión compactador,
--      camión de reciclaje, compactador, membrana, etc.). Las columnas que ya existían
--      (chipeadora, prensa, peletizadora, trituradora, cinta, infraestructura, balanza) se reutilizan.
--   3. Actualiza los 130 registros de la planilla (por legacy_id) con las cantidades de cada tipo,
--      monto, etapa, año y ente/comunidad. Las columnas genéricas vehiculo y otro quedan en 0.
--   4. Corrige coordenadas: 21 localidades estaban en otro departamento, 14 no tenían y los entes
--      regionales se ubican en el centro de su departamento.
--   5. Valida los totales. Si algo no coincide, PostgreSQL revierte TODO y los datos quedan como estaban.
--
-- Se ejecuta UNA sola vez, en Supabase > SQL Editor > New query.

begin;

create schema if not exists private;

lock table public.fund_records in share row exclusive mode;

do $$
begin
  if to_regclass('private.fund_records_backup_20260928') is not null then
    raise exception 'La copia private.fund_records_backup_20260928 ya existe: esta actualización ya se ejecutó. No se hizo ningún cambio.';
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'fund_records' and column_name = 'legacy_id'
  ) then
    raise exception 'La tabla fund_records no tiene la columna legacy_id (la importación del 17/09 no se aplicó en esta base). No se hizo ningún cambio.';
  end if;
end
$$;

create table private.fund_records_backup_20260928
as table public.fund_records;

alter table private.fund_records_backup_20260928 enable row level security;

alter table public.fund_records
  add column if not exists compostadora integer not null default 0 check (compostadora >= 0),
  add column if not exists extrusora integer not null default 0 check (extrusora >= 0),
  add column if not exists membrana integer not null default 0 check (membrana >= 0),
  add column if not exists topadora integer not null default 0 check (topadora >= 0),
  add column if not exists pala_cargadora integer not null default 0 check (pala_cargadora >= 0),
  add column if not exists retroexcavadora integer not null default 0 check (retroexcavadora >= 0),
  add column if not exists bateas_roll_off integer not null default 0 check (bateas_roll_off >= 0),
  add column if not exists caja_abierta integer not null default 0 check (caja_abierta >= 0),
  add column if not exists camion_compactador integer not null default 0 check (camion_compactador >= 0),
  add column if not exists camion_volcador integer not null default 0 check (camion_volcador >= 0),
  add column if not exists camion_reciclaje integer not null default 0 check (camion_reciclaje >= 0),
  add column if not exists compactador integer not null default 0 check (compactador >= 0),
  add column if not exists moto_carga integer not null default 0 check (moto_carga >= 0),
  add column if not exists alambrado_perimetral integer not null default 0 check (alambrado_perimetral >= 0),
  add column if not exists bascula integer not null default 0 check (bascula >= 0),
  add column if not exists autoelevador integer not null default 0 check (autoelevador >= 0),
  add column if not exists cicatrizacion_basural integer not null default 0 check (cicatrizacion_basural >= 0);

-- Registros cargados a mano fuera de la planilla que usan las categorías genéricas:
-- hay que reclasificarlos antes, para que ninguna unidad quede sin tipo.
do $$
declare
  pendientes text;
begin
  select string_agg(coalesce(nullif(municipio, ''), regional_entity) || ' (' || departamento || ')', ', ')
  into pendientes
  from public.fund_records
  where deleted_at is null
    and legacy_id is null
    and (vehiculo > 0 or otro > 0);

  if pendientes is not null then
    raise exception 'Estos registros cargados a mano tienen "Vehículo" u "Otro": %. Editalos desde el dashboard indicando el tipo real antes de ejecutar este script. No se hizo ningún cambio.', pendientes;
  end if;
end
$$;

with source (
  legacy_id, departamento, municipio, regional_entity,
  chipeadora, prensa, peletizadora, compostadora, trituradora, extrusora, cinta, infraestructura, membrana, topadora, pala_cargadora, retroexcavadora, bateas_roll_off, caja_abierta, camion_compactador, camion_volcador, camion_reciclaje, compactador, moto_carga, alambrado_perimetral, balanza, bascula, autoelevador, cicatrizacion_basural,
  monto, etapa, anio, lat, lng
) as (values
(1, 'CALAMUCHITA', 'LA CRUZ', null, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 18000000, 1, 2024, -32.3, -64.48),
(2, 'CALAMUCHITA', 'CALMAYO', null, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 12400000, 1, 2024, -31.93, -64.61),
(3, 'CALAMUCHITA', '', 'COMUNIDAD REGIONAL', 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 53000000, 1, 2024, -32.214, -64.62),
(4, 'COLON', 'ESTACIÓN JUAREZ CELMAN', null, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 52500000, 1, 2024, -31.32, -64.11),
(5, 'CRUZ DEL EJE', 'SAN MARCOS SIERRAS', null, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 16600000, 1, 2024, -30.78, -64.65),
(6, 'GENERAL ROCA', 'ITALO', null, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 21600000, 1, 2024, -34.79, -63.81),
(7, 'GENERAL ROCA', 'MATTALDI', null, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 20300000, 1, 2024, -34.49, -64.18),
(8, 'GENERAL ROCA', 'VILLA HUIDOBRO', null, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 11600000, 1, 2024, -34.84, -64.58),
(9, 'GENERAL ROCA', 'VILLA VALERIA', null, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 32500000, 1, 2024, -34.35, -64.93),
(10, 'GENERAL SAN MARTIN', 'ETRURIA', null, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 26100000, 1, 2024, -32.94, -63.25),
(11, 'JUAREZ CELMAN', 'GENERAL CABRERA', null, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 40000000, 1, 2024, -32.81, -63.87),
(12, 'JUAREZ CELMAN', 'CHARRAS', null, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10500000, 1, 2024, -33.03, -64.05),
(13, 'JUAREZ CELMAN', 'UCACHA', null, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 12800000, 1, 2024, -33.03, -63.5),
(14, 'JUAREZ CELMAN', 'HUANCHILLAS', null, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 19700000, 1, 2024, -33.07, -63.64),
(15, 'MARCOS JUAREZ', 'GENERAL BALDISSERA', null, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 15800000, 1, 2024, -33.08, -62.31),
(16, 'PRESIDENTE ROQUE SÁENZ PEÑA', 'GENERAL LEVALLE', null, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 24200000, 1, 2024, -34.02, -63.93),
(17, 'PUNILLA', 'TANTI', null, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 54300000, 1, 2024, -31.36, -64.59),
(18, 'PUNILLA', 'CAPILLA DEL MONTE', null, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 34800000, 1, 2024, -30.86, -64.52),
(19, 'PUNILLA', 'COSQUIN', null, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 42700000, 1, 2024, -31.25, -64.46),
(20, 'PUNILLA', 'VILLA SANTA CRUZ DEL LAGO', null, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17300000, 1, 2024, -31.37, -64.52),
(21, 'RIO CUARTO', 'ALPA CORRAL', null, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 16700000, 1, 2024, -33.4, -65.02),
(22, 'RIO CUARTO', 'SAMPACHO', null, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6200000, 1, 2024, -33.39, -64.73),
(23, 'RIO CUARTO', 'SANTA CATALINA HOLMBERG', null, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 19910000, 1, 2024, -33.36, -64.13),
(24, 'RIO CUARTO', '', 'COMUNIDAD REGIONAL', 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 212200000, 1, 2024, -33.455, -64.51),
(25, 'RIO PRIMERO', 'LA PARA', null, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9700000, 1, 2024, -30.9, -63.0),
(26, 'RIO PRIMERO', 'OBISPO TREJO', null, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17300000, 1, 2024, -30.78, -63.42),
(27, 'RIO PRIMERO', 'PIQUILLIN', null, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 7100000, 1, 2024, -31.08, -63.72),
(28, 'RIO PRIMERO', 'VILLA FONTANA', null, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 12400000, 1, 2024, -31.05, -63.29),
(29, 'RIO SEGUNDO', 'COSTA SACATE', null, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 13300000, 1, 2024, -31.65, -63.76),
(30, 'RIO SEGUNDO', 'RIO SEGUNDO', null, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 40400000, 1, 2024, -31.65, -63.91),
(31, 'RIO SEGUNDO', 'VILLA DEL ROSARIO', null, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 50000000, 1, 2024, -31.55, -63.53),
(32, 'SAN ALBERTO', 'NONO', null, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 24950000, 1, 2024, -31.78, -65.01),
(33, 'SAN ALBERTO', 'SAN LORENZO', null, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 26500000, 1, 2024, -31.62, -65.07),
(34, 'SAN JAVIER', 'LAS TAPIAS', null, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 20020000, 1, 2024, -31.95, -65.1),
(35, 'SAN JAVIER/SAN ALBERTO', '', 'ENTE TRASLASIERRA LIMPIA', 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 154810000, 1, 2024, -31.852, -65.316),
(36, 'SAN JUSTO', 'EL FORTIN', null, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 12700000, 1, 2024, -30.67, -62.63),
(37, 'SAN JUSTO', 'ALICIA', null, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10900000, 1, 2024, -30.74, -62.75),
(38, 'SAN JUSTO', 'ALTOS DE CHIPION', null, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 39400000, 1, 2024, -30.6, -62.68),
(39, 'SAN JUSTO', 'FREYRE', null, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 24400000, 1, 2024, -31.17, -62.45),
(40, 'SAN JUSTO', 'TRANSITO', null, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 22500000, 1, 2024, -30.94, -62.44),
(41, 'SAN JUSTO', 'LA FRANCIA', null, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 12700000, 1, 2024, -30.6, -62.63),
(42, 'SAN JUSTO', '', 'ENTE NORESTE CORDOBES', 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 120000000, 1, 2024, -31.217, -62.583),
(43, 'TERCERO ARRIBA', 'ALMAFUERTE', null, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 24600000, 1, 2024, -32.19, -63.57),
(44, 'TERCERO ARRIBA', 'VILLA ASCASUBI', null, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 12800000, 1, 2024, -32.16, -63.89),
(45, 'TERCERO ARRIBA', 'OLIVA', null, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 12800000, 1, 2024, -32.04, -63.57),
(46, 'UNIÓN', 'LABORDE', null, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 19700000, 1, 2024, -33.15, -62.86),
(47, 'UNIÓN', 'JUSTINIANO POSSE', null, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 18400000, 1, 2024, -33.03, -62.67),
(48, 'CALAMUCHITA', '', 'COMUNIDAD REGIONAL', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 310000000, 2, 2025, -32.214, -64.62),
(49, 'CALAMUCHITA', 'EMBALSE', null, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 249270000, 2, 2025, -32.19, -64.42),
(50, 'CALAMUCHITA', 'LOS REARTES', null, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 38500000, 2, 2025, -31.92, -64.58),
(51, 'CALAMUCHITA', 'SANTA ROSA DE CALAMUCHITA', null, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 48860000, 2, 2025, -32.06, -64.54),
(52, 'CALAMUCHITA', 'VILLA CIUDAD PARQUE', null, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 55979700, 2, 2025, -32.11, -64.43),
(53, 'CALAMUCHITA', 'VILLA DEL DIQUE', null, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 33879000, 2, 2025, -32.18, -64.48),
(54, 'CALAMUCHITA', 'VILLA QUILLINZO', null, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 28000000, 2, 2025, -32.0, -64.5),
(55, 'CALAMUCHITA', 'VILLA RUMIPAL', null, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 51800000, 2, 2025, -32.17, -64.5),
(56, 'CALAMUCHITA', 'VILLA YACANTO', null, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17017000, 2, 2025, -32.13, -64.77),
(57, 'COLON', 'EL MANZANO', null, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 12040000, 2, 2025, -31.08, -64.3),
(58, 'COLON', 'ESTACIÓN GENERAL PAZ', null, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10500000, 2, 2025, -31.13, -64.14),
(59, 'COLON', 'MALVINAS ARGENTINAS', null, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 220000000, 2, 2025, -31.38, -64.06),
(60, 'COLON', 'SALDAN', null, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 35000000, 2, 2025, -31.32, -64.19),
(61, 'COLON', 'VILLA ALLENDE', null, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 57428000, 2, 2025, -31.29, -64.29),
(62, 'COLON', 'VILLA CERRO AZUL', null, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 28438200, 2, 2025, -31.07, -64.32),
(63, 'CRUZ DEL EJE', 'CRUZ DE CAÑA', null, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 28000000, 2, 2025, -30.5, -65.1),
(64, 'CRUZ DEL EJE', 'VILLA DEL SOTO', null, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 30800000, 2, 2025, -30.86, -64.99),
(65, 'GENERAL SAN MARTIN', 'ARROYO CABRAL', null, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17500000, 2, 2025, -32.49, -63.4),
(66, 'GENERAL SAN MARTIN', 'LA PLAYOSA', null, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 12880000, 2, 2025, -32.73, -63.111),
(67, 'GENERAL SAN MARTIN', 'TIO PUJIO', null, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 12740000, 2, 2025, -32.29, -63.36),
(68, 'ISCHILIN', 'DEAN FUNES', null, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 18200000, 2, 2025, -30.42, -64.35),
(69, 'ISCHILIN', 'QUILINO', null, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 42000000, 2, 2025, -30.21, -64.5),
(70, 'JUAREZ CELMAN', 'LA CARLOTA', null, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 45500000, 2, 2025, -33.42, -63.31),
(71, 'JUAREZ CELMAN', 'REDUCCIÓN', null, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 23100000, 2, 2025, -33.13, -63.46),
(72, 'JUAREZ CELMAN', 'SANTA EUFEMIA', null, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 18669210, 2, 2025, -33.17, -63.28),
(73, 'MARCOS JUAREZ', 'ARIAS', null, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 74900000, 2, 2025, -33.63, -62.43),
(74, 'MARCOS JUAREZ', 'GENERAL ROCA', null, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 42000000, 2, 2025, -32.73, -61.92),
(75, 'MARCOS JUAREZ', 'LOS SURGENTES', null, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 47600000, 2, 2025, -32.99, -62.02),
(76, 'PUNILLA', 'CABALANGO', null, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 220500000, 2, 2025, -31.42, -64.52),
(77, 'PUNILLA', '', 'COMUNIDAD REGIONAL', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 141800000, 2, 2025, -31.195, -64.569),
(78, 'PUNILLA', 'VALLE HERMOSO', null, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 42000000, 2, 2025, -31.11, -64.46),
(79, 'PUNILLA', 'HUERTA GRANDE', null, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 180847059, 2, 2025, -31.04, -64.48),
(80, 'PUNILLA', 'LA CUMBRE', null, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 30000000, 2, 2025, -30.98, -64.49),
(81, 'PUNILLA', 'VILLA GIARDINO', null, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 16070390, 2, 2025, -31.05, -64.5),
(82, 'RIO CUARTO', 'ALCIRA GIGENA', null, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 42000000, 2, 2025, -33.12, -64.35),
(83, 'RIO CUARTO', 'BERROTARAN', null, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 41020000, 2, 2025, -32.46, -64.4),
(84, 'RIO CUARTO', 'CHAJAN', null, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 13311200, 2, 2025, -33.58, -65.09),
(85, 'RIO CUARTO', '', 'COMUNIDAD REGIONAL', 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 178000000, 2, 2025, -33.455, -64.51),
(86, 'RIO CUARTO', 'CORONEL BAIGORRIA', null, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 28000000, 2, 2025, -33.88, -65.01),
(87, 'RIO CUARTO', 'LAS ACEQUIAS', null, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 17381392, 2, 2025, -33.05, -64.33),
(88, 'RIO CUARTO', 'MONTE DE LOS GAUCHOS', null, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 44463997.9, 2, 2025, -33.55, -64.73),
(89, 'RIO CUARTO', 'SAN BASILIO', null, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 37800000, 2, 2025, -33.5, -64.33),
(90, 'RIO CUARTO', 'VICUÑA MACKENNA', null, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 70000000, 2, 2025, -33.92, -64.38),
(91, 'RIO PRIMERO', 'KM 658', null, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 12180000, 2, 2025, -31.2, -63.5),
(92, 'RIO PRIMERO', 'MONTE CRISTO', null, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 36400000, 2, 2025, -31.34, -63.94),
(93, 'RIO PRIMERO', 'RIO PRIMERO', null, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 35000000, 2, 2025, -31.33, -63.63),
(94, 'RIO SEGUNDO', 'LAGUNA LARGA', null, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 35560000, 2, 2025, -31.77, -63.81),
(95, 'RIO SEGUNDO', 'ONCATIVO', null, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17867500, 2, 2025, -31.91, -63.68),
(96, 'RIO SEGUNDO', 'POZO DEL MOLLE', null, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 35000000, 2, 2025, -32.03, -62.91),
(97, 'RIO SEGUNDO', 'SANTIAGO TEMPLE', null, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 35000000, 2, 2025, -31.39, -63.42),
(98, 'PRESIDENTE ROQUE SÁENZ PEÑA', 'LA CESIRA', null, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 23940000, 2, 2025, -34.21, -64.03),
(99, 'PRESIDENTE ROQUE SÁENZ PEÑA', 'LABOULAYE', null, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 38500000, 2, 2025, -34.13, -63.38),
(100, 'PRESIDENTE ROQUE SÁENZ PEÑA', 'SERRANO', null, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17850000, 2, 2025, -34.47, -63.54),
(101, 'SAN ALBERTO', '', 'COMUNIDAD REGIONAL', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 180847059, 2, 2025, -31.655, -65.108),
(102, 'SAN ALBERTO', 'MINA CLAVERO', null, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 37669000.6, 2, 2025, -31.72, -65.01),
(103, 'SAN JAVIER', 'LOS HORNILLOS', null, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 18900000, 2, 2025, -31.9, -65.05),
(104, 'SAN JUSTO', 'BRINKMANN', null, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 220000000, 2, 2025, -30.87, -62.04),
(105, 'SAN JUSTO', 'EL TIO', null, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 48860000, 2, 2025, -31.38, -62.83),
(106, 'SAN JUSTO', '', 'ENTE NORESTE CORDOBES', 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 302800000, 2, 2025, -31.217, -62.583),
(107, 'SAN JUSTO', 'LA TORDILLA', null, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 15470000, 2, 2025, -31.24, -63.06),
(108, 'SAN JUSTO', 'LAS VARAS', null, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 53295900, 2, 2025, -31.8, -62.62),
(109, 'SAN JUSTO', 'LAS VARILLAS', null, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 225200000, 2, 2025, -31.87, -62.72),
(110, 'SAN JUSTO', 'MARULL', null, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 32900000, 2, 2025, -30.99, -62.83),
(111, 'SAN JUSTO', 'MIRAMAR', null, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 19880000, 2, 2025, -30.91, -62.68),
(112, 'SAN JUSTO', 'MORTEROS', null, 0, 0, 0, 0, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 272374000, 2, 2025, -30.71, -61.99),
(113, 'SAN JUSTO', 'PORTEÑA', null, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 49000000, 2, 2025, -30.87, -62.0),
(114, 'SAN JUSTO', 'SAN FRANCISCO', null, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 84000000, 2, 2025, -31.43, -62.08),
(115, 'SAN JUSTO', 'SEEBER', null, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 28000000, 2, 2025, -30.51, -62.36),
(116, 'SANTA MARIA', 'ALTA GRACIA', null, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 220000000, 2, 2025, -31.66, -64.43),
(117, 'SANTA MARIA', 'DESPEÑADEROS', null, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 42580230, 2, 2025, -31.62, -64.27),
(118, 'SANTA MARIA', 'LOZADA', null, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17640000, 2, 2025, -31.69, -64.13),
(119, 'SANTA MARIA', 'VILLA CIUDAD AMERICA', null, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 30851100, 2, 2025, -31.6, -64.14),
(120, 'SANTA MARIA', 'VILLA PARQUE SANTA ANA', null, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 21000000, 2, 2025, -31.62, -64.08),
(121, 'TERCERO ARRIBA', 'CORRALITO', null, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 33670000, 2, 2025, -32.02, -63.8),
(122, 'TERCERO ARRIBA', 'LAS PERDICES', null, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 12600000, 2, 2025, -32.7, -63.71),
(123, 'TERCERO ARRIBA', 'RIO TERCERO', null, 1, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 259800000, 2, 2025, -32.17, -64.11),
(124, 'TOTORAL', 'CAÑADA DE LUQUE', null, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 32200000, 2, 2025, -30.74, -63.73),
(125, 'TOTORAL', 'VILLA DEL TOTORAL', null, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 25416559, 2, 2025, -30.57, -63.76),
(126, 'UNIÓN', 'ALTO ALEGRE', null, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 28000000, 2, 2025, -33.48, -62.88),
(127, 'UNIÓN', 'CINTRA', null, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17500000, 2, 2025, -33.22, -63.03),
(128, 'UNIÓN', 'MORRISON', null, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17640000, 2, 2025, -33.1, -63.08),
(129, 'UNIÓN', 'ORDOÑEZ', null, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 18161000.2, 2, 2025, -32.84, -62.87),
(130, 'UNIÓN', 'PASCANAS', null, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 26950000, 2, 2025, -33.12, -62.58)
),
updated as (
  update public.fund_records as current_record
  set
    departamento = source.departamento,
    municipio = source.municipio,
    regional_entity = source.regional_entity,
    chipeadora = source.chipeadora,
    prensa = source.prensa,
    peletizadora = source.peletizadora,
    compostadora = source.compostadora,
    trituradora = source.trituradora,
    extrusora = source.extrusora,
    cinta = source.cinta,
    infraestructura = source.infraestructura,
    membrana = source.membrana,
    topadora = source.topadora,
    pala_cargadora = source.pala_cargadora,
    retroexcavadora = source.retroexcavadora,
    bateas_roll_off = source.bateas_roll_off,
    caja_abierta = source.caja_abierta,
    camion_compactador = source.camion_compactador,
    camion_volcador = source.camion_volcador,
    camion_reciclaje = source.camion_reciclaje,
    compactador = source.compactador,
    moto_carga = source.moto_carga,
    alambrado_perimetral = source.alambrado_perimetral,
    balanza = source.balanza,
    bascula = source.bascula,
    autoelevador = source.autoelevador,
    cicatrizacion_basural = source.cicatrizacion_basural,
    vehiculo = 0,
    otro = 0,
    monto = source.monto,
    etapa = source.etapa,
    anio = source.anio,
    lat = coalesce(source.lat, current_record.lat),
    lng = coalesce(source.lng, current_record.lng),
    deleted_at = null,
    deleted_by = null
  from source
  where current_record.legacy_id = source.legacy_id
  returning source.legacy_id
)
insert into public.fund_records (
  legacy_id, departamento, municipio, regional_entity,
  chipeadora, prensa, peletizadora, compostadora, trituradora, extrusora, cinta, infraestructura, membrana, topadora, pala_cargadora, retroexcavadora, bateas_roll_off, caja_abierta, camion_compactador, camion_volcador, camion_reciclaje, compactador, moto_carga, alambrado_perimetral, balanza, bascula, autoelevador, cicatrizacion_basural,
  monto, etapa, anio, lat, lng
)
select
  source.legacy_id, source.departamento, source.municipio, source.regional_entity,
  source.chipeadora, source.prensa, source.peletizadora, source.compostadora, source.trituradora, source.extrusora, source.cinta, source.infraestructura, source.membrana, source.topadora, source.pala_cargadora, source.retroexcavadora, source.bateas_roll_off, source.caja_abierta, source.camion_compactador, source.camion_volcador, source.camion_reciclaje, source.compactador, source.moto_carga, source.alambrado_perimetral, source.balanza, source.bascula, source.autoelevador, source.cicatrizacion_basural,
  source.monto, source.etapa, source.anio, source.lat, source.lng
from source
where not exists (
  select 1 from updated where updated.legacy_id = source.legacy_id
);

do $$
declare
  r_registros integer;
  r_municipios integer;
  r_departamentos integer;
  r_monto numeric(18, 2);
  r_equipos bigint;
  r_genericos bigint;
begin
  select
    count(*),
    count(distinct nullif(btrim(municipio), '')),
    count(distinct departamento),
    coalesce(sum(monto), 0),
    coalesce(sum(chipeadora + prensa + peletizadora + compostadora + trituradora + extrusora + cinta + infraestructura + membrana + topadora + pala_cargadora + retroexcavadora + bateas_roll_off + caja_abierta + camion_compactador + camion_volcador + camion_reciclaje + compactador + moto_carga + alambrado_perimetral + balanza + bascula + autoelevador + cicatrizacion_basural), 0),
    coalesce(sum(vehiculo + otro), 0)
  into r_registros, r_municipios, r_departamentos, r_monto, r_equipos, r_genericos
  from public.fund_records
  where deleted_at is null
    and legacy_id between 1 and 130;

  if r_registros <> 130
    or r_municipios <> 121
    or r_departamentos <> 21
    or r_monto <> 6893387497.70
    or r_equipos <> 188
    or r_genericos <> 0
  then
    raise exception
      'Validación fallida. Registros %, municipios %, departamentos %, monto %, equipos %, genéricos %. No se aplicaron cambios.',
      r_registros, r_municipios, r_departamentos, r_monto, r_equipos, r_genericos;
  end if;
end
$$;

commit;

-- Verificación visible al terminar. Debe mostrar: 130 | 121 | 21 | 6893387497.70 | 188 | 10 camiones y vehículos.
select
  count(*) as registros,
  count(distinct nullif(btrim(municipio), '')) as municipios,
  count(distinct departamento) as departamentos,
  sum(monto) as monto_total,
  sum(chipeadora + prensa + peletizadora + compostadora + trituradora + extrusora + cinta + infraestructura + membrana + topadora + pala_cargadora + retroexcavadora + bateas_roll_off + caja_abierta + camion_compactador + camion_volcador + camion_reciclaje + compactador + moto_carga + alambrado_perimetral + balanza + bascula + autoelevador + cicatrizacion_basural) as equipos,
  sum(camion_compactador) as camion_compactador,
  sum(camion_reciclaje) as camion_reciclaje,
  sum(camion_volcador) as camion_volcador,
  sum(compactador) as compactador
from public.fund_records
where deleted_at is null
  and legacy_id between 1 and 130;

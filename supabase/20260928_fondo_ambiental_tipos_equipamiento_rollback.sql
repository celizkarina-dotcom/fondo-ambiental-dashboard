-- Reversión de emergencia de 20260928_fondo_ambiental_tipos_equipamiento.sql
--
-- Restaura los registros tal como estaban antes de la actualización. Usar sólo si el
-- resultado quedó mal y antes de que otras personas hagan cambios (también se revierten).
-- Las columnas nuevas de tipos de equipo quedan en la tabla, pero en 0 y el dashboard
-- anterior no las usa.

begin;

lock table public.fund_records in access exclusive mode;

do $$
begin
  if to_regclass('private.fund_records_backup_20260928') is null then
    raise exception 'No existe private.fund_records_backup_20260928. No se modificó ningún dato.';
  end if;
end
$$;

alter table public.fund_records disable trigger user;

delete from public.fund_records;

insert into public.fund_records (
  id,
  legacy_id,
  departamento,
  municipio,
  regional_entity,
  chipeadora,
  prensa,
  peletizadora,
  cinta,
  trituradora,
  infraestructura,
  balanza,
  vehiculo,
  otro,
  monto,
  etapa,
  anio,
  lat,
  lng,
  version,
  created_by,
  updated_by,
  deleted_by,
  created_at,
  updated_at,
  deleted_at
)
select
  id,
  legacy_id,
  departamento,
  municipio,
  regional_entity,
  chipeadora,
  prensa,
  peletizadora,
  cinta,
  trituradora,
  infraestructura,
  balanza,
  vehiculo,
  otro,
  monto,
  etapa,
  anio,
  lat,
  lng,
  version,
  created_by,
  updated_by,
  deleted_by,
  created_at,
  updated_at,
  deleted_at
from private.fund_records_backup_20260928;

alter table public.fund_records enable trigger user;

commit;

select count(*) as registros_restaurados from public.fund_records;

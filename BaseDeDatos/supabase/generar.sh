#!/usr/bin/env bash
# Regenera supabase/salonflow_supabase.sql a partir de 01_esquema.sql y 02_datos_prueba.sql.
# Uso: bash BaseDeDatos/supabase/generar.sh
set -euo pipefail
cd "$(dirname "$0")/.."
{
cat <<'H'
-- =====================================================================
-- SalonFlow ERP · Instalación completa en Supabase  (ARCHIVO GENERADO)
-- No editar a mano: se genera con BaseDeDatos/supabase/generar.sh
-- Pegar TODO este archivo en Supabase > SQL Editor > New query > Run.
-- Crea tablas, vistas, funciones, seguridad y datos de prueba.
-- Se puede volver a ejecutar: borra y recrea todo (¡también los datos!).
-- =====================================================================

-- Fechas en hora de Colombia (Supabase usa UTC por defecto).
ALTER DATABASE postgres SET timezone TO 'America/Bogota';
SET timezone TO 'America/Bogota';

H
cat 01_esquema.sql; echo; cat 02_datos_prueba.sql
} > supabase/salonflow_supabase.sql
echo "Generado supabase/salonflow_supabase.sql"

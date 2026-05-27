-- ================================================================
--  WMS DistriSuper — Schema Supabase
--  Ejecutar en orden en el SQL Editor de Supabase
-- ================================================================

-- Usuarios
CREATE TABLE IF NOT EXISTS usuarios (
  id         SERIAL PRIMARY KEY,
  username   TEXT UNIQUE NOT NULL,
  password   TEXT NOT NULL,          -- bcrypt hash
  rol        TEXT DEFAULT 'operador' CHECK (rol IN ('admin','operador')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Artículos por depósito
CREATE TABLE IF NOT EXISTS articulos (
  id               SERIAL PRIMARY KEY,
  deposito         TEXT NOT NULL CHECK (deposito IN ('BA','RO','PI','MDP')),
  codigo           TEXT NOT NULL,
  marca            TEXT,
  ubicacion        TEXT,
  ubicacion_pulmon TEXT,
  fecha_carga      TIMESTAMPTZ,
  updated_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE(deposito, codigo)
);
CREATE INDEX IF NOT EXISTS idx_articulos_dep ON articulos(deposito);
CREATE INDEX IF NOT EXISTS idx_articulos_cod ON articulos(codigo);

-- Stock sistema (viene del ERP vía CSV o API)
CREATE TABLE IF NOT EXISTS stock_sistema (
  id               SERIAL PRIMARY KEY,
  deposito         TEXT NOT NULL,
  codigo           TEXT NOT NULL,
  stock            INTEGER NOT NULL DEFAULT 0,
  fuente           TEXT DEFAULT 'csv' CHECK (fuente IN ('csv','api','manual')),
  sincronizado_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(deposito, codigo)
);
CREATE INDEX IF NOT EXISTS idx_stock_sis_dep ON stock_sistema(deposito);

-- Conteos de operarios
CREATE TABLE IF NOT EXISTS stock_conteos (
  id             SERIAL PRIMARY KEY,
  deposito       TEXT NOT NULL,
  codigo         TEXT NOT NULL,
  cant_ubicacion INTEGER,
  cant_pulmon    INTEGER,
  cant_aoki      INTEGER,
  usuario_id     INTEGER REFERENCES usuarios(id),
  updated_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE(deposito, codigo)
);

-- Movimientos / auditoría
CREATE TABLE IF NOT EXISTS movimientos (
  id         SERIAL PRIMARY KEY,
  deposito   TEXT,
  codigo     TEXT,
  tipo       TEXT NOT NULL,   -- conteo | edicion_ubicacion | import_csv | ajuste
  detalle    JSONB,
  usuario_id INTEGER REFERENCES usuarios(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mov_dep ON movimientos(deposito);
CREATE INDEX IF NOT EXISTS idx_mov_tipo ON movimientos(tipo);
CREATE INDEX IF NOT EXISTS idx_mov_ts ON movimientos(created_at DESC);

-- Configuración global (marcas deshabilitadas, etc.)
CREATE TABLE IF NOT EXISTS admin_config (
  clave  TEXT PRIMARY KEY,
  valor  JSONB
);

-- Configuración por depósito (min/max, aoki, codigos disabled)
CREATE TABLE IF NOT EXISTS admin_config_dep (
  deposito TEXT NOT NULL,
  clave    TEXT NOT NULL,
  valor    JSONB,
  PRIMARY KEY(deposito, clave)
);

-- IPC scores (calculado automáticamente, ver Edge Function)
CREATE TABLE IF NOT EXISTS ipc_scores (
  id           SERIAL PRIMARY KEY,
  deposito     TEXT NOT NULL,
  codigo       TEXT NOT NULL,
  score        INTEGER DEFAULT 0,
  motivos      JSONB,
  calculado_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(deposito, codigo)
);

-- Confianza de stock (último conteo validado)
CREATE TABLE IF NOT EXISTS confianza_stock (
  deposito      TEXT NOT NULL,
  codigo        TEXT NOT NULL,
  ultimo_conteo TIMESTAMPTZ,
  hay_diferencia BOOLEAN DEFAULT false,
  PRIMARY KEY(deposito, codigo)
);

-- ================================================================
--  ROW LEVEL SECURITY (básico)
-- ================================================================
ALTER TABLE articulos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_sistema  ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_conteos  ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos    ENABLE ROW LEVEL SECURITY;

-- Por ahora service_role bypasea RLS (el backend usa service key)
-- Cuando tengamos auth de Supabase, acá van las policies por rol

-- ================================================================
--  USUARIO ADMIN INICIAL (cambiar contraseña después)
-- ================================================================
-- La contraseña se genera con bcrypt desde el backend
-- INSERT INTO usuarios (username, password, rol)
-- VALUES ('admin', '$2b$10$HASH_GENERADO_CON_BCRYPT', 'admin');

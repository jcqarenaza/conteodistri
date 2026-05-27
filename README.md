# WMS DistriSuper Autopartes

Sistema de gestión y control de stock y ubicaciones para DistriSuper Autopartes. Soporta 4 depósitos (Buenos Aires, Rosario, Pico, Mar del Plata) con control de ubicaciones jerárquicas, conteo físico de stock, semáforo de confianza, alertas y log de movimientos.

## Stack

- **Frontend**: HTML + JS vanilla (standalone, funciona offline)
- **Backend**: Node.js + Express
- **Base de datos**: Supabase (PostgreSQL)
- **Deploy**: Railway / Render + Vercel

## Estructura

```
wms-distrisuper/
├── frontend/
│   └── index.html          ← App completa (standalone o conectada al backend)
├── backend/
│   ├── index.js            ← Servidor Express principal
│   ├── supabase.js         ← Cliente Supabase
│   ├── routes/
│   │   ├── auth.js         ← Login / registro
│   │   ├── articulos.js    ← GET/PUT artículos y ubicaciones
│   │   ├── stock.js        ← Conteos + CSV import + stock sistema
│   │   └── admin.js        ← Config admin + movimientos + alertas
│   └── middleware/
│       └── auth.js         ← Verificación JWT + roles
├── database/
│   ├── schema.sql          ← Schema completo de Supabase
│   └── stock_demo.csv      ← Stock de prueba para demos
├── .env.example
└── package.json
```

## Setup local

```bash
# 1. Clonar
git clone https://github.com/TU_USUARIO/wms-distrisuper.git
cd wms-distrisuper

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales de Supabase

# 4. Crear tablas en Supabase
# Copiar y ejecutar database/schema.sql en el SQL Editor de Supabase

# 5. Iniciar servidor de desarrollo
npm run dev
# → http://localhost:3000
```

## Uso standalone (sin backend)

El archivo `frontend/index.html` funciona directamente en el navegador sin servidor. Los datos de artículos y ubicaciones están embebidos. Para agregar stock sistema, usar Admin → Stock Sistema → importar CSV.

## API Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/login` | Login → JWT |
| GET | `/api/articulos/:dep` | Lista artículos del depósito |
| PUT | `/api/articulos/:dep/:codigo` | Editar ubicación |
| GET | `/api/stock/sistema/:dep` | Stock oficial ERP |
| POST | `/api/stock/sistema/csv` | Importar CSV de stock |
| GET | `/api/stock/conteos/:dep` | Conteos del operario |
| PUT | `/api/stock/conteos/:dep/:codigo` | Guardar conteo |
| GET | `/api/admin/config/:dep` | Configuración admin |
| PUT | `/api/admin/config/:dep` | Guardar config |
| GET | `/api/admin/movimientos/:dep` | Historial |
| GET | `/api/admin/alertas/:dep` | Alertas activas |

## Módulos implementados

- ✅ Gestión de ubicaciones jerárquicas (Zona/Piso/Pasillo/Cuerpo/Estante/Div)
- ✅ Conteo por ubicación con sección de pulmón separada
- ✅ Diferencias en tiempo real vs stock sistema
- ✅ Semáforo de confianza por artículo (🟢/🟡/🔴)
- ✅ Importador CSV de stock sistema con preview
- ✅ Log de movimientos en tiempo real
- ✅ Alertas: discrepancias de conteo + stock bajo mínimo
- ✅ Panel admin: marcas, códigos, min/max, Aoki (MDP)
- ✅ Exportación CSV/HTML configurable
- ✅ Multi-depósito (BA, RO, PI, MDP)

## Roadmap

- [ ] Conectar frontend al backend (reemplazar datos hardcodeados por fetch)
- [ ] Login de usuarios con JWT
- [ ] IPC automático (score de riesgo por producto)
- [ ] Dashboard ejecutivo con KPIs
- [ ] Sincronización automática con ERP vía API
- [ ] Sistema de tareas para operarios
- [ ] PWA (para uso en tablet/celular en depósito)

## Variables de entorno

Ver `.env.example` para la lista completa.

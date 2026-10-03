# BackOffice Engine

Núcleo SaaS multi-tenant modular. Ver `docs/ARQUITECTURA.md` para el diseño completo.

## Estado actual (Fase 1 en progreso)

Funcional de verdad (probado: compila y responde 200 en todas las rutas):
- Layout del Core: Sidebar colapsable dinámico (por módulos activos del tenant), Topbar, Command Palette (⌘K)
- Dark mode
- Registro (`/signup`): crea usuario en Supabase Auth + su tenant (organización) + rol Owner + activa módulos por defecto
- Login (`/login`) con Supabase Auth
- Middleware que protege `/dashboard` (redirige a `/login` si no hay sesión) — **solo si configuras Supabase**; sin credenciales, corre en modo demo sin bloquear nada
- Schema Prisma del Core completo + políticas RLS listas (`prisma/rls/core_policies.sql`)
- Módulos de ejemplo con UI real: CRM (tabla filtrable), Proyectos (kanban), Finanzas (facturas), Soporte (tickets), Analítica — **estos aún usan datos fijos en memoria**, todavía no leen de la base de datos

Pendiente para que sea 100% real de punta a punta:
- Conectar los módulos de negocio (CRM, Projects, Finance...) a tablas propias en Postgres en vez de arrays fijos
- Middleware de resolución de tenant por subdominio (hoy el usuario entra a un solo dashboard, falta enrutar `{tenant}.tudominio.com`)
- Billing real (Stripe) para cobrar planes
- Panel de administración de roles/permisos e invitar usuarios al tenant

## Cómo correrlo

```bash
npm install
npm run dev
```

Abre http://localhost:3000 — redirige automáticamente a `/dashboard`.

## Deploy en Netlify

**Opción A — vía Git (recomendada):**
1. Sube esta carpeta a un repo de GitHub
2. En Netlify: "Add new site" → "Import an existing project" → conecta el repo
3. Netlify detecta `netlify.toml` automáticamente (build command `npm run build`, plugin `@netlify/plugin-nextjs`)
4. Deploy

**Opción B — vía CLI, sin Git:**
```bash
npm install -g netlify-cli
netlify deploy --build --prod
```

Nota: en este estado (sin Supabase conectado) el sitio se ve y navega, pero no persiste datos reales — es la UI del Core, no el backoffice completo.

## Conectar Supabase (para que Auth + tenants + genealogía funcionen de verdad)

**Nota sobre la arquitectura de datos:** Prisma se usa únicamente para **definir el esquema y correr migraciones** (`prisma/schema.prisma`). Las consultas en tiempo de ejecución (lo que ves en pantalla) usan el cliente de Supabase directo — así evitamos depender del motor binario de Prisma en tiempo de ejecución.

1. Crea un proyecto gratis en https://supabase.com/dashboard
2. En **Project Settings → API**, copia:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role key` → `SUPABASE_SERVICE_ROLE_KEY` (¡nunca la expongas al cliente!)
3. En **Project Settings → Database**, copia la "Connection string" (modo *Session* o *Transaction pooling*) → `DATABASE_URL`
4. Copia `.env.example` a `.env.local` y pega esas 4 variables
5. Crea las tablas (Core + RankFlow):
   ```bash
   npx prisma migrate dev --name init
   ```
6. En el **SQL Editor** de Supabase, pega y ejecuta el contenido completo de `prisma/rls/core_policies.sql` (activa el aislamiento por tenant, incluye la tabla `distributors`)
7. `npm run dev` y prueba `/signup` — debería crear tu usuario y tu organización de verdad
8. Entra a **Genealogía** — verás el formulario para dar de alta a tu primer distribuidor real; a partir de ahí ya puedes construir el árbol contra la base de datos

Verifica en Supabase → Table Editor que aparecieron filas en `tenants`, `users`, `roles`, `tenant_users` y `distributors`.

## Variables de entorno en Netlify

Cuando despliegues, agrega las mismas 4 variables de `.env.local` en **Site settings → Environment variables** de Netlify (si no, Auth seguirá en modo demo en producción).

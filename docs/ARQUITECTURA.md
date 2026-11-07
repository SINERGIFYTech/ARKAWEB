# BackOffice Engine — Arquitectura Maestra

## 1. Visión

BackOffice Engine es un **núcleo SaaS multi-tenant, modular y desacoplado**, no una aplicación. Cada vertical (RankFlow, ClinicFlow, AgencyFlow, etc.) es una capa de módulos específicos montada sobre el mismo Core, Auth, Billing, Permisos y Motor de UI. El objetivo de diseño es: **el núcleo nunca se toca al lanzar una nueva vertical**, solo se agregan módulos.

Principio rector: **Core = genérico y estable. Módulos = específicos y desechables/reemplazables.**

---

## 2. Stack técnico

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 14+ (App Router), React, TypeScript |
| Estilos | TailwindCSS + shadcn/ui + Framer Motion |
| Datos | Supabase (Postgres + Auth + Storage + Realtime) |
| ORM | Prisma |
| Server state | TanStack Query |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Iconos | Lucide |

Justificación clave: Prisma se usa como capa de modelado y migraciones; Supabase se usa para Auth/Storage/Realtime/RLS. Prisma se conecta directo a la base de Supabase (Postgres), no reemplaza RLS — RLS se define en SQL/policies y Prisma respeta el esquema.

---

## 3. Multi-tenancy

Estrategia recomendada: **Row-Level Multi-Tenancy con `tenant_id` + RLS**, no bases de datos separadas por cliente (no escalable para "miles de empresas").

- Toda tabla de negocio tiene `tenant_id uuid NOT NULL`.
- RLS en Postgres filtra automáticamente por `tenant_id` derivado del JWT (`auth.jwt() -> tenant_id`).
- Un `tenant` (organización) puede tener múltiples `domains` (subdominio propio o dominio custom) y `branding` (logo, colores, tema).
- Planes y suscripciones viven a nivel `tenant`, no a nivel `user`.

```
tenant (organization)
 ├── users (via tenant_users, N:N con roles)
 ├── roles / permissions
 ├── branding / theme
 ├── domains
 ├── subscription / plan
 ├── enabled_modules[]
 └── settings (JSON)
```

Ruteo: subdominio `{tenant}.backofficeengine.com` o dominio custom → middleware de Next.js resuelve tenant antes de renderizar.

---

## 4. Arquitectura modular

Cada módulo es un paquete autocontenido con: rutas, componentes, hooks, esquema Prisma (o migración incremental), permisos propios y un manifest.

```
modules/
 ├── core/            (siempre activo, no desactivable)
 ├── crm/
 ├── projects/
 ├── finance/
 ├── hr/
 ├── inventory/
 ├── support/
 ├── automations/
 ├── ai/
 └── analytics/
```

Cada módulo expone un `module.config.ts`:

```ts
export const moduleConfig: ModuleManifest = {
  key: "crm",
  name: "CRM",
  version: "1.0.0",
  dependsOn: ["core"],
  routes: () => import("./routes"),
  sidebarItems: [...],
  permissions: ["crm.read", "crm.write", "crm.delete"],
  settingsSchema: crmSettingsZodSchema,
};
```

Un tenant activa/desactiva módulos vía tabla `tenant_modules`. El sidebar, el command palette (CMD+K) y las rutas se generan dinámicamente a partir de los módulos activos del tenant — nunca hardcoded.

Las verticales (RankFlow, ClinicFlow, etc.) son **paquetes de módulos + configuración de branding + módulos propios adicionales** (ej. RankFlow agrega `mlm-genealogy`, `commissions`, `rank-tracking` sin tocar `crm` o `finance`).

---

## 5. Estructura de carpetas

```
backoffice-engine/
├── apps/
│   └── web/                      # Next.js app principal
│       ├── app/
│       │   ├── (auth)/
│       │   ├── (dashboard)/
│       │   │   └── [tenant]/
│       │   │       ├── crm/
│       │   │       ├── projects/
│       │   │       ├── finance/
│       │   │       └── ...
│       │   ├── api/
│       │   └── layout.tsx
│       ├── middleware.ts         # resolución de tenant + auth guard
│       └── next.config.ts
├── modules/
│   ├── core/
│   ├── crm/
│   ├── projects/
│   ├── finance/
│   ├── hr/
│   ├── inventory/
│   ├── support/
│   ├── automations/
│   ├── ai/
│   └── analytics/
├── packages/
│   ├── ui/                       # componentes shadcn tematizables
│   ├── db/                       # cliente Prisma + esquema
│   ├── auth/                     # helpers Supabase Auth + RBAC
│   ├── config/                   # module registry, feature flags
│   └── utils/
├── prisma/
│   └── schema.prisma
└── docs/
```

Monorepo con Turborepo/PNPM workspaces — esto es lo que permite que cada vertical (RankFlow, ClinicFlow) sea, a futuro, su propia app en `apps/` reutilizando `packages/` y `modules/` sin duplicar código.

---

## 6. Modelo de datos (entidades núcleo)

Entidades del Core (siempre presentes):

- `Tenant` (organización) — 1:N `TenantDomain`, `Subscription`, `TenantModule`
- `User` — N:N `Tenant` vía `TenantUser` (un usuario puede pertenecer a varios tenants)
- `Role` / `Permission` / `RolePermission` — RBAC granular por tenant
- `Notification`
- `ActivityLog` / `AuditLog`
- `ApiKey` / `Webhook`
- `File` (metadata; binarios en Supabase Storage)
- `Plan` / `Subscription` / `Invoice` (billing del propio SaaS, no confundir con Finance del módulo)

Entidades por módulo (ejemplos):

- **CRM**: `Contact`, `Lead`, `Pipeline`, `Stage`, `Opportunity`, `Note`, `Attachment`
- **Projects**: `Project`, `Task`, `Board`, `Column`, `Comment`, `Milestone`
- **Finance**: `Invoice`, `Payment`, `Expense`, `Budget`
- **Support**: `Ticket`, `TicketMessage`, `KnowledgeArticle`
- **Automations**: `Workflow`, `Trigger`, `Condition`, `Action`, `WorkflowRun`
- **AI**: `AiQuery`, `AiReport` (log de preguntas/respuestas + reportes generados)

Todas heredan `id`, `tenant_id`, `created_at`, `updated_at`, `created_by`.

Ver `prisma/schema.prisma` adjunto con el núcleo ya modelado (Tenant, User, RBAC, Módulos, Auditoría) listo para `prisma migrate`.

---

## 7. Seguridad

- **RLS por tenant** en cada tabla de negocio (policy estándar: `tenant_id = current_tenant_id()`).
- **JWT de Supabase** enriquecido con `tenant_id` y `role` via custom claims.
- **RBAC granular**: permisos tipo `modulo.accion` (`crm.write`, `finance.delete`) evaluados en middleware + a nivel de query.
- **2FA** vía Supabase Auth (TOTP).
- **Audit Trail** inmutable (tabla append-only, sin updates/deletes permitidos por policy).
- **Rate limiting** a nivel de API routes (Upstash/Redis o Supabase Edge Functions).

---

## 8. Roadmap de implementación por fases

**Fase 0 — Fundación (1-2 semanas)**
Monorepo, Turborepo, Next.js base, Tailwind + shadcn, conexión Supabase, Prisma schema del Core, CI básico.

**Fase 1 — Core Module (2-4 semanas)**
Auth (login/registro/2FA), Organizations (tenants), Users, Roles/Permissions, middleware de resolución de tenant + RLS, Settings, Theme Engine (dark mode + branding por tenant), layout base (Sidebar colapsable + Topbar + CMD+K), Notifications, Activity/Audit Log, API Keys, Webhooks, File Manager, Search global.

**Fase 2 — Module Registry + primer módulo de negocio (2-3 semanas)**
Sistema de activación/desactivación de módulos por tenant, sidebar/rutas dinámicas. Construir CRM como módulo de referencia (patrón a replicar).

**Fase 3 — Módulos restantes (por sprints, 1-2 semanas c/u)**
Projects → Finance → Support → Inventory → HR, cada uno siguiendo el patrón de CRM.

**Fase 4 — Automations (2-3 semanas)**
Workflow builder visual, triggers/condiciones/acciones, integraciones (email, WhatsApp, webhooks salientes).

**Fase 5 — Analytics + AI (3-4 semanas)**
Dashboard ejecutivo con KPIs por módulo, exportación PDF/Excel. Asistente IA con acceso de solo-lectura a datos del tenant (vía function calling sobre queries agregadas, nunca SQL libre del usuario final), generación automática de reportes.

**Fase 6 — Primera vertical: RankFlow (4-6 semanas)**
Módulos exclusivos (genealogía MLM, comisiones, rangos) montados sobre el Core sin modificarlo — validación real de que la arquitectura modular funciona.

**Fase 7 — Hardening y escala**
Paginación/virtualización en tablas grandes, cache (TanStack Query + edge cache), pruebas de carga multi-tenant, rate limiting, observabilidad (logs/metrics).

---

## 9. Siguiente paso concreto

Recomiendo iniciar por la **Fase 0 + Fase 1 (Core)** con código real: estructura del monorepo, `prisma/schema.prisma` del núcleo, middleware de tenant, y el layout base (Sidebar + Topbar + CMD+K) con Dark Mode y Theme Engine. Es la base sobre la que todo lo demás se apoya — y es exactamente donde vale la pena invertir el mayor cuidado de diseño, porque un error aquí se propaga a las 9 verticales.

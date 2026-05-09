# PoinçOn — Next.js 15 · Pointage légal belge

**Golden Rule**: Always prefix commands with `rtk`.
`rtk git add . && rtk git commit -m "msg" && rtk git push`

## Stack

Next.js 15 App Router · PostgreSQL · NextAuth v5 · Tailwind · Docker · PWA · Prisma · Stripe

## Docker Workflow (app runs ONLY in Docker — Prisma Windows incompatible)

```powershell
docker-compose -f docker-compose.dev.yml up -d          # start
docker-compose -f docker-compose.dev.yml down            # stop
docker-compose -f docker-compose.dev.yml logs -f app     # logs
docker-compose -f docker-compose.dev.yml run --rm -e DATABASE_URL=postgresql://poincon:poincon_dev_password@db:5432/poincon app sh -c "apk add --no-cache openssl && npx prisma db push --skip-generate"  # schema sync
```

## Key Facts

- **DB port**: 5433 externe (5432 pris par Veeam)
- **DB interne Docker**: `postgresql://poincon:poincon_dev_password@db:5432/poincon`
- **Migrations**: `db push` (pas `migrate dev` — shadow DB incompatible)
- **Hot reload**: `WATCHPACK_POLLING=true`
- **Seed plans**: `node prisma/seed.js` (dans container)

## Roles: ADMIN | MANAGER | EMPLOYEE

- ADMIN → `/admin/dashboard/*` (full access)
- MANAGER → `/manager/dashboard` (équipe uniquement)
- EMPLOYEE → `/app/*`

## Plans: FREE | SOLO | TEAM | ENTERPRISE

- Helper: `src/lib/plan.ts` → `planCanAccess(plan, feature)`
- Stripe: `/api/stripe/checkout?plan=solo&billing=monthly`
- Webhook: `/api/stripe/webhook`

## Crons (busybox crond en Docker prod)

- `0 15 * * 1-5` → `/api/cron/end-of-day-reminder` (17h belge)
- `0 5 * * 1` → `/api/cron/scheduled-export` (lundi, Enterprise)
- `0 5 1 * *` → `/api/cron/scheduled-export` (1er mois, Team)
- `0 3 1 1 *` → `/api/cron/anonymize-old-logs` (1er jan, RGPD 3 ans)
- Secret: `CRON_SECRET` header `x-cron-secret`

## Key Skills

`/poincon-dev` · `/rtk-dev` · `/security-review` · `/deploy-portainer` · `/nextjs-app-router-patterns`

## Deploy

- Vercel: auto push to main
- Docker/NAS: `/deploy-portainer`

# Pointon — Next.js 16 · Pointage légal belge

**Golden Rule**: Always prefix commands with `rtk`.
`rtk git add . && rtk git commit -m "msg" && rtk git push`

## Stack
Next.js 16 App Router · PostgreSQL · NextAuth v5 · Tailwind · Docker · PWA · Prisma · Stripe · Brevo

## Docker → `/pointon-dev`
```powershell
docker-compose -f docker-compose.dev.yml up -d   # start
docker-compose -f docker-compose.dev.yml logs -f app
```

## Schema Changes (BOTH steps required)
```powershell
docker-compose -f docker-compose.dev.yml run --rm -e DATABASE_URL=postgresql://pointon:pointon_dev_password@db:5432/pointon app sh -c "apk add --no-cache openssl && npx prisma db push --skip-generate && npx prisma generate"
docker-compose -f docker-compose.dev.yml up -d app
```

## Key Facts
- **DB port**: 5433 externe · interne Docker: `db:5432`
- **Migrations**: `db push` only — JAMAIS `migrate dev` (shadow DB incompatible)
- **Env vars**: Docker lit `.env` (PAS `.env.local`)
- **Hot reload**: `WATCHPACK_POLLING=true`

## Roles: SUPER_ADMIN > ADMIN > MANAGER > EMPLOYEE
- ADMIN → `/admin/dashboard/*` | MANAGER → `/manager/dashboard` | EMPLOYEE → `/app/*`
- SUPER_ADMIN → `/super-admin/*` + override plan Enterprise

## Plans: FREE | SOLO | TEAM | ENTERPRISE
- Helper: `src/lib/plan.ts` → `planCanAccess(plan, feature)`
- Checkout: `GET /api/stripe/checkout?plan=solo&billing=monthly` → `/pointon-stripe`

## Invitations employés
- `POST /api/admin/invitations` → email Brevo, token 48h
- `/set-password?token=xxx` → crée mot de passe → auto-login

## Facturation (roadmap: Stripe Tax TVA + PayPal + Odoo/Peppol B2B belge 2026)

## Crons (busybox crond Docker prod)
- `0 15 * * 1-5` reminder · `0 5 * * 1` export Enterprise · `0 5 1 * *` export Team
- Auth: `CRON_SECRET` header `x-cron-secret` → `/pointon-cron`

## Deploy (v0.3.7)
- **Prod**: pointon.ced-it.be (Hostinger VPS, Docker)
- **CI/CD**: à faire → `/pointon-cicd`
- **Backup NAS**: `/deploy-portainer`

## Key Skills
`/pointon-dev` · `/pointon-stripe` · `/pointon-cicd` · `/pointon-cron` · `/rtk-dev` · `/security-review`

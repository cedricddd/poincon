# PoinçOn — Next.js 16 · Pointage légal belge

**Golden Rule**: Always prefix commands with `rtk`.
`rtk git add . && rtk git commit -m "msg" && rtk git push`

## Stack
Next.js 16 App Router · PostgreSQL · NextAuth v5 · Tailwind · Docker · PWA · Prisma · Stripe · Brevo

## Docker Workflow
```powershell
docker-compose -f docker-compose.dev.yml up -d                    # start
docker-compose -f docker-compose.dev.yml down                     # stop
docker-compose -f docker-compose.dev.yml logs -f app              # logs
docker-compose -f docker-compose.dev.yml up -d app                # recreate (env changes)
```

## Schema Changes (ALWAYS both steps)
```powershell
docker-compose -f docker-compose.dev.yml run --rm -e DATABASE_URL=postgresql://poincon:poincon_dev_password@db:5432/poincon app sh -c "apk add --no-cache openssl && npx prisma db push --skip-generate && npx prisma generate"
docker-compose -f docker-compose.dev.yml up -d app
```

## Key Facts
- **DB port**: 5433 externe (5432 pris par Veeam) · interne Docker: `db:5432`
- **Migrations**: `db push` only (shadow DB incompatible) — JAMAIS `migrate dev`
- **Env vars**: Docker lit `.env` (PAS `.env.local`) pour injection dans le container
- **Hot reload**: `WATCHPACK_POLLING=true`

## Roles: ADMIN | MANAGER | EMPLOYEE | SUPER_ADMIN
- ADMIN → `/admin/dashboard/*` | MANAGER → `/manager/dashboard` | EMPLOYEE → `/app/*`
- SUPER_ADMIN → `/super-admin/*` + override plan Enterprise

## Plans: FREE | SOLO | TEAM | ENTERPRISE
- Helper: `src/lib/plan.ts` → `planCanAccess(plan, feature)`
- Checkout: `/api/stripe/checkout?plan=solo&billing=monthly`
- Cancel: `POST /api/stripe/cancel` · Reactivate: `POST /api/stripe/reactivate`
- Portal: `GET /api/stripe/portal` · Webhook: `/api/stripe/webhook`
- `stripeCancelAtPeriodEnd` tracké en DB + webhook `customer.subscription.updated`

## Invitations employés
- `POST /api/admin/invitations` → envoie email Brevo avec token 48h
- `/set-password?token=xxx` → l'employé crée son mot de passe → auto-login
- Modèle: `UserInvitation` (token, companyId, role, expiresAt, usedAt)

## Facturation (en cours)
- **Stripe Tax TVA**: à implémenter (21% BE, autoliquidation UE B2B, 0% hors UE)
- **PayPal**: à ajouter comme méthode alternative
- **Odoo + Peppol**: webhook `invoice.payment_succeeded` → créer facture Odoo → transmission Peppol UBL BIS 3.0 (obligatoire B2B belge depuis jan 2026)

## Crons (busybox crond en Docker prod)
- `0 15 * * 1-5` → end-of-day reminder | `0 5 * * 1` → export Enterprise
- `0 5 1 * *` → export Team | `0 3 1 1 *` → anonymize RGPD
- Secret: `CRON_SECRET` header `x-cron-secret`

## Stripe CLI (dev webhooks)
```powershell
stripe listen --api-key sk_test_... --forward-to http://localhost:3000/api/stripe/webhook
# → copier le whsec_ dans .env STRIPE_WEBHOOK_SECRET, puis: docker-compose up -d app
```

## Key Skills
`/poincon-dev` · `/poincon-stripe` · `/rtk-dev` · `/security-review` · `/deploy-portainer`

## Deploy
- Hostinger VPS: production (Node.js + Docker) · Docker/NAS: `/deploy-portainer` (backup)
- CI/CD: GitHub Actions → SSH deploy au push main (voir TODO.txt DÉPLOIEMENT)

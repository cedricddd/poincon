# Pointon — Next.js 16 · Pointage légal belge

**Golden Rule**: Always prefix commands with `rtk`.
`rtk git add . && rtk git commit -m "msg" && rtk git push`

## Stack

Next.js 16 App Router · PostgreSQL · NextAuth v5 · Tailwind · Docker · PWA · Prisma · Stripe · Brevo

## Docker Dev → `/pointon-dev`

```powershell
docker-compose -f docker-compose.dev.yml up -d        # start
docker-compose -f docker-compose.dev.yml logs -f app   # logs
```

## Schema Changes (dev — BOTH steps required)

```powershell
docker-compose -f docker-compose.dev.yml run --rm app sh -c "apk add --no-cache openssl && npx prisma db push --skip-generate && npx prisma generate"
docker-compose -f docker-compose.dev.yml up -d app
```

## ⚠️ Schema en prod (obligatoire après deploy si schema modifié)

```bash
# ⚠️ Toujours pinner la version (npx sans version = prisma v7 incompatible)
ssh root@141.94.102.226 "pct exec 106 -- bash -c 'cd /opt/pointon && docker compose run --rm app sh -c \"npx prisma@5.22.0 db push --accept-data-loss\"'"
```

> Vérifier : `git diff HEAD~1 prisma/schema.prisma` — Sans ça : P2021 silencieux → UI vide.

## Seed en prod (après fresh deploy ou ajout de plans)

```bash
ssh root@141.94.102.226 "pct exec 106 -- bash -c 'cd /opt/pointon && docker compose run --rm app sh -c \"npm install bcryptjs --no-save --quiet && node prisma/seed.js\"'"
```

## Key Facts

- **DB** : 5433 externe · interne Docker `db:5432` · `.env` (PAS `.env.local`)
- **Migrations** : `db push` only — JAMAIS `migrate dev`
- **Build prod** : `--experimental-build-mode compile` (bug Next 16)
- **Plans seed** : `node prisma/seed.js` après fresh deploy (table Plan vide par défaut)

## Roles: SUPER_ADMIN > ADMIN > MANAGER > EMPLOYEE

- ADMIN → `/admin/dashboard/*` | MANAGER → `/manager/dashboard` | EMPLOYEE → `/app/*`
- SUPER_ADMIN → `/super-admin/*` + override plan Enterprise

## Plans: FREE | STARTER | TEAM | BUSINESS | ENTERPRISE

- Helper: `src/lib/plan.ts` → `planCanAccess(plan, feature)`
- Checkout: `GET /api/stripe/checkout?plan=starter&billing=monthly` → `/pointon-stripe`

## Invitations

`POST /api/admin/invitations` → Brevo token 48h → `/set-password?token=xxx`

## Crons (busybox crond Docker prod)

- `0 15 * * 1-5` reminder · `0 5 * * 1` Enterprise weekly · `0 5 1 * *` Team monthly
- `0 3 1 1 *` anonymize RGPD · Auth: `x-cron-secret` header → `/pointon-cron`

## Deploy

- **Prod** : pointon.be · OVH KS-5-A · LXC 106 (141.94.102.226)
- **SSH** : `ssh root@141.94.102.226 "pct exec 106 -- bash -c 'cd /opt/pointon && git pull origin main && docker compose up -d --build app'"`
- **CI/CD** : GitHub Actions auto-deploy → `/pointon-cicd`

## i18n (next-intl FR/NL/EN/DE)

- Routes préfixées `/[locale]/...` · Import `Link`/`useRouter` depuis `@/i18n/navigation`
- Piège : `proxy.ts` doit forcer `x-next-intl-locale` header avant pass-through
- Messages : `messages/{fr,nl,en,de}.json` · Namespaces dans `src/i18n/request.ts`
- → `/pointon-i18n` pour les patterns complets

## Key Skills

`/pointon-dev` · `/pointon-i18n` · `/pointon-kiosk` · `/pointon-planning` · `/pointon-stripe` · `/pointon-cicd` · `/pointon-cron` · `/rtk-dev` · `/security-review`

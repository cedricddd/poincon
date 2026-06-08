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
docker-compose -f docker-compose.dev.yml run --rm -e "DATABASE_URL=postgresql://poincon:n0Ad5fxVQRhQocpiI4E7LGom0gu97ek@db:5432/poincon" app sh -c "apk add --no-cache openssl && npx prisma db push --skip-generate && npx prisma generate"
docker-compose -f docker-compose.dev.yml up -d app
```

## ⚠️ Deploy + Schema : db push OBLIGATOIRE en prod

Si `prisma/schema.prisma` a changé, exécuter **après le deploy** :

```bash
ssh root@141.94.102.226 "pct exec 106 -- bash -c 'cd /opt/pointon && docker compose run --rm app sh -c \"npx prisma db push\"'"
```

> **Sans ça** : tables manquantes → P2021 silencieux → UI vide.
> Vérifier : `git diff HEAD~1 prisma/schema.prisma`

## Key Facts

- **DB port**: 5433 externe · interne Docker: `db:5432`
- **Migrations**: `db push` only — JAMAIS `migrate dev` (shadow DB incompatible)
- **Env vars**: Docker lit `.env` (PAS `.env.local`)
- **Build prod**: `--experimental-build-mode compile` (bug Next 16 prerender)

## Roles: SUPER_ADMIN > ADMIN > MANAGER > EMPLOYEE

- ADMIN → `/admin/dashboard/*` | MANAGER → `/manager/dashboard` | EMPLOYEE → `/app/*`
- SUPER_ADMIN → `/super-admin/*` + override plan Enterprise

## Plans: FREE | SOLO | TEAM | ENTERPRISE

- Helper: `src/lib/plan.ts` → `planCanAccess(plan, feature)`
- Checkout: `GET /api/stripe/checkout?plan=solo&billing=monthly` → `/pointon-stripe`

## Invitations

`POST /api/admin/invitations` → Brevo token 48h → `/set-password?token=xxx`

## Crons (busybox crond Docker prod)

- `0 15 * * 1-5` reminder · `0 5 * * 1` Enterprise weekly · `0 5 1 * *` Team monthly
- `0 3 1 1 *` anonymize RGPD · Auth: `x-cron-secret` header → `/pointon-cron`

## Deploy

- **Prod**: pointon.be · OVH KS-5-A · LXC 106 (IP 141.94.102.226)
- **SSH deploy**: `ssh root@141.94.102.226 "pct exec 106 -- bash -c 'cd /opt/pointon && git pull origin main && docker compose up -d --build app'"`
- **CI/CD**: manuel pour l'instant → `/pointon-cicd`

## Key Skills

`/pointon-dev` · `/pointon-stripe` · `/pointon-cicd` · `/pointon-cron` · `/rtk-dev` · `/security-review`

# PoinCon — Next.js 15 Legal Compliance App

**Golden Rule**: Always prefix commands with `rtk`. Safe on all commands — passes through if no filter exists.

```bash
rtk npm install && rtk next dev
rtk next build && rtk next start
rtk git add . && rtk git commit -m "msg" && rtk git push
```

## Stack

| Layer | Tech | Why |
|-------|------|-----|
| **Frontend** | Next.js 15 (App Router) | SSR, mobile-ready, fast deploy |
| **Database** | PostgreSQL | Audit trail, legal compliance |
| **Auth** | NextAuth v5 | JWT + session, RGPD-compliant |
| **Styling** | CSS Modules + Tailwind | Responsive + theme variables |
| **Deploy** | Vercel + Docker | Scalable, EU residency option |
| **Mobile** | PWA (responsive web) | No app store friction |
| **Logging** | Prisma + audit table | Legal traceability |

## Key Skills & Triggers

**Activate with context:**
- `/rtk-dev` — when building/testing/linting
- `/frontend-design` — when building UI components
- `/backend-patterns` — repository/service layer, auth, rate limiting
- `/nextjs-app-router-patterns` — App Router patterns, layouts, middleware
- `/security-review` — audit routes, auth, API endpoints
- `/deploy-portainer` — deploy to Docker/NAS when ready

## Commands

```bash
# Dev server (watches file changes)
rtk npm run dev

# Build for production
rtk next build

# Start production server
rtk npm start

# Prisma migrations
rtk npx prisma migrate dev --name <name>
rtk npx prisma generate

# Database seed (if applicable)
rtk npx prisma db seed

# Testing
rtk npm test
rtk npm run test:watch

# Linting
rtk npm run lint
rtk npm run lint:fix
```

## Deployment

- **Vercel**: Auto-deploy on git push to main
- **Docker/NAS**: Manual via `/deploy-portainer`
- **Database**: PostgreSQL (Vercel Postgres or self-hosted)

## Project Structure

```
src/
├── app/              # Next.js 15 App Router
│   ├── layout.tsx    # Root layout
│   ├── page.tsx      # Home
│   └── api/          # API routes
├── components/       # React components
├── lib/              # Utilities, helpers
├── styles/           # Global + CSS Modules
└── prisma/           # Database schema
```

## Time Tracking

Sessions logged to `project-time.json`. Auto-sync with Obsidian.

```bash
/track-time "Task description"  # Log current session
```

---

**Next**: Initialize git, create .env.local, set up Prisma schema.

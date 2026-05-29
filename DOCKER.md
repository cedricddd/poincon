# Docker Setup for Pointon

## Quick Start

### Prerequisites
- Docker Desktop installed and running
- No services on ports 3000 (Next.js) and 5432 (PostgreSQL)

### First Time Setup

1. **Copy environment file**:
   ```powershell
   copy .env.example .env.local
   ```

2. **Start containers**:
   ```powershell
   docker-compose up -d
   ```

3. **Wait for PostgreSQL to be ready** (check logs):
   ```powershell
   docker-compose logs db
   ```

4. **Run Prisma migrations**:
   ```powershell
   docker-compose exec app npx prisma migrate deploy
   ```

5. **Access the app**:
   - Open http://localhost:3000

### Common Commands

| Command | Purpose |
|---------|---------|
| `docker-compose up -d` | Start all services in background |
| `docker-compose down` | Stop and remove containers |
| `docker-compose logs -f` | View logs (all services) |
| `docker-compose logs -f app` | View Next.js app logs |
| `docker-compose logs -f db` | View PostgreSQL logs |
| `docker-compose ps` | Show running containers |
| `docker-compose exec app bash` | Open shell in app container |
| `docker-compose exec db psql -U pointon -d pointon` | Access PostgreSQL CLI |

### Database Management

**Create a new migration**:
```powershell
docker-compose exec app npx prisma migrate dev --name <migration_name>
```

**Reset database** (⚠️ deletes all data):
```powershell
docker-compose exec app npx prisma migrate reset
```

**View database schema**:
```powershell
docker-compose exec db psql -U pointon -d pointon -c "\dt"
```

### Rebuilding the App

**Rebuild app image** (after package.json changes):
```powershell
docker-compose build --no-cache
docker-compose up -d
```

### Environment Variables

Edit `.env.local` to customize:
```env
# Database
DB_USER=pointon
DB_PASSWORD=pointon_dev_password
DB_NAME=pointon

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here
```

⚠️ **Important**: Change `NEXTAUTH_SECRET` and `DB_PASSWORD` in production!

### Troubleshooting

**App keeps crashing**:
```powershell
docker-compose logs app
```

**Database won't start**:
```powershell
docker-compose down -v  # Remove volume
docker-compose up -d    # Recreate
```

**Port 3000 already in use**:
```powershell
# Change in docker-compose.yml: "3000:3000" → "3001:3000"
```

**Can't connect to database**:
- Verify PostgreSQL container is running: `docker-compose ps`
- Check DATABASE_URL in .env.local matches docker-compose.yml
- Wait 10-15 seconds for PostgreSQL to be ready

## Production Notes

- **Volume**: PostgreSQL data persists in `postgres_data` volume
- **Health checks**: Both app and database have health checks configured
- **Auto-restart**: App restarts automatically if it crashes
- **Signals**: Uses dumb-init to properly handle shutdown signals
- **Non-root user**: App runs as `nextjs` user for security

# PoinçOn — Démarrer la journée

## 1. Lancer l'environnement

```powershell
cd "c:\Users\ced-gamer\apps\PoinçOn"
docker-compose -f docker-compose.dev.yml up -d
```

Attendre ~30 secondes, puis ouvrir : http://localhost:3000

---

## 2. Arrêter en fin de journée

```powershell
docker-compose -f docker-compose.dev.yml down
```

---

## Commandes utiles

```powershell
# Voir les logs en direct
docker-compose -f docker-compose.dev.yml logs -f app

# Redémarrer l'app (si bug)
docker-compose -f docker-compose.dev.yml restart app

# Passer un utilisateur en ADMIN
echo 'UPDATE "User" SET role = ''ADMIN'' WHERE email = ''ton@email.com'';' | docker exec -i poincon-db-dev psql -U poincon -d poincon
```

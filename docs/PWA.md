# PoinçOn PWA — Mobile-First Progressive Web App

## 🎯 Architecture: Aggressive Sync Avec Fallback PENDING

L'approche prioritaire **sécurité légale** :
- ✅ Essayer synchroniser **immédiatement** (timeout 5s)
- ✅ Si échec → sauvegarder localement avec statut **PENDING**
- ✅ Retry automatiquement **toutes les 5 secondes tant qu'il reste des pointages en attente**
- ✅ Tableau de présence n'affiche que les pointages **SYNCED** (fiables)
- ✅ Pointages PENDING affichent badge **"⏳ en attente de sync"**

## Features Implemented

### ✅ Service Worker (`public/sw.js`)
- **Install**: Cache des assets au premier chargement
- **Stratégies**:
  - **API**: Network-first avec fallback cache (données fraîches prioritaires)
  - **Images**: Cache-first avec update réseau
  - **Assets statiques** (JS, CSS, fonts): Cache-first
  - **HTML**: Network-first avec page offline fallback
- **Offline**: Affiche page offline si réseau indisponible
- **Cleanup**: Supprime anciennes versions de cache

### ✅ Synchronisation Agressive (`src/hooks/useOfflineSync.ts`)
- **Timeout court** : 5 secondes pour chaque sync (`AbortController`)
- **Déclencheurs** : pointage mis en file, retour d'onglet, événement `online`, timer 5s
- **Aucun timer quand la file est vide** — zéro transaction IndexedDB au repos
- **Statuts** : `pending` | `failed`
- **Max retries** : 5 tentatives, puis `failed` (jamais supprimé silencieusement — l'employé le vide via ×)
- **IndexedDB** : une seule connexion partagée par page, rouverte à la demande
- **iOS Safari** : connexion fermée quand l'onglet passe en arrière-plan, sync suspendue tant que
  `document.hidden` — un handle suspendu par WebKit renvoie sinon
  `UnknownError: Attempt to get records from database without an in-progress transaction`

### ✅ UI avec Statuts PENDING
- **OfflineIndicator** : badge "Synchronisation en cours..." ou "N pointage(s) en attente"
- **Badge PENDING** : "⏳ en attente" sur les pointages non-synced
- **Page offline** : fallback avec messaging rassurant
- **Toast notifications** : indique si pointage est officiel ou en attente

### ✅ Intégration Horloge
- Détecte réseau avec timeout court
- Affiche "en attente de sync" si sync échoue
- UI update immédiat (optimistic)
- Badge visible du statut PENDING
- Auto-sync tant qu'il reste des pointages en file

### ✅ PWA Metadata Complet
- `manifest.json` : app name, icônes, standalone mode
- Meta tags : Apple Web App, theme colors, viewport
- Icons : 192x192 et 512x512 SVG maskable

## 📊 Flux de Synchronisation

### Scénario Online (Idéal)
```
User click "ARRIVÉE"
  ↓
Fetch POST /api/clock/record (timeout 5s)
  ↓
✓ Success → Record sauvegardé au serveur
  ↓
Toast : "Arrivée enregistrée à 09:42 ✓"
```

### Scénario Timeout (Réseau lent)
```
User click "ARRIVÉE"
  ↓
Fetch POST /api/clock/record (5s timeout)
  ↓
✗ Timeout/Erreur → Fallback local
  ↓
Save to IndexedDB with status: "pending"
  ↓
Toast : "Arrivée enregistrée à 09:42 (⏳ en attente de sync)"
  ↓
Auto-retry loop : toutes les 5 secondes (arrêt dès que la file est vide)
```

### Scénario Reconnexion
```
Network restored
  ↓
useOfflineSync() détecte changement
  ↓
syncPendingActions() boucle execute
  ↓
Chaque action PENDING : POST to /api/clock/record
  ↓
✓ Success → Update status to "synced" + remove from DB
✗ Fail → status: "pending", retries++
  ↓
Badge update : "Synchronisation 2 action(s)..."
  ↓
Après sync : badge disparaît
```

## 🔍 Tableau de Présence

**Important** : Le tableau affiche **SEULEMENT** les pointages `synced: true`
- Pointages PENDING n'apparaissent PAS dans comptage
- User voit badge "⏳" pour rappel
- Manager/Admin voient seulement officiel
- Conforme légal belgique (comptage réel seulement)

## 🧪 Testing Offline

### Chrome DevTools
1. DevTools → Application → Service Workers
2. Check "Offline"
3. Click "ARRIVÉE" → badge "⏳ en attente"
4. Uncheck "Offline" → auto-sync immédiat (événement `online`)

### Real Network
```bash
docker-compose -f docker-compose.dev.yml down
# App en offline, pointages sauvegardés localement
docker-compose -f docker-compose.dev.yml up -d
# Auto-sync démarre, badge disparaît
```

### View IndexedDB
1. DevTools → Application → IndexedDB → poincon
2. `pendingActions` store
3. Voir les actions avec `status: "pending"` ou `"syncing"`

## 📱 Installation

### iOS (Safari)
1. Safari → Share → Add to Home Screen
2. App mode standalone

### Android (Chrome)
1. Chrome → menu → "Install app"
2. App mode standalone

## ⚠️ Important pour Légalité

- **Pointage officiel** = synced au serveur seulement
- **Audit trail** = indexé uniquement les synced
- **Export certifié** = exclut les PENDING
- **RH/Manager** = voit seulement synced dans tableau présence
- **User** = voit badge "⏳" pour rappel sync en cours

## 🔄 Retry Logic

```
Retry 1 : 2s
Retry 2 : 2s
Retry 3 : 2s
Retry 4 : 2s
Retry 5 : 2s → si échoue, status = "failed" (marquer rouge)
```

## Next Steps

- [ ] Ajouter support offline pour page RTT
- [ ] Ajouter support offline pour page congés
- [ ] Push notification quand sync complete
- [ ] Page settings : "Clear offline data"
- [ ] Monitor IndexedDB quota (soft limit ~50MB)

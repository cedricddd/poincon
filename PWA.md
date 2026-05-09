# PoinçOn PWA — Mobile-First Progressive Web App

## Features Implemented

### ✅ Service Worker (`public/sw.js`)
- **Install**: Caches static assets on first load
- **Cache Strategies**:
  - **API routes**: Network-first with cache fallback (fresh data priority)
  - **Images**: Cache-first with network update
  - **Static assets** (JS, CSS, fonts): Cache-first
  - **HTML pages**: Network-first with offline fallback
- **Offline Handling**: Shows offline page when network unavailable
- **Cache Cleanup**: Removes old cache versions on activation

### ✅ Offline Data Persistence (`src/hooks/useOfflineSync.ts`)
- Stores pending actions in IndexedDB (clock punches, RTT, time-off)
- Auto-syncs to API when back online
- Tracks sync status with visual indicator

### ✅ Offline UI
- **Offline Indicator** (`src/components/OfflineIndicator.tsx`): Shows connection status and pending sync count
- **Offline Page** (`src/app/offline.tsx`): Fallback page when offline
- **Toast Notifications**: "mode offline" badges on clock actions

### ✅ Clock Integration
- `src/app/app/clock/page.tsx` updated to:
  - Detect offline status via `useOfflineSync()`
  - Save punch times to IndexedDB when offline
  - Show "mode offline" indicator in toast
  - Auto-sync when connection restored

### ✅ Mobile-First PWA Metadata
- `manifest.json`: App name, icons, start URL, display mode (standalone)
- Meta tags: Apple Web App capable, theme colors, viewport configuration
- Icons: 192x192 and 512x512 SVG icons for all device sizes

## How It Works

### Online Scenario
1. User clicks "ARRIVÉE" or "DÉPART"
2. App sends POST/PATCH request to `/api/clock/record`
3. Server returns record with ID
4. Data cached in API_CACHE

### Offline Scenario
1. User clicks "ARRIVÉE" or "DÉPART"
2. App detects offline (`navigator.onLine === false`)
3. Action saved to IndexedDB with `savePendingAction()`
4. Toast shows "mode offline ⏳"
5. UI updates immediately (optimistic)

### Reconnection Scenario
1. Network restored, `online` event fires
2. `useOfflineSync()` detects `isOnline` change
3. Auto-triggers `syncPendingActions()`
4. Each pending action POSTed to API
5. Successful actions removed from IndexedDB
6. Toast shows "Synchronisation N action(s)..."

## Cache Versioning

Caches are version-pinned:
- `poincon-app-v1`: HTML, static assets
- `poincon-api-v1`: API responses
- `poincon-images-v1`: Images

To bust cache, increment version: `poincon-app-v2`, etc.

## Testing Offline

### Chrome DevTools
1. Open DevTools → Application → Service Workers
2. Check "Offline" checkbox
3. Try clock punch → should save to IndexedDB
4. Uncheck "Offline" → should auto-sync

### Real Network
```bash
docker-compose -f docker-compose.dev.yml down  # stop network
# Use app offline
docker-compose -f docker-compose.dev.yml up -d  # restore network
# App auto-syncs pending actions
```

### View IndexedDB (Chrome DevTools)
1. Application → IndexedDB → poincon
2. View `pendingActions` store
3. See pending punch times with timestamps

## API Requirements

For offline sync to work, these endpoints must:
- Accept POST requests with offline-saved payloads
- Return 200 status on success
- Idempotent (safe to retry)

Current endpoints:
- `POST /api/clock/record` (punch)
- `POST /api/rtt` (rest/recovery time)
- `POST /api/time-off` (time off)

## Installation on Devices

### iOS (Safari)
1. Open Safari
2. Share menu → Add to Home Screen
3. Opens as standalone app (no browser chrome)

### Android (Chrome)
1. Open Chrome → menu → "Install app"
2. Or: three dots → "Install PoinçOn"
3. Opens as standalone app

## Next Steps

- [ ] Add RTT page offline support (follow clock pattern)
- [ ] Add time-off page offline support
- [ ] Implement push notifications for sync completion
- [ ] Add settings page for cache management ("Clear offline data")
- [ ] Monitor IndexedDB size limits (typically 50% of storage quota)

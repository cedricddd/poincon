# 📱 Pointon Mobile Test Plan — Security & UX

**Date**: 2026-05-15  
**Focus**: Validate clock in/out security fixes + mobile UX  
**Device**: iPhone SE / iPhone 14 / iPhone 15  
**Environment**: http://localhost:3000 (dev server)

---

## 🔧 Setup

### On Mac (Local)
```bash
# 1. Open Xcode Simulator
open -a Simulator

# 2. Select iPhone (default is fine)
# Menu: Device → iPhone 15 (or SE/14)

# 3. Open Safari in Simulator
# Cmd+Shift+K to open address bar

# 4. Navigate to localhost
# Type: http://localhost:3000
# Or get local IP: ipconfig (Windows) / ifconfig (Mac)
```

### On Cloud (TestMu)
```bash
# Alternative: cloud-based testing
# https://www.testmu.ai
# Upload: http://localhost:PORT
# Select device + OS version
```

---

## ✅ Test Scenarios

### Test 1: Clock In (Happy Path)
**Expected**: Timestamp validated, record created

**Steps**:
1. Login to Pointon
2. Navigate to "Clock" tab
3. Tap "Clock In" button
4. ✅ Verify:
   - Button becomes disabled (showing loading)
   - Success message appears ("Clocked in at HH:MM")
   - Clock appears on dashboard

### Test 2: Clock In - Prevent Double Clock (NEW SECURITY FIX)
**Expected**: 409 error - "Already clocked in"

**Steps**:
1. After Test 1, user is clocked in
2. Tap "Clock In" again
3. ✅ Verify:
   - Error message: "Already clocked in. Clock out first."
   - Button disabled

### Test 3: Clock Out (Happy Path)
**Expected**: Validates departure > arrival, creates record

**Steps**:
1. User clocked in from Test 1
2. Tap "Clock Out" button
3. ✅ Verify:
   - Duration shown (e.g., "3h 24m")
   - Success message: "Clocked out at HH:MM"
   - Dashboard shows completed entry

### Test 4: Clock Out - Validate Departure > Arrival (NEW SECURITY FIX)
**Expected**: Error if timestamps invalid

**Steps** (manual API testing):
```bash
# Try to submit departure time BEFORE arrival time
# Should get: "Departure time must be after arrival time"
```

### Test 5: Edge Case - Invalid Timestamp (±5min tolerance)
**Expected**: 400 error - "Invalid timestamp"

**How to test**:
1. Open browser DevTools (F12)
2. Go to Network tab
3. Filter: "clock"
4. Intercept POST request to `/api/clock/record`
5. Modify `arrivalTime` to:
   - 10 minutes ago → ❌ Should reject
   - 1 hour in future → ❌ Should reject
   - Current time (±1 min) → ✅ Should accept

### Test 6: Edge Case - Invalid Duration (>12h)
**Expected**: 400 error - "Invalid duration"

**How to test**:
1. Create a clock record (POST `/api/clock/record`)
2. Try to clock out with 13h duration
3. Should reject: "Invalid duration (must be 1 minute to 12 hours)"

### Test 7: Ownership Validation (CRITICAL FIX)
**Expected**: User cannot modify another user's record

**Setup** (requires 2 users):
1. User A: Clock in/out normally ✅
2. User B: Try to PATCH User A's recordId
3. ❌ Should get: "Record not found or not authorized" (403)

---

## 📊 Performance Checks

### Load Time
- Page load: < 2 seconds ✅
- Clock button response: < 500ms ✅
- Success message: Instant ✅

### Responsive Design
- Portrait: Clock button centered, readable ✅
- Landscape: Layout adapts ✅
- Touch targets: 48x48px minimum ✅

### Mobile-Specific
- Haptic feedback on tap (if supported) ✅
- No horizontal scroll ✅
- Visible on notch/safe areas ✅

---

## 🐛 Bug Report Template

If you find issues:

```
**Issue**: [What broke]
**Device**: iPhone SE / 14 / 15
**Steps to Reproduce**:
1. ...
2. ...
**Expected**: [What should happen]
**Actual**: [What happened]
**Screenshot**: [Attach image]
```

---

## ✨ Sign-Off Checklist

- [ ] Test 1: Clock In (happy path) ✅
- [ ] Test 2: Prevent double clock-in ✅
- [ ] Test 3: Clock Out (happy path) ✅
- [ ] Test 4: Departure > Arrival validation ✅
- [ ] Test 5: Invalid timestamp rejection ✅
- [ ] Test 6: Invalid duration rejection ✅
- [ ] Test 7: Ownership validation ✅
- [ ] Load time < 2s ✅
- [ ] No bugs blocking production ✅

---

**When all tests pass**: Ready for production! 🚀


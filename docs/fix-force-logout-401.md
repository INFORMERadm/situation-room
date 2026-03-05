# Fix: Users Force-Logged Out After a Few Seconds

## Date
2026-03-05

## Symptom
Users were being force-logged out within seconds of logging in. The browser console showed a flood of `401 (Unauthorized)` errors on every call to the `global-monitor` edge function, followed by a `429` on `/auth/v1/token?grant_type=refresh_token`, and then a redirect to `/login`.

## Root Cause

Three compounding issues:

### 1. Edge Function Deployed with `verify_jwt: true` (Primary Cause)
The `global-monitor` edge function was deployed with `verify_jwt: true`. This means Supabase's API gateway validates the JWT **before** the function code runs. The function itself doesn't use per-user authentication at all -- it uses a service role key internally. So when requests were sent with the anon key (or an expired/near-expiry user token), the gateway rejected them with 401 before the function even executed.

**Fix:** Redeployed with `verify_jwt: false`:
```
mcp__supabase__deploy_edge_function(slug: "global-monitor", verify_jwt: false)
```

### 2. Token Refresh Stampede in `api.ts`
Every API call independently called `supabase.auth.refreshSession()` when the token was near expiry or on 401 retry. With 10+ concurrent requests (market overview, quotes, movers, sectors, earnings, economic calendar, news, chart, company profile, AI sessions, etc.), this created a stampede of simultaneous refresh calls that hit Supabase's rate limit (429). Once rate-limited, no request could refresh, and the session was destroyed.

**Fix:** Added a singleton `refreshTokenOnce()` function that deduplicates refresh calls. All concurrent requests share a single refresh operation, and the result is cached for 5 seconds.

### 3. Aggressive Polling Intervals
- Market overview polled every **3 seconds**
- Quote refresh polled every **3 seconds**
- Retry timer fired after **5 seconds**

This created a constant barrage of requests that amplified both the 401 and 429 problems.

**Fix:** Relaxed intervals:
- Market overview: 3s -> 30s
- Quote refresh: 3s -> 15s
- Retry timer: 5s -> 8s

### 4. Auth State Race Condition in `AuthContext.tsx`
The original code called both `getSession()` and `onAuthStateChange()` separately. The `INITIAL_SESSION` event from `onAuthStateChange` could fire and overwrite user/session state to `null` momentarily, causing `ProtectedRoute` to redirect to `/login`.

**Fix:** Removed the separate `getSession()` call. Now uses only `onAuthStateChange` with proper handling of the `INITIAL_SESSION` event. Only clears user state on an explicit `SIGNED_OUT` event.

## How to Diagnose Similar Issues in the Future

1. **Check the console for 401 patterns.** If ALL edge function requests are 401 from the very first load, the issue is likely `verify_jwt: true` on a function that doesn't need it.

2. **Check for 429 on `/auth/v1/token`.** This means too many concurrent token refresh attempts. Look for code that calls `refreshSession()` without deduplication.

3. **Run `list_edge_functions`** to check `verifyJWT` settings on all functions.

4. **Rule of thumb:** Only set `verify_jwt: true` if the edge function actually reads the user's JWT to identify the caller (e.g., `auth.uid()`). If the function uses a service role key or doesn't need per-user auth, set it to `false`.

## Files Changed
- `src/lib/api.ts` -- Singleton token refresh, reduced retries
- `src/hooks/useMarketsDashboard.ts` -- Relaxed polling intervals
- `src/context/AuthContext.tsx` -- Fixed auth state race condition
- `supabase/functions/global-monitor` -- Redeployed with `verify_jwt: false`

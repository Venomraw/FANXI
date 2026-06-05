# FanXI E2E (Playwright)

End-to-end tests that drive a real browser against the running app.

## Prerequisites — start both servers (manual, per project setup)

```bash
# terminal 1 — backend (http://localhost:8000)
cd backend && python run.py --dev

# terminal 2 — frontend (http://localhost:3000)
cd frontend && npm run dev
```

## Run

```bash
cd frontend
npm run test:e2e          # headless
npm run test:e2e:ui       # interactive UI mode
npm run test:e2e:report   # open last HTML report
```

Override targets with `E2E_BASE_URL` / `E2E_API_URL` if not on default ports.

## Coverage

| Spec | What it checks |
|------|----------------|
| `smoke.spec.ts` | All public routes load (HTTP < 400), no client crash, no stray redirect to `/login` |
| `simulator.spec.ts` | World Cup 2026 simulator renders + reset control works; first-run team picker |
| `auth.spec.ts` | Client guard redirects logged-out users off protected routes; public routes are NOT over-guarded; real register→login flow reaches `/hub` |

## Auth model

Route protection lives in `app/(app)/(protected)/layout.tsx` (client-side),
**not** in middleware — the httpOnly refresh cookie is set by the API on a
different origin (`samesite=none`) and is invisible to Next.js edge middleware.
The guard waits for the silent `/auth/refresh` to resolve, then redirects to
`/login?next=<path>` only when there is no authenticated user. The `next`
target is sanitized (`src/lib/redirect.ts`) to same-origin relative paths.

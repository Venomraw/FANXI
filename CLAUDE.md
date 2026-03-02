# FanXI — UI + Code Rules (Non-Negotiable)

## Stack
- FastAPI (localhost:8000)
- Next.js App Router + Tailwind v4
- SQLite + SQLModel
- @dnd-kit (drag & drop)

---

## Typography — Non-Negotiable
**Primary display voice**
- `font-display`: **Space Grotesk**, weight **600** (hero, big headings, large numbers)

**Body voice**
- `font-sans`: **Syne** (default body + UI labels)

**Mono usage (micro ONLY)**
- `font-mono`: **JetBrains Mono**
- Allowed only for: countdown units, rank tags, tiny stat labels, "chip" metadata
- **Never** use mono for: buttons, tabs, nav links, section titles, big labels

**Bebas Neue is BANNED**
- Remove from project entirely

---

## Font Sizes — Minimum Rules
- Hero numbers / hero title: `clamp(72px, 12vw, 128px)`
- Section titles: **40–56px**
- Card titles: **18–24px**
- Body: **14–15px**
- Micro labels: **min 11px** (never smaller)
- Letter-spacing: **max 1.5px** (never 4px)

---

## Layout — Make It Breathe
**Container (always)**
- Use a global container width for every major section:
  - `--container: 1200px`
  - `max-width: var(--container); margin: 0 auto; padding: 0 28px;`
- Never let major content run full-bleed by accident

**Vertical rhythm**
- Section padding: `py-20` to `py-28` (80–112px)
- Between blocks inside a section: 16–28px gaps
- Cards in grids: 16–24px gap minimum

---

## Header / Nav — Fix "Small + Clamped"
Target: header should feel premium, not cramped.

**Nav sizing**
- Height feel: ~72px (via padding)
- `padding: 18px 0;`
- Inside: `.nav-inner { max-width: var(--container); margin:0 auto; padding: 0 28px; }`

**Nav typography**
- Logo: Space Grotesk 600, ~18px, subtle tracking (0.4–0.8px)
- Nav links: Syne 600, ~13px
- Use hover states with soft glass background, not just color change

**No mono for nav**
- Mono is micro-only

---

## Design Tokens
- `--dark:    #060A06`
- `--dark3:   #0D130D`
- `--border:  #1E2D1E`
- `--text:    #E8F5E8`
- `--muted:   #5A7A5A`
- `--gold:    #FFD23F`
- `--success: #00FF85`
- `--blue:    #00D1FF`

---

## Glassmorphism — .glass-panel
- 90% dark bg
- `backdrop-filter: blur(24px)`
- subtle green border (thin, not loud)

---

## Pitch
- Background: radial gradient
- Empty slots: `#1E2D1E`
- Filled slots: neon glow

---

## Interactions
- 0.55s ease transitions
- Active elements always glow
- Lock button strongest glow (`0 0 24px`)

---

## After Every Code Change
1. Run: `npx tsc --noEmit`
2. Fix ALL TS errors before done

---

## Static Squads Priority
48 WC 2026 teams × 23 players in:
- `backend/app/data/static_squads.py`

Priority:
1) Static
2) DB Cache
3) API-Football
4) Positional fallback

---

## Key File Paths
- `frontend/app/globals.css`
- `frontend/app/layout.tsx`
- `frontend/src/components/pitch/PitchBoard.tsx`
- `frontend/src/components/pitch/PitchSlot.tsx`
- `frontend/src/components/pitch/DraggablePlayer.tsx`
- `frontend/src/components/pitch/MatchEvents.tsx`
- `frontend/app/login/page.tsx`
- `backend/app/api/squads.py`
- `backend/app/data/static_squads.py`

# Maker's space horseshoe Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a password-gated one-page maker's space on `develop` with a seven-card horseshoe, grain paper, and a fixed daily rotation of 91 frames — without deploying to `main`.

**Architecture:** Pure functions own the fixed cycle list and day window; a small layout map owns desktop seats vs mobile 2–3–2; the React page renders seven seats from that window. Existing gallery JWT gate stays the door.

**Tech Stack:** Vite, React 19, Vitest, Playwright, TypeScript (ESM).

## Global Constraints

- Branch: `develop` only — no push to `main`, no production deploy.
- Spec: `docs/superpowers/specs/2026-11-04-makers-space-horseshoe-design.md`
- Vision: `docs/vision/makers-space.md`
- TDD required: failing test before production code.
- Do not commit photo binaries without explicit owner approval.
- Fonts/weights unchanged; text color only if contrast fails on grain paper.
- Day timezone default: `America/Denver`.

## File map

| File | Responsibility |
|---|---|
| `src/makers-space-cycle.ts` | Build fixed 91-frame cycle; select day window |
| `src/makers-space-layout.ts` | Desktop seat positions; mobile arc smash indices |
| `src/makers-space-day1.ts` | Day-1 path constants / seating table |
| `src/components/MakersSpaceView.tsx` | Renders seven seats (later task) |
| `src/*.test.ts` / `e2e/smoke.spec.ts` | Unit + smoke coverage |

---

### Task 1: Fixed cycle + day window (pure)

**Files:**
- Create: `src/makers-space-cycle.ts`
- Create: `src/makers-space-cycle.test.ts`
- Create: `src/makers-space-day1.ts`

- [ ] **Step 1: Failing tests** for cycle length 91, divisible by 7, day-1 block, no mid-cycle repeats of day-1 sheet paths, `brass_trojan` last, day 2 window starts at `people/guardian-classic-layup.jpg`, day 14 wraps to day 1.
- [ ] **Step 2: Run** `npm run test:run -- src/makers-space-cycle.test.ts` — expect FAIL.
- [ ] **Step 3: Minimal implementation** of cycle builder + `windowForDay(list, dayIndex)`.
- [ ] **Step 4: Run tests** — expect PASS.
- [ ] **Step 5: Commit** on `develop`.

### Task 2: Layout maps

**Files:**
- Create: `src/makers-space-layout.ts`
- Create: `src/makers-space-layout.test.ts`

- [ ] **Step 1: Failing tests** for desktop seat ids 1–7 and mobile rows `[[3,5],[2,4,6],[1,7]]`.
- [ ] **Step 2: Run** — expect FAIL.
- [ ] **Step 3: Implement maps.**
- [ ] **Step 4: Run** — expect PASS.
- [ ] **Step 5: Commit.**

### Task 3: Wire UI + smoke (later)

- [ ] Failing component/e2e: grain ground, seven seats, no role-label text in DOM, gate still required.
- [ ] Minimal `MakersSpaceView` + App wire on `develop`.
- [ ] `npm run test:e2e` / smoke green.
- [ ] Commit. Still no deploy.

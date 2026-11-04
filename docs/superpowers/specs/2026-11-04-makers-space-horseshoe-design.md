# Maker's space — Seven Card Horseshoe design

**Date:** 2026-11-04  
**Status:** Approved for implementation planning  
**Branch:** `develop` only (no `main` push, no deploy)

## Goal

Replace the contact-sheet lookbook metaphor on `develop` with one quiet page: the maker's space. Visitors see seven works arranged as a Seven Card Horseshoe Spread on grain paper. Every published still remains available by rotating a fixed cycle of sevens; nothing is lost, nothing is shuffled mid-cycle.

## Principles

1. The page introduces nothing but the work that is in it today.
2. Looking is the whole visit — no second door after the password.
3. One print offer may be named once, as words, in the same quiet as the pictures.
4. The page keeps no account of the career (no news, shop, discography).
5. The number of visitor choices stays the same when new media arrives — a new work replaces a seat; it does not add a section.
6. Typography: wordmark `adubsqz` uses **Audiowide** (Expressa / Texas Sun–adjacent heavy geometric display). UI and body use **Exo 2**. Grease-pencil mono may stay IBM Plex Mono. On grain paper, change text color only if contrast fails.

## Surfaces

### Ground

**Grain paper:** cream `#f4efe6` with a faint radial grain (whisper of tooth). Light, minimal, at peace. Not ink-black.

### Desktop — Seven Card Horseshoe Spread

Layout geometry from `7card_horseshoe_spread_layout.txt`. Role names (Past, Present, …) are documentation only; they are not printed on the page.

Seats 3 and 5 sit toward the center so they do not over- or underlap the left/right stacks.

### Day-one seating (opening spread)

| Seat | Role (doc only) | Frame |
|---:|---|---|
| 1 | Past | `color/driftwood-in-the-wash.jpg` — **the print** |
| 2 | Present | `color/creeper-wall.jpg` |
| 3 | Hidden Obstacles | `color/rain-puddle-ripples.jpg` |
| 4 | The Advice | `bw/000220500003-pier.jpg` |
| 5 | People's Attitudes | `people/bench-dog-waterfront.jpg` |
| 6 | Challenges | Shooks Run turret photo `~/photography/originals/gphotos/shooks_run/tudor.jpeg` (publish copy; light GIMP pass may remove house number; master untouched) |
| 7 | Outcome | Shooks Run drawing `~/photography/originals/gphotos/shooks_run/drawn_tutor.jpeg` (publish as-is) |

Card aspect ratio stays as shot (`object-fit: cover` in a fixed 3:4 seat is acceptable for layout chrome; do not crop masters differently for “effect”).

### Mobile — arc smash

```text
3 | 5
2 | 4 | 6
1 | 7
```

Same seven seats, same assets. No horseshoe chrome required on small viewports.

## Rotation (fixed list, not shuffle)

### Rules

1. Write **one fixed ordered list** once. No runtime skip logic.
2. Day *n* shows seven consecutive frames: `list[7*(n-1) .. 7*n)`.
3. Day 1 is the opening seating above.
4. Days 2… are `main`’s contact-sheet order (`arrangeContactSheet` / pins on `main`), with the five sheet frames that appear in day 1 removed so they do not repeat mid-cycle.
5. Shooks Run turret + drawing appear only in day 1 of each cycle (seats 6–7 of the opening block).
6. Final frame of the cycle: `brass_trojan` (subway Trojan Horns still; no edits; basename `brass_trojan`).
7. List length is **91** frames → **13** days of seven. Then the cycle returns to day 1.
8. Day key: calendar day in the site’s chosen timezone (document in plan; default America/Denver). Deterministic for tests via injectable clock.

### What stays off the opening spread

- Leafy Shooks Run pair (`thru_trees_a_home.jpeg`, `drawn_thru_trees_a_home.jpeg`) remains in originals until a later cycle rebuild.
- Private guitar / face session stays off the page.
- About collage is not a horseshoe seat.

## Password / access

Keep the existing password gate behavior from the lookbook (client JWT). After unlock, the visitor is already in the room — no menu of departments.

## Out of scope for this build

- Pushing or deploying to `main` / production Pages.
- Ecommerce cart, newsletter, career index.
- Hugging Face / vision-model training.
- Changing typefaces or font weights (contrast-only color tweaks allowed).
- Committing photo binaries without explicit owner approval.

## Testing requirements

Follow TDD. Expand unit, component, and e2e/smoke coverage for:

- Day-1 seating order and seat indices.
- Fixed cycle construction (no mid-cycle repeats; length divisible by 7; `brass_trojan` last).
- Day window selection for injectable dates (day 1, day 2 starts at layup path, day 13 ends on `brass_trojan`, day 14 wraps).
- Desktop horseshoe seat map vs mobile 2–3–2 arc smash.
- Grain-paper ground present; role labels absent from DOM.
- Gate still hides the room until password (existing e2e contract).
- Regression: no deploy path assumed from `develop`.

## Provenance

Brainstorming 2026-11-03/04. Quiet-maker research, sheet edit, Shooks Run folder, companion mockups (grain paper C, seating revision, mobile A).

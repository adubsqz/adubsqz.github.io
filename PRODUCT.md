# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Password holders — collectors, art directors, peers, and trade contacts who already have (or can DM for) the lookbook password. Job: meet a quiet maker's space of film stills (and later other media), then request a print quote or licensing outreach — not public checkout.

## Product Purpose

adubsqz is a password-gated maker's space on GitHub Pages. Visitors unlock grain-paper Work: seven works in a Seven Card Horseshoe Spread that rotates daily through a fixed cycle so nothing published is lost. They may open a plate and inquire; About carries film-first voice. Success means desire stays warm from the velvet rope through the seven into About and inquiry — then email follows offline.

## Positioning

One quiet page of owned, pre-cleared work — not a stock masonry shop, not an indexed studio, not a contact-sheet dump of eighty-nine choices. Password and Instagram DM are the access ritual; FormSubmit / Web3Forms / mailto carry inquiry without a server cart.

## Operating Context

- Password curtain (client JWT; optional Cloudflare edge photo-gate) → Work horseshoe (grain) → lightbox → About / contact.
- Design contract: `docs/superpowers/specs/2026-11-04-makers-space-horseshoe-design.md` (ships on `develop` first; live `main` until owner promotes).
- Gallery publishing is offline: masters under `~/photography/originals/` stay untouched; web JPEGs land via gallery import into `public/photos/still-life/`.
- Live shop is GitHub Pages; inquiry uses FormSubmit / Web3Forms / mailto to adubsqz@gmail.com.

## Capabilities and Constraints

- Confirmed: password gate, maker's space horseshoe (7 seats, daily rotation), owner logo (black/white on clear ground), About, contact inquire, rights copy, Instagram DM for password.
- Technical: static Pages SPA (Vite/React); no runtime `api/` on Pages; `VITE_E2E=1` bypasses the gate for Playwright.
- Do not edit or overwrite masters in place; do not commit imported photo binaries without explicit approval.
- Open: print-quote / licensing from the new lightbox, trade tearsheet, music/video seats replacing a photo so the count stays seven.

## Brand Commitments

- Name / mark: **adubsqz** (owner art at `public/adubsqz_logo_{black,white}.png`).
- Voice: film photography first; software / AWS as secondary About pitch.
- Access: Instagram DM @adubsqz for the password; never print the password in UI.
- Public origin: adubs.site.

## Product Principles

1. The stills (today's seven) lead; chrome and commerce recede until desire peaks.
2. Looking is the whole visit after the password — no second menu of rooms.
3. Film-first honesty: voice, materials, and access match analog practice.
4. Inquiry cools desire only as much as needed; shipping and payment stay after.
5. Rights and clearance stay visible when someone initiates outreach.

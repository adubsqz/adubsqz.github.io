# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Password holders — collectors, art directors, peers, and trade contacts who already have (or can DM for) the lookbook password. Job: browse real film stills in a private lookbook and request a print quote or licensing outreach, not complete public checkout.

## Product Purpose

adubsqz is a password-gated film photography lookbook and inquiry surface on GitHub Pages. Visitors unlock a contact-sheet Experience of 35mm and medium-format stills, open frames into a lightbox, and request a print quote or licensing / hire message. Success means desire stays warm from the velvet rope through the sheet into About and inquiry — then an email invoice or clearance conversation follows offline.

## Positioning

A real film contact-sheet lookbook (sprockets, gates, mono frame names, horizontal roll) of owned, pre-cleared stills — not a stock masonry shop or public ecommerce catalog. Password and Instagram DM are the access ritual; FormSubmit / Web3Forms / mailto carry inquiry without a server cart.

## Operating Context

- Password curtain (client JWT; optional Cloudflare edge photo-gate) → Work contact sheet → lightbox → print quote or Licensing/hire contact → About for voice and proof.
- Gallery publishing is offline: masters under `~/photography/originals/` stay untouched; web JPEGs land via gallery import (resize + © burn-in) into `public/photos/still-life/` with manifest entries.
- Live shop is GitHub Pages; inquiry uses FormSubmit / Web3Forms / mailto to adubsqz@gmail.com.

## Capabilities and Constraints

- Confirmed: password gate, film-roll gallery, lightbox, Request a print quote (size/medium/finish; shipping optional until quote), Licensing or hire contact, About (film-first voice + software pitch), rights/clearance copy, Instagram DM for password.
- Technical: static Pages SPA (Vite/React); no runtime `api/` on Pages; edge photo-gate is optional Worker; `VITE_E2E=1` bypasses the gate for Playwright.
- Do not edit or overwrite masters in place; do not commit imported photo binaries without explicit approval.
- Open (not yet product): trade tearsheet portal, set rental, multi-seat agency passwords — copy mentions interest; no shipping public checkout.
- Scaling idea (owner-optional, not blocking this rebrand): optional email capture on the photographic gate (“get lookbook updates”) before or beside unlock — builds a private list without public checkout; pairs with the curtain that already earns Instagram DMs.

## Brand Commitments

- Name / mark: **adubsqz** (lowercase brand mark).
- Voice: film photography first; software / AWS as secondary About pitch.
- Access: Instagram DM @adubsqz for the lookbook password; never print the password in UI.
- Binding from owner (2026-10-31): keep the new photographic password-curtain UX (muted still collage, hero brand, ink ground) flowing into Work and About; open to a full visual rebrand; About uses the owner-supplied portrait + NYC skyline collage (mutable for continuity), replacing the broken `about_me.jpg` fallback.
- Public origin: adubs.site.

## Evidence on Hand

- Published stills in `public/photos/still-life/` + `src/gallery-manifest.json`.
- About collage source: `/home/ubuntu/.cursor/projects/workspace/assets/01a19129-fc23-7b36-95d1-5eae6167d05d.jpg` (portrait on bridge over Manhattan + waterfront skyline; owner-approved to mutate for flow).
- Gate preview stills: first frames from public collections (`GATE_PREVIEW_SRCS`).
- No fabricated testimonials, client logos, or pricing on the Experience surface.

## Product Principles

1. The stills lead; chrome and commerce recede until desire peaks.
2. One continuous ritual from rope → roll → About → quote — not three skins.
3. Film-first honesty: voice, materials, and access match analog practice.
4. Inquiry cools desire only as much as needed to quote; shipping and payment stay after.
5. Rights and clearance stay visible when someone initiates purchase or outreach.

## Accessibility & Inclusion

Target WCAG-friendly contrast and tap targets on Experience chrome (frame labels, rights copy, form controls). No product-specific assistive-tech requirement beyond that was established.

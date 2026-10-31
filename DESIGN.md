# Design

<!-- impeccable:design-schema 1 -->

## World

**Light-Table Contact Sheet** — a darkroom acrylic light table under a real film contact sheet. The password curtain is the closed japanned lid (ink + muted still collage); unlock lights the table.

## Surfaces

| Surface | Role |
|---|---|
| Password gate | Ink Experience curtain; hero `adubsqz`; photographic collage |
| Work | Light-table field; film body sits on the glow; lightbox isolates one proof |
| About | Maker’s proof plate (portrait + NYC skyline collage) + film-first voice |
| Inquiry / contact | Operate sheets on paper tokens; brick CTA at desire peak |

## Palette

| Token | Hex | Use |
|---|---|---|
| Light-table field | `#f4eee4` + warm radial glow | Page ground after unlock |
| Acrylic highlight | `#fff8ec` / `#ebe3d4` | Rail, proof plate backing |
| Film body | `#0c0c0c` / `#161616` | Contact sheet |
| Ink (gate) | `#1a1714` | Password curtain |
| Grease pencil | `#4a453e` mono | Frame names, About credit |
| Brick | `#a63c32` | Print-quote CTA only |

## Type

- Display / brand: Newsreader (serif wordmark)
- UI: Nunito
- Grease pencil / frame labels: IBM Plex Mono

## Motion

- Gate form: `fade-up`
- Unlock → table: `table-lit` (brightness settle; reduced-motion: none)
- About / panels: `fade-up`

## Assets

- About proof: `public/photos/still-life/about-nyc-collage.jpg` (manifest `about[]`); CSS watermark soft; JPEG carries © burn-in
- Gate previews: first sheet stills from public collections (`GATE_PREVIEW_SRCS`)

## Provenance

Direction: Impeccable’s pick (Light-Table Contact Sheet). seed:9c76e05b384aa8bf. Built code-led 2026-10-31.

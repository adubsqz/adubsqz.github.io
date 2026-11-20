# RubyLLM 2.2 vs adubs.site — fit evaluation

**Verdict: scrap for this repo.** Keep the Vite/React + Python gallery stack.

## What RubyLLM is for

RubyLLM 2.2 ([announcement](https://paolino.me/rubyllm-2-2/), [site](https://rubyllm.com/)) is a **Ruby/Rails AI application framework**: multi-provider chat, tools, agents, sandboxed code execution, file stores, approvals, durable background chats, evaluations, and generators. The author’s coding-agent benchmark ([How I Optimized RubyLLM for Coding Agents](https://paolino.me/optimizing-rubyllm-for-coding-agents/)) reports ~246 hand-written app lines for a Rails+RubyLLM chat app vs ~1,070 with no framework — **for that kind of app**.

## Why it does not trim *this* codebase

adubs.site is a **static GitHub Pages lookbook**: password gate, Portfolio sheet, Work horseshoe, FormSubmit inquiry, and a Pillow **resize + © burn-in** publish pipeline. RubyLLM would not replace React UI, Pages hosting, FormSubmit, or deterministic image publishing. Adopting it means standing up Ruby/Bundler/Rails (persistence, jobs, deploy target) beside a stack that currently needs none of that.

## Trial-and-error the author warns about

- Early agent runs **reimplemented** cost, cancel, and usage instead of using the gem (worst of both worlds).
- Benefits only land when agents/docs/defaults/skills are aligned; bad defaults caused systematic failures.
- Fewer owned lines ≠ lower agent bill (similar or higher token cost while reading generated code).
- Upgrade path is **one release at a time** with schema migrations; not a drop-in for a static SPA.

## When to revisit

Only if the product becomes a **server-side AI app** (multi-turn assistant, tool approvals, multi-provider chat, evals) — and then as a **separate** Ruby service, leaving the gallery + Pillow path intact. Small caption helpers or Cursor scripts do not justify RubyLLM.

## Sources

- https://paolino.me/rubyllm-2-2/
- https://paolino.me/optimizing-rubyllm-for-coding-agents/
- https://rubyllm.com/

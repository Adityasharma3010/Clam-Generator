# Clamp generator

A small tool for generating CSS `clamp()` values for fluid, responsive sizing —
given a min/max viewport and a min/max size. Supports `px`, `rem`, `em`, `vw`,
`vh`, and `%` for the size inputs.

No build step, no dependencies — just static HTML/CSS/JS.

## Files

- `index.html` — markup
- `style.css` — dark, flat UI styling
- `script.js` — clamp math + live preview

## Run locally

Just open `index.html` in a browser, or serve it:

```bash
npx serve .
```

## Deploy to Vercel

**Option A — via GitHub:**
1. Push this folder to a new GitHub repo.
2. Go to [vercel.com/new](https://vercel.com/new), import the repo.
3. Framework preset: "Other" (static site) — no build command needed.
4. Deploy.

**Option B — via Vercel CLI:**
```bash
npm i -g vercel
vercel
```

## Notes on `%`

Percent bounds are valid clamp inputs, but the fluid interpolation between
them always runs on `vw` internally (that's how the linear-slope formula
works). `%` behaves as expected for properties like `width` or `padding`
(relative to the parent element). For `font-size`, `%` isn't really a
meaningful standalone unit — prefer `px`/`rem`/`em`/`vw` there instead.

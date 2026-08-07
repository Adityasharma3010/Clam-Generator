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

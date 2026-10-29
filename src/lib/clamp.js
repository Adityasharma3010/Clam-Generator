const r4 = (n) => Math.round(n * 1e4) / 1e4
const rel = (u) => u === 'rem' || u === 'em'

export const VP_UNITS = ['px', 'rem', 'em']
export const SIZE_UNITS = ['px', 'rem', 'em', 'vw', 'vh', '%']

// f = form state (strings + units). Returns { ok, css, ... } or { ok:false, error }
export function buildClamp(f) {
  const n = (k) => parseFloat(f[k])
  const root = n('root') > 0 ? n('root') : 16
  const [minVp, maxVp, a, b] = [n('minVp'), n('maxVp'), n('minSize'), n('maxSize')]
  if ([minVp, maxVp, a, b].some((v) => !Number.isFinite(v))) return { ok: false, error: 'Enter valid numbers' }

  const px = (v, u) => (rel(u) ? v * root : v)
  // Order-proof: whichever pair has the smaller viewport is treated as the start
  let A = { vp: px(minVp, f.minVpUnit), v: a, u: f.minSizeUnit }
  let B = { vp: px(maxVp, f.maxVpUnit), v: b, u: f.maxSizeUnit }
  if (A.vp > B.vp) [A, B] = [B, A]
  if (A.vp === B.vp) return { ok: false, error: 'The two viewports must be different' }

  const u = A.u
  const k = rel(u) ? root : 1 // rem/em sizes are converted to px for the slope, intercept goes back to rem/em
  const slope = (((B.v - A.v) * k) / (B.vp - A.vp)) * 100
  const icpt = A.v - ((slope / 100) * A.vp) / k
  const s = r4(slope)

  // clamp(MIN, x, MAX) needs MIN <= MAX, even when the value shrinks as the viewport grows
  const [lo, hi] = A.v <= B.v ? [A, B] : [B, A]
  const css = `clamp(${r4(lo.v)}${lo.u}, ${r4(icpt)}${u} ${s < 0 ? '-' : '+'} ${Math.abs(s)}vw, ${r4(hi.v)}${hi.u})`
  return { ok: true, css, icpt, vpMin: A.vp, vpMax: B.vp, a: A.v, b: B.v, unit: u, warning: A.u !== B.u ? 'Use the same unit for both sizes for a valid clamp().' : '' }
}

// Reads clamp(min, a + b vw, max) (also from CSS / Tailwind text) back into form fields
export function parseClamp(str, rootIn) {
  const root = rootIn > 0 ? rootIn : 16
  const m = str.match(/clamp\((.*)\)/i)
  if (!m) return { ok: false, error: 'No clamp() found' }
  const parts = []
  let d = 0, cur = ''
  for (const ch of m[1].replace(/_/g, ' ')) {
    if (ch === '(') d++
    if (ch === ')') d--
    if (ch === ',' && d === 0) { parts.push(cur); cur = '' } else cur += ch
  }
  parts.push(cur)
  if (parts.length !== 3) return { ok: false, error: 'Expected clamp(min, preferred, max)' }
  const one = (s) => { const x = s.trim().match(/^(-?\d*\.?\d+)\s*([a-z%]+)$/i); return x ? { n: +x[1], u: x[2].toLowerCase() } : null }
  const lo = one(parts[0]), hi = one(parts[2])
  if (!lo || !hi) return { ok: false, error: 'Min and max must be a number with a unit' }
  let I = { n: 0, u: lo.u }, S = 0, got = false
  for (const x of parts[1].replace(/calc\(|\)/gi, '').matchAll(/([+-])?\s*(\d*\.?\d+)\s*([a-z%]*)/gi)) {
    const n = (x[1] === '-' ? -1 : 1) * +x[2], u = x[3].toLowerCase()
    if (u === 'vw') S += n
    else if (got) return { ok: false, error: 'Preferred value should be one unit + vw' }
    else { I = { n, u }; got = true }
  }
  if (!S) return { ok: false, error: 'Preferred value needs a vw part' }
  const L = ['px', 'rem', 'em'], kU = (u) => (rel(u) ? root : 1)
  if (I.u !== lo.u) {
    if (!(L.includes(I.u) && L.includes(lo.u))) return { ok: false, error: 'Mixed units are not supported' }
    I.n = (I.n * kU(I.u)) / kU(lo.u)
  }
  const k = kU(lo.u), vp = (v) => ((v - I.n) * k * 100) / S
  const A = { vp: vp(lo.n), v: lo.n, u: lo.u }, B = { vp: vp(hi.n), v: hi.n, u: hi.u }
  if (Math.abs(A.vp - B.vp) < 1e-6) return { ok: false, error: 'Min and max are the same size' }
  const [p, q] = A.vp <= B.vp ? [A, B] : [B, A]
  const r2 = (n) => String(Math.round(n * 100) / 100)
  const rv = (n) => (Math.abs(n - Math.round(n)) < 0.1 ? String(Math.round(n)) : r2(n)) // undo 4-decimal rounding noise
  return { ok: true, form: { minVp: rv(p.vp), maxVp: rv(q.vp), minVpUnit: 'px', maxVpUnit: 'px', minSize: r2(p.v), maxSize: r2(q.v), minSizeUnit: p.u, maxSizeUnit: q.u } }
}

// Share links: ?vp=360px,1440px&size=16px,32px&root=16
export const encodeForm = (f) =>
  `vp=${f.minVp}${f.minVpUnit},${f.maxVp}${f.maxVpUnit}&size=${f.minSize}${f.minSizeUnit},${f.maxSize}${f.maxSizeUnit}&root=${f.root}`.replace(/%/g, '%25')

export function decodeForm(search, fallback) {
  const q = new URLSearchParams(search)
  const pair = (k) => (q.get(k) || '').split(',').map((s) => s.trim().match(/^(-?\d*\.?\d+)([a-z%]+)$/i))
  const [v0, v1] = pair('vp'), [s0, s1] = pair('size')
  if (!(v0 && v1 && s0 && s1)) return fallback
  if (![v0[2], v1[2]].every((u) => VP_UNITS.includes(u)) || ![s0[2], s1[2]].every((u) => SIZE_UNITS.includes(u))) return fallback
  const root = parseFloat(q.get('root'))
  return { minVp: v0[1], minVpUnit: v0[2], maxVp: v1[1], maxVpUnit: v1[2], minSize: s0[1], minSizeUnit: s0[2], maxSize: s1[1], maxSizeUnit: s1[2], root: root > 0 ? String(root) : fallback.root }
}

// Accessibility tips for font-size use
export function a11y(r) {
  if (!r.ok) return []
  const tips = [], L = ['px', 'rem', 'em']
  if (L.includes(r.unit) && r.a > 0 && r.b > 0) {
    const ratio = Math.max(r.a, r.b) / Math.min(r.a, r.b)
    if (ratio > 2.5) tips.push(`Max is ${Math.round(ratio * 10) / 10}× the min. For font-size, more than 2.5× can fail WCAG 1.4.4 when users zoom.`)
  }
  if (r.unit === 'vw' || (L.includes(r.unit) && Math.abs(r.icpt) < 0.01)) tips.push('The size is vw-only, so it ignores browser zoom. For font-size, mix in a rem part (like 1rem + 1vw).')
  return tips
}

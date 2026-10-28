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
  return { ok: true, css, vpMin: A.vp, vpMax: B.vp, a: A.v, b: B.v, unit: u, warning: A.u !== B.u ? 'Use the same unit for both sizes for a valid clamp().' : '' }
}

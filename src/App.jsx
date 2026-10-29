import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { SplitText } from 'gsap/SplitText'
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin'
import { buildClamp, parseClamp, encodeForm, decodeForm, a11y, VP_UNITS, SIZE_UNITS } from './lib/clamp'

gsap.registerPlugin(useGSAP, SplitText, ScrambleTextPlugin)

/* ---------- mouse effect: spotlight grid that eases after the cursor ---------- */
function Background() {
  useEffect(() => {
    const root = document.documentElement
    const p = { x: innerWidth / 2, y: innerHeight * 0.3 }
    const qx = gsap.quickTo(p, 'x', { duration: 0.7, ease: 'power3.out' })
    const qy = gsap.quickTo(p, 'y', { duration: 0.7, ease: 'power3.out' })
    const touch = matchMedia('(hover: none)').matches
    const move = (e) => { qx(e.clientX); qy(e.clientY) }
    const tick = (t) => {
      if (touch) { p.x = innerWidth / 2 + Math.sin(t / 2.2) * innerWidth * 0.3; p.y = innerHeight * 0.35 + Math.cos(t / 3) * innerHeight * 0.2 }
      root.style.setProperty('--mx', p.x + 'px'); root.style.setProperty('--my', p.y + 'px')
    }
    addEventListener('pointermove', move)
    gsap.ticker.add(tick)
    return () => { removeEventListener('pointermove', move); gsap.ticker.remove(tick) }
  }, [])
  return <><div className="grid-base" /><div className="grid-lit" /><div className="glow" /><div className="scan" /></>
}

function Panel({ className = '', wipe = 'l', children }) {
  const move = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty('--px', e.clientX - r.left + 'px')
    e.currentTarget.style.setProperty('--py', e.clientY - r.top + 'px')
  }
  return <section onPointerMove={move} data-wipe={wipe} className={`panel reveal ${className}`}>{children}</section>
}

/* ---------- segmented unit picker with a sliding pill ---------- */
function UnitSelect({ units, value, onChange }) {
  const box = useRef(), pill = useRef(), first = useRef(true)
  useLayoutEffect(() => {
    const place = (anim) => {
      const b = box.current.querySelector('[aria-checked=true]')
      if (b) gsap.to(pill.current, { x: b.offsetLeft, width: b.offsetWidth, duration: anim ? 0.55 : 0, ease: 'expo.out' })
    }
    place(!first.current); first.current = false
    const ro = new ResizeObserver(() => place(false)); ro.observe(box.current)
    return () => ro.disconnect()
  }, [value])
  return (
    <div ref={box} role="radiogroup" className="relative flex rounded-xl border border-line p-1">
      <span ref={pill} className="absolute bottom-1 left-0 top-1 rounded-lg bg-accent" style={{ width: 0 }} />
      {units.map((u) => (
        <button key={u} type="button" role="radio" aria-checked={u === value}
          onClick={(e) => { onChange(u); gsap.fromTo(e.currentTarget, { scale: 0.85 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' }) }}
          className={`relative z-10 flex-1 rounded-lg py-1.5 font-mono text-xs transition-colors ${u === value ? 'font-bold text-accent-ink' : 'text-dim hover:text-ink'}`}>
          {u}
        </button>
      ))}
    </div>
  )
}

function Field({ label, value, unit, units, onValue, onUnit }) {
  return (
    <div className="field min-w-0">
      <p className="mb-2 font-mono text-[11px] uppercase tracking-widest text-dim">{label}</p>
      <input type="number" inputMode="decimal" aria-label={label} value={value} onChange={(e) => onValue(e.target.value)}
        className="num mb-3 w-full border-b border-line bg-transparent pb-1 font-mono text-3xl outline-none transition-colors focus:border-hl" />
      <UnitSelect units={units} value={unit} onChange={onUnit} />
    </div>
  )
}

/* ---------- copy button: magnetic, rolling label, particle burst ---------- */
function CopyButton({ text, disabled }) {
  const wrap = useRef(), btn = useRef(), lab = useRef(), q = useRef({}), [done, setDone] = useState(false)
  useEffect(() => {
    q.current.x = gsap.quickTo(btn.current, 'x', { duration: 0.5, ease: 'power3.out' })
    q.current.y = gsap.quickTo(btn.current, 'y', { duration: 0.5, ease: 'power3.out' })
  }, [])
  const move = (e) => {
    const r = wrap.current.getBoundingClientRect()
    q.current.x((e.clientX - r.left - r.width / 2) * 0.35); q.current.y((e.clientY - r.top - r.height / 2) * 0.35)
  }
  const leave = () => gsap.to(btn.current, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.4)' })
  const roll = (next) => gsap.timeline().to(lab.current, { yPercent: -110, duration: 0.2, ease: 'power2.in' })
    .call(() => setDone(next)).set(lab.current, { yPercent: 110 }).to(lab.current, { yPercent: 0, duration: 0.35, ease: 'expo.out' })
  const copy = async () => {
    try { await navigator.clipboard.writeText(text) } catch { const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove() }
    roll(true); gsap.delayedCall(1.5, () => roll(false))
    for (let i = 0; i < 12; i++) {
      const d = document.createElement('i'); d.className = 'pointer-events-none absolute left-1/2 top-1/2 size-1.5 rounded-full bg-accent-ink'
      wrap.current.appendChild(d); const a = (i / 12) * Math.PI * 2
      gsap.fromTo(d, { x: 0, y: 0, scale: 1 }, { x: Math.cos(a) * 80, y: Math.sin(a) * 45, scale: 0, duration: 0.8, ease: 'power3.out', onComplete: () => d.remove() })
    }
  }
  return (
    <div ref={wrap} onPointerMove={move} onPointerLeave={leave} className="relative -m-6 p-6">
      <button ref={btn} type="button" disabled={disabled} onClick={copy}
        className="relative flex h-11 w-32 items-center justify-center overflow-hidden rounded-full bg-accent-ink font-mono text-sm font-bold text-accent disabled:opacity-40">
        <span ref={lab}>{done ? 'Copied ✓' : 'Copy'}</span>
      </button>
    </div>
  )
}

/* ---------- output: scrambles into the new value, copies in 4 formats ---------- */
const FORMATS = ['clamp()', 'CSS', 'Tailwind', 'Variable']
const PROPS = { 'font-size': 'text-[length:', width: 'w-[', height: 'h-[', padding: 'p-[', margin: 'm-[', gap: 'gap-[', top: 'top-[', right: 'right-[', bottom: 'bottom-[', left: 'left-[', inset: 'inset-[' }
const format = (css, k, prop) =>
  k === 'CSS' ? `${prop}: ${css};` : k === 'Tailwind' ? `${PROPS[prop]}${css.replace(/, /g, ',').replace(/ /g, '_')}]` : k === 'Variable' ? `--size: ${css};` : css
function Output({ r }) {
  const el = useRef(), first = useRef(true)
  const [k, setK] = useState('clamp()'), [prop, setProp] = useState('font-size')
  const text = r.ok ? format(r.css, k, prop) : r.error
  const tips = (k !== 'CSS' && k !== 'Tailwind') || prop === 'font-size' ? a11y(r) : []
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { el.current.textContent = text; return }
    gsap.to(el.current, { duration: first.current ? 1.2 : 0.45, delay: first.current ? 0.7 : 0, ease: 'none', overwrite: true,
      scrambleText: { text, chars: '0123456789-+.%vwpxrem', speed: 0.7 } })
    first.current = false
  }, [text])
  const pill = 'rounded-full border border-accent-ink/30 px-3 py-1 font-mono text-xs transition-colors'
  return (
    <section data-wipe="r" className="reveal relative flex flex-wrap items-center justify-between gap-6 overflow-hidden rounded-[28px] bg-accent p-6 text-accent-ink sm:p-8">
      <div className="min-w-0 flex-1">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-widest opacity-60">Your clamp()</p>
        <code ref={el} className={`block break-all font-mono text-xl font-medium leading-snug sm:text-2xl ${r.ok ? '' : 'opacity-60'}`} />
        {r.ok && r.warning && <p className="mt-3 font-mono text-xs font-bold">⚠ {r.warning}</p>}
        {tips.map((t) => <p key={t} className="mt-3 max-w-xl font-mono text-xs font-bold">♿ {t}</p>)}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {FORMATS.map((f) => <button key={f} type="button" onClick={() => setK(f)} className={`${pill} ${f === k ? 'bg-accent-ink text-accent' : 'hover:bg-accent-ink/10'}`}>{f}</button>)}
          {(k === 'CSS' || k === 'Tailwind') && (
            <select value={prop} onChange={(e) => setProp(e.target.value)} className={`${pill} bg-transparent outline-none`}>
              {Object.keys(PROPS).map((p) => <option key={p} className="text-black">{p}</option>)}
            </select>
          )}
        </div>
      </div>
      <CopyButton text={r.ok ? text : ''} disabled={!r.ok} />
    </section>
  )
}

/* ---------- curve: tweens between shapes, crosshair follows the pointer ---------- */
const BPS = [360, 768, 1024, 1280, 1440, 1920]
const fmt = (n) => String(Math.round(n * 100) / 100)
function Graph({ r, sink }) {
  const svg = useRef(), out = useRef(), shape = useRef({ x0: r.vpMin ?? 360, x1: r.vpMax ?? 1440, a: r.a ?? 16, b: r.b ?? 32 })
  const cur = useRef({ v: 900 }), dom = useRef({ d0: 0, d1: 1 }), prop = useRef(r), qv = useRef()
  const $ = (k) => svg.current.querySelector(`[data-k=${k}]`)
  const put = (k, o) => { const n = $(k); for (const a in o) n.setAttribute(a, o[a]) }

  const draw = () => {
    const s = shape.current, span = s.x1 - s.x0
    const d0 = Math.max(0, s.x0 - span * 0.3), d1 = s.x1 + span * 0.3
    let lo = Math.min(s.a, s.b), hi = Math.max(s.a, s.b)
    if (hi - lo < 1e-9) { lo -= 1; hi += 1 }
    const pad = (hi - lo) * 0.25; lo -= pad; hi += pad
    const X = (v) => 16 + ((v - d0) / (d1 - d0)) * 568, Y = (v) => 226 - ((v - lo) / (hi - lo)) * 196
    dom.current = { d0, d1 }
    const d = `M${X(d0)},${Y(s.a)}L${X(s.x0)},${Y(s.a)}L${X(s.x1)},${Y(s.b)}L${X(d1)},${Y(s.b)}`
    put('curve', { d }); put('glow', { d })
    put('v0', { x1: X(s.x0), x2: X(s.x0) }); put('v1', { x1: X(s.x1), x2: X(s.x1) })
    put('p0', { cx: X(s.x0), cy: Y(s.a) }); put('p1', { cx: X(s.x1), cy: Y(s.b) })
    put('t0', { x: X(s.x0) }); put('t1', { x: X(s.x1) })
    put('ya', { x: X(d0) + 4, y: Y(s.a) - 10 }); put('yb', { x: X(d1) - 4, y: Y(s.b) - 10 })
    $('t0').textContent = fmt(s.x0) + 'px'; $('t1').textContent = fmt(s.x1) + 'px'
    const u = prop.current.unit || ''; $('ya').textContent = fmt(s.a) + u; $('yb').textContent = fmt(s.b) + u
    const v = Math.min(d1, Math.max(d0, cur.current.v)), val = s.a + Math.min(1, Math.max(0, (v - s.x0) / span)) * (s.b - s.a)
    put('mk', { x1: X(v), x2: X(v) }); put('md', { cx: X(v), cy: Y(val) })
    out.current.textContent = `${fmt(v)}px → ${fmt(val)}${u}`
    sink.current.v = v; sink.current.val = val; sink.current.fn?.()
  }

  useGSAP(() => {
    cur.current.v = (shape.current.x0 + shape.current.x1) / 2
    qv.current = gsap.quickTo(cur.current, 'v', { duration: 0.35, ease: 'power3.out', onUpdate: draw })
    draw()
    const path = $('curve'), L = path.getTotalLength()
    gsap.timeline({ delay: 0.9 })
      .fromTo(path, { strokeDasharray: L, strokeDashoffset: L }, { strokeDashoffset: 0, duration: 1.6, ease: 'power2.inOut', onComplete: () => { path.style.strokeDasharray = 'none' } })
      .from(['[data-k=p0]', '[data-k=p1]'], { scale: 0, transformOrigin: 'center', duration: 0.6, ease: 'back.out(3)', stagger: 0.8 }, 0.5)
  }, { scope: svg })

  useEffect(() => {
    prop.current = r
    if (r.ok) gsap.to(shape.current, { x0: r.vpMin, x1: r.vpMax, a: r.a, b: r.b, duration: 0.7, ease: 'expo.out', overwrite: true, onUpdate: draw })
  }, [r.ok, r.vpMin, r.vpMax, r.a, r.b, r.unit])

  const probe = (e) => {
    const b = svg.current.getBoundingClientRect(), { d0, d1 } = dom.current
    qv.current(d0 + (((e.clientX - b.left) / b.width) * 600 - 16) / 568 * (d1 - d0))
  }
  return (
    <section data-wipe="r" className="panel reveal p-6 sm:p-8">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono text-[11px] uppercase tracking-widest text-dim">Curve — hover to probe</p>
        <p ref={out} className="font-mono text-sm text-hl" />
      </div>
      <svg ref={svg} viewBox="0 0 600 260" onPointerMove={probe} className="w-full touch-pan-y select-none">
        <g stroke="var(--line)" strokeDasharray="3 5"><line data-k="v0" y1="14" y2="226" /><line data-k="v1" y1="14" y2="226" /></g>
        <line x1="16" x2="584" y1="226" y2="226" stroke="var(--line)" />
        <path data-k="glow" fill="none" stroke="var(--hl)" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" opacity=".15" />
        <path data-k="curve" fill="none" stroke="var(--hl)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <line data-k="mk" y1="14" y2="226" stroke="var(--ink)" strokeWidth="1" opacity=".5" />
        <circle data-k="md" r="6" fill="var(--bg)" stroke="var(--ink)" strokeWidth="2" />
        <circle data-k="p0" r="5" fill="var(--hl)" /><circle data-k="p1" r="5" fill="var(--hl)" />
        <g fill="var(--dim)" fontSize="12" fontFamily="var(--font-mono)">
          <text data-k="t0" y="248" textAnchor="middle" /><text data-k="t1" y="248" textAnchor="middle" />
          <text data-k="ya" textAnchor="start" /><text data-k="yb" textAnchor="end" />
        </g>
      </svg>
      {r.ok && (
        <>
          <p className="mb-2 mt-5 font-mono text-[11px] uppercase tracking-widest text-dim">At common breakpoints — click to probe</p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {BPS.map((v) => {
              const t = Math.min(1, Math.max(0, (v - r.vpMin) / (r.vpMax - r.vpMin)))
              return (
                <button key={v} type="button" onClick={() => qv.current(v)} className="rounded-xl border border-line px-3 py-2 text-left transition-colors hover:border-hl">
                  <span className="block font-mono text-[10px] text-dim">{v}px</span>
                  <span className="font-mono text-sm">{fmt(r.a + t * (r.b - r.a))}{r.unit}</span>
                </button>
              )
            })}
          </div>
        </>
      )}
    </section>
  )
}

/* ---------- live preview: real sizes at the probed viewport ---------- */
const MODES = ['text', 'image', 'position', 'spacing']
const SIDES = ['left', 'right', 'top', 'bottom', 'inset']
const PROP = { text: 'font-size', image: 'width', spacing: 'padding' }
function Preview({ r, root, probe }) {
  const [mode, setMode] = useState('text'), [side, setSide] = useState('left')
  const stage = useRef(), frame = useRef(), info = useRef(), E = useRef({}), live = useRef({})
  live.current = { r, root, mode, side }
  const upd = () => {
    const { v, val } = probe.current, { r, root, mode, side } = live.current
    if (!stage.current) return
    if (!r.ok) { info.current.textContent = 'Fix the inputs to see the preview'; return }
    const u = r.unit, W = stage.current.clientWidth, fw = Math.min(v, W)
    const px = u === 'px' ? val : u === 'rem' || u === 'em' ? val * root : u === 'vw' ? (val * v) / 100 : u === 'vh' ? (val * innerHeight) / 100 : (val * (mode === 'text' ? root : fw)) / 100
    frame.current.style.width = fw + 'px'
    const e = E.current[mode]
    if (e) {
      if (mode === 'text') e.style.fontSize = Math.max(0, px) + 'px'
      else if (mode === 'image') e.style.width = Math.max(0, px) + 'px'
      else if (mode === 'spacing') e.style.padding = Math.max(0, px) + 'px'
      else {
        const st = e.style, inset = side === 'inset'
        st.left = st.right = st.top = st.bottom = 'auto'
        st.width = inset ? 'auto' : '96px'; st.height = inset ? 'auto' : '56px'
        if (inset) st.inset = px + 'px'
        else { st[side] = px + 'px'; st[side === 'left' || side === 'right' ? 'top' : 'left'] = '16px' }
      }
    }
    info.current.textContent = `${mode === 'position' ? side : PROP[mode]}: ${fmt(val)}${u}${u === 'px' ? '' : ' = ' + fmt(px) + 'px'}  @ ${fmt(v)}px viewport`
  }
  useEffect(() => {
    probe.current.fn = upd
    const ro = new ResizeObserver(upd); ro.observe(stage.current)
    return () => { probe.current.fn = null; ro.disconnect() }
  }, [])
  useEffect(upd, [mode, side, r.ok, r.unit, root])
  return (
    <Panel wipe="t" className="mt-5 p-6 sm:p-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-hl">03 · Live preview</p>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          {mode === 'position' && <div className="sm:w-80"><UnitSelect units={SIDES} value={side} onChange={setSide} /></div>}
          <div className="sm:w-80"><UnitSelect units={MODES} value={mode} onChange={setMode} /></div>
        </div>
      </div>
      <p ref={info} className="mb-3 font-mono text-sm text-hl" />
      <div ref={stage} className="relative h-[280px] overflow-hidden rounded-2xl border border-line bg-[radial-gradient(var(--line)_1px,transparent_1px)] [background-size:16px_16px]">
        <div ref={frame} className="relative mx-auto h-full overflow-hidden border-x border-line bg-surface">
          {mode === 'text' && <div className="grid h-full place-items-center p-6 text-center"><p ref={(n) => (E.current.text = n)} className="font-extrabold leading-tight tracking-tight">Fluid type that scales with the viewport</p></div>}
          {mode === 'image' && <div className="grid h-full place-items-center"><div ref={(n) => (E.current.image = n)} className="grid aspect-[16/10] shrink-0 place-items-center rounded-xl bg-gradient-to-br from-accent to-hl"><div className="size-1/4 rounded-full bg-accent-ink/70" /></div></div>}
          {mode === 'position' && <div className="grid h-full place-items-center"><div className="relative h-44 w-72 rounded-2xl border border-line bg-bg"><span className="absolute bottom-2 right-3 font-mono text-[10px] text-dim">relative parent</span><div ref={(n) => (E.current.position = n)} className="absolute grid place-items-center rounded-xl bg-accent/90 font-mono text-xs font-bold text-accent-ink">absolute</div></div></div>}
          {mode === 'spacing' && <div className="grid h-full place-items-center"><div ref={(n) => (E.current.spacing = n)} className="rounded-2xl border border-dashed border-hl bg-accent/20"><div className="rounded-lg bg-accent px-4 py-2 font-mono text-xs font-bold text-accent-ink">content</div></div></div>}
        </div>
      </div>
      <p className="mt-3 text-xs text-dim">Hover the curve above to change the viewport. Values are shown at real size inside a frame as wide as the probed viewport.</p>
    </Panel>
  )
}

function ShareButton({ f }) {
  const [done, setDone] = useState(false)
  const go = async () => {
    const url = `${location.origin}${location.pathname}?${encodeForm(f)}`
    try { await navigator.clipboard.writeText(url) } catch { prompt('Copy this link', url) }
    setDone(true); setTimeout(() => setDone(false), 1500)
  }
  return <button type="button" onClick={go} className="fade-in h-10 rounded-full border border-line px-4 font-mono text-xs transition-colors hover:border-hl">{done ? 'Link copied ✓' : 'Share link'}</button>
}

/* ---------- app ---------- */
export default function App() {
  const root = useRef()
  const [f, setF] = useState(() => decodeForm(location.search, { minVp: '360', maxVp: '1440', minSize: '16', maxSize: '32', minVpUnit: 'px', maxVpUnit: 'px', minSizeUnit: 'px', maxSizeUnit: 'px', root: '16' }))
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }))
  const r = buildClamp(f)
  const probe = useRef({ v: 900, val: 24, fn: null })
  const [pmsg, setPmsg] = useState('')
  useEffect(() => { const id = setTimeout(() => history.replaceState(null, '', '?' + encodeForm(f)), 400); return () => clearTimeout(id) }, [f])
  const onPaste = (e) => {
    const t = e.target.value
    if (!/clamp\(.*\)/i.test(t)) return setPmsg('')
    const x = parseClamp(t, parseFloat(f.root))
    if (x.ok) { setF((s) => ({ ...s, ...x.form })); e.target.value = ''; setPmsg('Loaded ✓') } else setPmsg(x.error)
  }
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'dark')

  const toggle = (e) => {
    const next = theme === 'dark' ? 'light' : 'dark'
    const apply = () => { document.documentElement.dataset.theme = next; localStorage.setItem('cg-theme', next); setTheme(next) }
    if (!document.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) return apply()
    const x = e.clientX, y = e.clientY, rad = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))
    document.startViewTransition(() => flushSync(apply)).ready.then(() =>
      document.documentElement.animate({ clipPath: [`circle(0 at ${x}px ${y}px)`, `circle(${rad}px at ${x}px ${y}px)`] },
        { duration: 800, easing: 'cubic-bezier(.7,0,.2,1)', pseudoElement: '::view-transition-new(root)' }))
  }

  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const title = SplitText.create('.hero-title', { type: 'chars' })
      const words = SplitText.create('.hero-sub', { type: 'words' })
      const R = gsap.utils.random
      const wipes = { l: 'inset(0 100% 0 0 round 28px)', r: 'inset(0 0 0 100% round 28px)', t: 'inset(0 0 100% 0 round 28px)' }
      const tl = gsap.timeline({ defaults: { ease: 'expo.out' } })
      tl.fromTo('.scan', { y: -10, autoAlpha: 1 }, { y: () => innerHeight, autoAlpha: 0, duration: 1.8, ease: 'power2.inOut' }, 0)
        .from('.fade-in', { y: -20, autoAlpha: 0, stagger: 0.1, duration: 0.9 }, 0.2)
        .from(title.chars, { x: () => R(-300, 300), y: () => R(-200, 200), rotation: () => R(-140, 140), scale: 0, autoAlpha: 0, stagger: { each: 0.035, from: 'random' }, duration: 1.7 }, 0.15)
        .from(words.words, { filter: 'blur(14px)', x: -24, autoAlpha: 0, stagger: 0.03, duration: 1 }, 0.9)
      gsap.utils.toArray('.reveal').forEach((el, i) => tl.from(el, { clipPath: wipes[el.dataset.wipe || 'l'], y: 40, duration: 1.4, ease: 'expo.inOut' }, 0.6 + i * 0.15))
      tl.from('.field', { y: 24, autoAlpha: 0, stagger: 0.07, duration: 0.9 }, 1.3)
        .from('.field button', { scale: 0, stagger: 0.015, duration: 0.6, ease: 'back.out(3)' }, 1.5)
      document.querySelectorAll('.field input.num').forEach((inp) => {
        const end = parseFloat(inp.value), o = { n: 0 }, txt = inp.value
        if (Number.isFinite(end)) tl.to(o, { n: end, duration: 1.6, ease: 'power3.out', onUpdate: () => (inp.value = Math.round(o.n)), onComplete: () => (inp.value = txt) }, 1.2)
      })
    })
  }, { scope: root })

  return (
    <div ref={root} className="relative min-h-screen overflow-x-hidden">
      <Background />
      <div className="relative z-10 mx-auto max-w-6xl px-5 pb-20 pt-6 sm:px-8">
        <header className="flex items-center justify-between">
          <span className="fade-in font-mono text-sm font-bold">clamp<span className="text-hl">()</span>.gen</span>
          <div className="flex items-center gap-2"><ShareButton f={f} /><button onClick={toggle} aria-label="Toggle theme" className="fade-in grid size-10 place-items-center rounded-full border border-line transition-colors hover:border-hl">
            {theme === 'dark'
              ? <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4" /></svg>
              : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>}
          </button></div>
        </header>

        <section className="py-12 sm:py-16">
          <h1 className="hero-title text-[clamp(3rem,10vw,7.5rem)] font-extrabold leading-[0.92] tracking-tighter">Clamp<span className="text-hl">()</span><br />generator</h1>
          <p className="hero-sub mt-6 max-w-lg text-lg text-dim">Pick two viewports and the size at each one. Get a <code className="font-mono text-ink">clamp()</code> that glides between them — px, rem, em, vw, vh or %.</p>
        </section>

        <main className="grid items-start gap-5 lg:grid-cols-12">
          <Panel className="p-6 sm:p-8 lg:col-span-5">
            <label className="field mb-8 block">
              <span className="mb-2 block font-mono text-[11px] uppercase tracking-widest text-dim">Paste a clamp() or Tailwind class to load it</span>
              <input onChange={onPaste} placeholder="clamp(16px, 10.6667px + 1.4815vw, 32px)" className="w-full border-b border-line bg-transparent pb-1 font-mono text-sm outline-none transition-colors placeholder:text-dim/50 focus:border-hl" />
              {pmsg && <span className="mt-1 block font-mono text-xs text-hl">{pmsg}</span>}
            </label>
            <p className="mb-5 font-mono text-xs font-bold uppercase tracking-widest text-hl">01 · Viewport range</p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Min viewport" value={f.minVp} unit={f.minVpUnit} units={VP_UNITS} onValue={set('minVp')} onUnit={set('minVpUnit')} />
              <Field label="Max viewport" value={f.maxVp} unit={f.maxVpUnit} units={VP_UNITS} onValue={set('maxVp')} onUnit={set('maxVpUnit')} />
            </div>
            <p className="mb-5 mt-9 font-mono text-xs font-bold uppercase tracking-widest text-hl">02 · Size at each viewport</p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="At min viewport" value={f.minSize} unit={f.minSizeUnit} units={SIZE_UNITS} onValue={set('minSize')} onUnit={set('minSizeUnit')} />
              <Field label="At max viewport" value={f.maxSize} unit={f.maxSizeUnit} units={SIZE_UNITS} onValue={set('maxSize')} onUnit={set('maxSizeUnit')} />
            </div>
            <label className="field mt-8 flex items-center gap-3 border-t border-line pt-6 font-mono text-xs text-dim">
              Root font size
              <input type="number" value={f.root} onChange={(e) => set('root')(e.target.value)} className="num w-16 rounded-lg border border-line bg-transparent px-2 py-1 text-center text-ink outline-none focus:border-hl" />
              px · converts rem/em
            </label>
          </Panel>

          <div className="flex min-w-0 flex-col gap-5 lg:col-span-7">
            <Output r={r} />
            <Graph r={r} sink={probe} />
          </div>
        </main>

        <Preview r={r} root={parseFloat(f.root) > 0 ? parseFloat(f.root) : 16} probe={probe} />

        <p className="hero-sub mt-10 max-w-2xl text-sm leading-relaxed text-dim">
          <b className="text-ink">About %</b> — percent bounds are valid, but the fluid part always runs on <code className="font-mono">vw</code>. They behave as expected on width, padding or left (relative to the parent); for font-size prefer px, rem or em.
        </p>
      </div>
    </div>
  )
}

function toPx(val, unit, root) {
  if (unit === 'px') return val;
  if (unit === 'rem' || unit === 'em') return val * root;
  return null;
}

const els = {
  minVp: document.getElementById('minVp'),
  minVpUnit: document.getElementById('minVpUnit'),
  maxVp: document.getElementById('maxVp'),
  maxVpUnit: document.getElementById('maxVpUnit'),
  minSize: document.getElementById('minSize'),
  minSizeUnit: document.getElementById('minSizeUnit'),
  maxSize: document.getElementById('maxSize'),
  maxSizeUnit: document.getElementById('maxSizeUnit'),
  rootFont: document.getElementById('rootFont'),
  output: document.getElementById('output'),
  err: document.getElementById('err'),
  copyBtn: document.getElementById('copyBtn'),
  vpSlider: document.getElementById('vpSlider'),
  previewText: document.getElementById('previewText'),
  previewVpLabel: document.getElementById('previewVpLabel'),
};

let lastResult = null;

function compute() {
  const root = parseFloat(els.rootFont.value) || 16;
  const minVp = toPx(parseFloat(els.minVp.value), els.minVpUnit.value, root);
  const maxVp = toPx(parseFloat(els.maxVp.value), els.maxVpUnit.value, root);
  const minSizeVal = parseFloat(els.minSize.value);
  const maxSizeVal = parseFloat(els.maxSize.value);
  const minSizeUnit = els.minSizeUnit.value;
  const maxSizeUnit = els.maxSizeUnit.value;

  if (minSizeUnit !== maxSizeUnit) {
    els.err.textContent = 'Min size and max size should use the same unit for a valid clamp().';
    els.err.style.display = 'block';
  } else {
    els.err.style.display = 'none';
  }

  if (!(maxVp > minVp) || isNaN(minSizeVal) || isNaN(maxSizeVal)) {
    els.output.textContent = !(maxVp > minVp)
      ? 'Max viewport must be greater than min viewport'
      : 'Enter valid numbers';
    lastResult = null;
    return;
  }

  const slope = (maxSizeVal - minSizeVal) / (maxVp - minVp) * 100;
  const yIntercept = minSizeVal - (slope / 100) * minVp;

  const slopeR = Math.round(slope * 10000) / 10000;
  const yInterceptR = Math.round(yIntercept * 10000) / 10000;
  const minR = Math.round(minSizeVal * 10000) / 10000;
  const maxR = Math.round(maxSizeVal * 10000) / 10000;

  const preferred = `${yInterceptR}${minSizeUnit} + ${slopeR}vw`;
  const result = `clamp(${minR}${minSizeUnit}, ${preferred}, ${maxR}${maxSizeUnit})`;
  els.output.textContent = result;

  lastResult = {
    minVp, maxVp, minSizeVal, maxSizeVal, minSizeUnit, maxSizeUnit, slope, yIntercept, root
  };

  updatePreview();
}

function updatePreview() {
  const vp = parseFloat(els.vpSlider.value);
  els.previewVpLabel.textContent = `@ ${vp}px viewport`;

  if (!lastResult) return;
  const { minVp, maxVp, minSizeVal, maxSizeVal, minSizeUnit, root } = lastResult;

  let sizeAtVp;
  if (vp <= minVp) sizeAtVp = minSizeVal;
  else if (vp >= maxVp) sizeAtVp = maxSizeVal;
  else {
    const t = (vp - minVp) / (maxVp - minVp);
    sizeAtVp = minSizeVal + t * (maxSizeVal - minSizeVal);
  }

  let pxSize;
  if (minSizeUnit === 'px') pxSize = sizeAtVp;
  else if (minSizeUnit === 'rem' || minSizeUnit === 'em') pxSize = sizeAtVp * root;
  else if (minSizeUnit === 'vw') pxSize = (sizeAtVp / 100) * vp;
  else if (minSizeUnit === 'vh') pxSize = (sizeAtVp / 100) * 500;
  else if (minSizeUnit === '%') pxSize = (sizeAtVp / 100) * root * 2;
  else pxSize = sizeAtVp;

  pxSize = Math.max(10, Math.min(96, pxSize));
  els.previewText.style.fontSize = `${Math.round(pxSize * 10) / 10}px`;
}

document.querySelectorAll('input,select').forEach(el => {
  el.addEventListener('input', () => {
    if (el === els.vpSlider) updatePreview();
    else compute();
  });
});

els.copyBtn.addEventListener('click', () => {
  const text = els.output.textContent;
  navigator.clipboard.writeText(text).then(() => {
    const old = els.copyBtn.innerHTML;
    els.copyBtn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Copied';
    setTimeout(() => els.copyBtn.innerHTML = old, 1200);
  });
});

compute();

/* ---------- theme toggle ---------- */
const themeToggle = document.getElementById('themeToggle');
const root = document.documentElement;

function applyTheme(theme) {
  root.setAttribute('data-theme', theme);
  localStorage.setItem('clamp-theme', theme);
}

const savedTheme = localStorage.getItem('clamp-theme');
const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
applyTheme(savedTheme || (prefersLight ? 'light' : 'dark'));

themeToggle.addEventListener('click', () => {
  const current = root.getAttribute('data-theme');
  applyTheme(current === 'light' ? 'dark' : 'light');
});

/* ---------- custom cursor + glow ---------- */
const cursorDot = document.getElementById('cursorDot');
const cursorRing = document.getElementById('cursorRing');
const cursorGlow = document.getElementById('cursorGlow');
const isCoarsePointer = window.matchMedia('(hover: none), (pointer: coarse)').matches;

if (!isCoarsePointer) {
  let ringX = 0, ringY = 0, targetX = 0, targetY = 0;
  let shown = false;

  window.addEventListener('mousemove', (e) => {
    targetX = e.clientX;
    targetY = e.clientY;

    cursorDot.style.transform = `translate(${targetX}px, ${targetY}px) translate(-50%, -50%)`;
    cursorGlow.style.transform = `translate(${targetX}px, ${targetY}px) translate(-50%, -50%)`;

    if (!shown) {
      shown = true;
      cursorDot.style.opacity = '1';
      cursorRing.style.opacity = '1';
      cursorGlow.style.opacity = '1';
    }
  });

  window.addEventListener('mouseleave', () => {
    cursorDot.style.opacity = '0';
    cursorRing.style.opacity = '0';
    cursorGlow.style.opacity = '0';
    shown = false;
  });

  function animateRing() {
    ringX += (targetX - ringX) * 0.18;
    ringY += (targetY - ringY) * 0.18;
    cursorRing.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;
    requestAnimationFrame(animateRing);
  }
  animateRing();

  const hoverTargets = 'button, input, select, a, .row';
  document.addEventListener('mouseover', (e) => {
    if (e.target.closest(hoverTargets)) cursorRing.classList.add('hover');
  });
  document.addEventListener('mouseout', (e) => {
    if (e.target.closest(hoverTargets)) cursorRing.classList.remove('hover');
  });
}

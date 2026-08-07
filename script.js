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
    els.copyBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Copied';
    setTimeout(() => els.copyBtn.innerHTML = old, 1200);
  });
});

compute();

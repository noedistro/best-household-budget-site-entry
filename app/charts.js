// Ledger & Larder — inline-SVG chart builders. Pure functions of
// numbers: given values they return an SVG string, nothing else.
// No libraries, no images, no network.

const PALETTE = ['#1d4d3b', '#d98e2b', '#7fa08e', '#b3402e', '#4a7a68', '#c9a227', '#5b7fa6', '#8a6d9b'];

export function chartColour(index) {
  return PALETTE[index % PALETTE.length];
}

// Donut chart of spending by category. `slices` is [{label, value}].
// Centre shows the total; each slice gets a legend entry with its share.
export function donutChart(slices, total) {
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 84;
  const inner = 52;
  let angle = -Math.PI / 2;
  const parts = [];
  slices.forEach((slice, i) => {
    if (slice.value <= 0 || total <= 0) return;
    const frac = slice.value / total;
    const end = angle + frac * Math.PI * 2;
    const large = frac > 0.5 ? 1 : 0;
    const x1 = cx + radius * Math.cos(angle);
    const y1 = cy + radius * Math.sin(angle);
    const x2 = cx + radius * Math.cos(end);
    const y2 = cy + radius * Math.sin(end);
    const ix1 = cx + inner * Math.cos(end);
    const iy1 = cy + inner * Math.sin(end);
    const ix2 = cx + inner * Math.cos(angle);
    const iy2 = cy + inner * Math.sin(angle);
    parts.push(
      '<path d="M ' + x1.toFixed(1) + ' ' + y1.toFixed(1) +
      ' A ' + radius + ' ' + radius + ' 0 ' + large + ' 1 ' + x2.toFixed(1) + ' ' + y2.toFixed(1) +
      ' L ' + ix1.toFixed(1) + ' ' + iy1.toFixed(1) +
      ' A ' + inner + ' ' + inner + ' 0 ' + large + ' 0 ' + ix2.toFixed(1) + ' ' + iy2.toFixed(1) +
      ' Z" fill="' + chartColour(i) + '"><title>' + slice.label + ': $' + slice.value.toFixed(2) + '</title></path>',
    );
    angle = end;
  });
  const legend = slices.map((slice, i) => {
    const pct = total > 0 ? Math.round((slice.value / total) * 100) : 0;
    return '<li><span class="swatch" style="background:' + chartColour(i) + '"></span>' +
      slice.label + ' — $' + slice.value.toFixed(0) + ' (' + pct + '%)</li>';
  }).join('');
  return '<div class="donut-wrap"><svg class="donut" viewBox="0 0 ' + size + ' ' + size +
    '" role="img" aria-label="Donut chart of spending by category">' + parts.join('') +
    '<text x="' + cx + '" y="' + (cy - 4) + '" text-anchor="middle" class="donut-total">$' +
    total.toLocaleString('en-US', { maximumFractionDigits: 0 }) + '</text>' +
    '<text x="' + cx + '" y="' + (cy + 16) + '" text-anchor="middle" class="donut-label">spent in Nov</text>' +
    '</svg><ul class="legend">' + legend + '</ul></div>';
}

// Vertical bar chart. `bars` is [{label, value}]; values are labelled
// on top of each bar. `valueLabel` formats a value for display.
export function barChart(bars, valueLabel) {
  const width = 640;
  const height = 260;
  const top = 28;
  const bottom = 52;
  const max = Math.max(1, ...bars.map((b) => b.value));
  const slot = width / bars.length;
  const barWidth = Math.min(56, slot * 0.62);
  const format = valueLabel || ((v) => '$' + v.toLocaleString('en-US', { maximumFractionDigits: 0 }));
  const rects = bars.map((bar, i) => {
    const h = ((height - top - bottom) * bar.value) / max;
    const x = (slot * i + (slot - barWidth) / 2).toFixed(1);
    const y = (height - bottom - h).toFixed(1);
    return '<rect x="' + x + '" y="' + y + '" width="' + barWidth.toFixed(1) + '" height="' + h.toFixed(1) +
      '" fill="' + chartColour(i) + '" data-bar-value="' + bar.value + '">' +
      '<title>' + bar.label + ': ' + format(bar.value) + '</title></rect>' +
      '<text x="' + (Number(x) + barWidth / 2).toFixed(1) + '" y="' + (Number(y) - 6).toFixed(1) +
      '" text-anchor="middle" class="bar-value">' + format(bar.value) + '</text>' +
      '<text x="' + (Number(x) + barWidth / 2).toFixed(1) + '" y="' + (height - 30) + '" text-anchor="middle" class="bar-label">' +
      bar.label + '</text>';
  }).join('');
  return '<svg class="bars" viewBox="0 0 ' + width + ' ' + height +
    '" role="img" aria-label="Bar chart">' + rects +
    '<line x1="0" y1="' + (height - bottom) + '" x2="' + width + '" y2="' + (height - bottom) + '" class="axis"/></svg>';
}

// Horizontal progress bar. `pct` is 0-100; `tone` is 'good', 'warn'
// or 'bad' and colours the fill green, amber or red.
export function progressBar(pct, tone) {
  const safe = Math.max(0, Math.min(100, Number.isFinite(pct) ? pct : 0));
  return '<div class="bar-track" role="progressbar" aria-valuenow="' + Math.round(safe) +
    '" aria-valuemin="0" aria-valuemax="100"><div class="bar-fill bar-' + tone +
    '" style="width:' + safe.toFixed(1) + '%"></div></div>';
}

// Tone for a budget row: green below 80%, amber 80-100%, red over 100%.
export function budgetTone(status) {
  if (status.state === 'over') return 'bad';
  if (status.state === 'near' || status.state === 'at') return 'warn';
  return 'good';
}

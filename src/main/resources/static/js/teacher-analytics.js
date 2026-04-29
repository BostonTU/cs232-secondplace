/* ============================================
   AttendX - Teacher Analytics JS
   ============================================ */

const ANALYTICS_DATA = [
  { id:'6401234567', name:'กิตติดินทร์ เชงมงคลศักดิ์', present:15, absent:2,  late:1, leave:0, total:18 },
  { id:'6401234568', name:'ณิชารีย์ สุขใจ',            present:16, absent:1,  late:1, leave:0, total:18 },
  { id:'6401234569', name:'ปิยะพงษ์ มีสุข',            present:12, absent:4,  late:1, leave:1, total:18 },
  { id:'6401234570', name:'สุภาดี รักเรียน',           present:17, absent:1,  late:0, leave:0, total:18 },
  { id:'6401234571', name:'ธนวัฒน์ จิตดี',             present:13, absent:2,  late:2, leave:1, total:18 },
  { id:'6401234572', name:'วรรณพร ใจงาม',              present:15, absent:1,  late:2, leave:0, total:18 },
  { id:'6401234573', name:'ภูมิพัฒน์ สว่างใจ',         present:16, absent:2,  late:0, leave:0, total:18 },
  { id:'6401234574', name:'อรนุช มงคลดี',              present:10, absent:6,  late:1, leave:1, total:18 },
];

const WEEKLY_DATA = [
  { week:'สัปดาห์ 1', pct:88 },
  { week:'สัปดาห์ 2', pct:82 },
  { week:'สัปดาห์ 3', pct:91 },
  { week:'สัปดาห์ 4', pct:79 },
  { week:'สัปดาห์ 5', pct:85 },
  { week:'สัปดาห์ 6', pct:88 },
];

let tableData = [...ANALYTICS_DATA];

// ── Init ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  drawPieChart();
  drawBarChart();
  renderTable(tableData);
});

// ── Pie Chart (Canvas) ────────────────────────
function drawPieChart() {
  const canvas = document.getElementById('pieChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Aggregate
  let present = 0, absent = 0, late = 0, leave = 0;
  ANALYTICS_DATA.forEach(s => {
    present += s.present; absent += s.absent;
    late    += s.late;    leave  += s.leave;
  });
  const total = present + absent + late + leave;

  const slices = [
    { label:'มาเรียน',  value:present, color:'#22C55E' },
    { label:'ขาดเรียน', value:absent,  color:'#EF4444' },
    { label:'มาสาย',    value:late,    color:'#F59E0B' },
    { label:'ลา',       value:leave,   color:'#3B82F6' },
  ];

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const r  = Math.min(cx, cy) - 10;

  let startAngle = -Math.PI / 2;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  slices.forEach(s => {
    const angle = (s.value / total) * 2 * Math.PI;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, startAngle, startAngle + angle);
    ctx.closePath();
    ctx.fillStyle = s.color;
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.stroke();
    startAngle += angle;
  });

  // Donut hole
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.55, 0, 2 * Math.PI);
  ctx.fillStyle = '#fff';
  ctx.fill();

  // Center text
  ctx.fillStyle = '#1A1A2E';
  ctx.font = 'bold 22px Prompt, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const avgPct = Math.round((present + late * 0.5) / total * 100);
  ctx.fillText(avgPct + '%', cx, cy - 8);
  ctx.font = '12px Prompt, sans-serif';
  ctx.fillStyle = '#9AA3B2';
  ctx.fillText('เฉลี่ย', cx, cy + 14);

  // Legend
  const legend = document.getElementById('pieLegend');
  if (legend) {
    legend.innerHTML = slices.map(s => `
      <div class="pie-legend-item">
        <span class="leg-dot" style="background:${s.color};"></span>
        <span class="leg-label">${s.label}</span>
        <span class="leg-val">${s.value} (${Math.round(s.value/total*100)}%)</span>
      </div>
    `).join('');
  }
}

// ── Bar Chart (HTML) ──────────────────────────
function drawBarChart() {
  const wrap = document.getElementById('barChart');
  if (!wrap) return;

  const maxPct = 100;
  const barAreaH = 140; // pixel height for 100%

  wrap.innerHTML = WEEKLY_DATA.map(w => {
    const h = Math.round((w.pct / maxPct) * barAreaH);
    const color = w.pct >= 80 ? 'var(--yellow)' : w.pct >= 60 ? 'var(--orange)' : 'var(--red)';
    return `
      <div class="bar-col">
        <div class="bar-val">${w.pct}%</div>
        <div style="flex:1;display:flex;align-items:flex-end;width:100%;">
          <div class="bar" style="height:0;background:${color};" data-h="${h}px"></div>
        </div>
        <div class="bar-label">${w.week}</div>
      </div>
    `;
  }).join('');

  // Animate bars in after render
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      wrap.querySelectorAll('.bar').forEach(bar => {
        bar.style.height = bar.dataset.h;
      });
    });
  });
}

// ── Analytics Table ───────────────────────────
function renderTable(data) {
  const tbody = document.getElementById('analyticsTableBody');
  if (!tbody) return;

  tbody.innerHTML = data.map((s, i) => {
    const pct    = Math.round((s.present + s.late * 0.5) / s.total * 100);
    const status = pct >= 80 ? 'present' : pct >= 60 ? 'late' : 'absent';
    const statusLabels = { present:'✅ ผ่าน', late:'⚠️ เสี่ยง', absent:'❌ ไม่ผ่าน' };
    const statusColors = { present:'var(--green)', late:'var(--orange)', absent:'var(--red)' };
    return `
      <tr>
        <td style="color:var(--text-muted);font-size:13px;">${i + 1}</td>
        <td class="student-name-cell">${s.name}</td>
        <td class="student-id-cell">${s.id}</td>
        <td style="font-size:13px;color:var(--green);font-weight:600;">${s.present}</td>
        <td style="font-size:13px;color:var(--red);font-weight:600;">${s.absent}</td>
        <td style="font-size:13px;color:var(--orange);font-weight:600;">${s.late}</td>
        <td style="font-size:13px;color:var(--blue);font-weight:600;">${s.leave}</td>
        <td>
          <div style="display:flex;align-items:center;gap:8px;min-width:120px;">
            <div class="progress-bar-wrap" style="flex:1;">
              <div class="progress-bar-fill ${getPctClass(pct)}" style="width:${pct}%;"></div>
            </div>
            <span style="font-size:13px;font-weight:700;min-width:36px;">${pct}%</span>
          </div>
        </td>
        <td>
          <span style="font-size:12px;font-weight:700;color:${statusColors[status]};">
            ${statusLabels[status]}
          </span>
        </td>
      </tr>
    `;
  }).join('');
}

// ── Table Search ──────────────────────────────
function filterTable(query) {
  const q = query.toLowerCase().trim();
  tableData = q
    ? ANALYTICS_DATA.filter(s => s.name.toLowerCase().includes(q) || s.id.includes(q))
    : [...ANALYTICS_DATA];
  renderTable(tableData);
}

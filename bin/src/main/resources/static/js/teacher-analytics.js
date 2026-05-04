/* ============================================
   AttendX - Teacher Analytics (Real API)
   ============================================ */

let analyticsData = [];
let tableData     = [];

document.addEventListener('DOMContentLoaded', async () => {
  await loadAnalytics();
});

// ── โหลดสถิติจาก API ──────────────────────────
async function loadAnalytics() {
  try {
    const res  = await fetch('/teacher/attendance/stats', { credentials: 'include' });
    if (res.status === 401) { window.location.href = 'login.html'; return; }
    const json = await res.json();

    if (!json.message || json.message !== 'success') {
      showToast('โหลดข้อมูลไม่สำเร็จ', 'error'); return;
    }

    analyticsData = (json.data || []).map(s => ({
      id:      s.studentId,
      name:    s.fullName || s.studentId,
      present: Number(s.present) || 0,
      late:    Number(s.late)    || 0,
      absent:  Number(s.absent)  || 0,
      leave:   Number(s.leave)   || 0,
      total:   Number(s.total)   || 0,
    }));

    tableData = [...analyticsData];
    drawPieChart();
    renderTable(tableData);

  } catch (err) {
    console.error(err);
    showToast('โหลดข้อมูลไม่สำเร็จ', 'error');
  }
}

// ── Pie Chart ─────────────────────────────────
function drawPieChart() {
  const canvas = document.getElementById('pieChart');
  if (!canvas || !analyticsData.length) return;
  const ctx = canvas.getContext('2d');

  let present=0, absent=0, late=0, leave=0;
  analyticsData.forEach(s => { present+=s.present; absent+=s.absent; late+=s.late; leave+=s.leave; });
  const total = present+absent+late+leave || 1;

  const slices = [
    { label:'มาเรียน',  value:present, color:'#22C55E' },
    { label:'ขาดเรียน', value:absent,  color:'#EF4444' },
    { label:'มาสาย',    value:late,    color:'#F59E0B' },
    { label:'ลา',       value:leave,   color:'#3B82F6' },
  ];

  const cx=canvas.width/2, cy=canvas.height/2, r=Math.min(cx,cy)-10;
  let startAngle=-Math.PI/2;
  ctx.clearRect(0,0,canvas.width,canvas.height);

  slices.forEach(s => {
    if (s.value === 0) return;
    const angle=(s.value/total)*2*Math.PI;
    ctx.beginPath(); ctx.moveTo(cx,cy);
    ctx.arc(cx,cy,r,startAngle,startAngle+angle);
    ctx.closePath(); ctx.fillStyle=s.color; ctx.fill();
    ctx.strokeStyle='#fff'; ctx.lineWidth=3; ctx.stroke();
    startAngle+=angle;
  });

  // Donut hole
  ctx.beginPath(); ctx.arc(cx,cy,r*0.55,0,2*Math.PI);
  ctx.fillStyle='#fff'; ctx.fill();

  // Center text
  const avgPct=Math.round((present+late*0.5)/total*100);
  ctx.fillStyle='#1A1A2E'; ctx.font='bold 22px Prompt, sans-serif';
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText(avgPct+'%', cx, cy-8);
  ctx.font='12px Prompt, sans-serif'; ctx.fillStyle='#9AA3B2';
  ctx.fillText('เฉลี่ย', cx, cy+14);

  const legend=document.getElementById('pieLegend');
  if (legend) {
    legend.innerHTML=slices.map(s=>`
      <div class="pie-legend-item">
        <span class="leg-dot" style="background:${s.color};"></span>
        <span class="leg-label">${s.label}</span>
        <span class="leg-val">${s.value} (${Math.round(s.value/total*100)}%)</span>
      </div>`).join('');
  }
}

// ── Analytics Table ───────────────────────────
function renderTable(data) {
  const tbody=document.getElementById('analyticsTableBody');
  if (!tbody) return;

  if (!data.length) {
    tbody.innerHTML=`<tr><td colspan="9" style="text-align:center;padding:32px;color:var(--text-muted);">ยังไม่มีข้อมูลการเช็คชื่อ</td></tr>`;
    return;
  }

  tbody.innerHTML=data.map((s,i)=>{
    const pct=s.total>0?Math.round((s.present+s.late*0.5)/s.total*100):0;
    const status=pct>=80?'present':pct>=60?'late':'absent';
    const statusLabels={present:'✅ ผ่าน', late:'⚠️ เสี่ยง', absent:'❌ ไม่ผ่าน'};
    const statusColors={present:'var(--green)', late:'var(--orange)', absent:'var(--red)'};
    return `
    <tr>
      <td style="color:var(--text-muted);font-size:13px;">${i+1}</td>
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
      <td><span style="font-size:12px;font-weight:700;color:${statusColors[status]};">${statusLabels[status]}</span></td>
    </tr>`;
  }).join('');
}

// ── Table Search ──────────────────────────────
function filterTable(query) {
  const q=query.toLowerCase().trim();
  tableData=q?analyticsData.filter(s=>s.name.toLowerCase().includes(q)||s.id.includes(q)):[...analyticsData];
  renderTable(tableData);
}
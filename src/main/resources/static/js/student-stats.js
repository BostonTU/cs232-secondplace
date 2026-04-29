/* ============================================
   AttendX - Student Stats JS
   ============================================ */

const SUBJECT_STATS = [
  { code:'CS301', name:'Web Application Development', present:14, absent:2, late:1, leave:1, total:18 },
  { code:'CS302', name:'Database Systems',             present:16, absent:1, late:0, leave:1, total:18 },
  { code:'CS303', name:'Software Engineering',         present:13, absent:3, late:2, leave:0, total:18 },
  { code:'CS304', name:'Computer Networks',            present:15, absent:1, late:1, leave:1, total:18 },
];

const HISTORY_DATA = [
  { course:'CS301', date:'19 มี.ค. 2568', status:'present', time:'09:31:07' },
  { course:'CS302', date:'18 มี.ค. 2568', status:'present', time:'10:02:44' },
  { course:'CS303', date:'18 มี.ค. 2568', status:'late',    time:'13:18:22' },
  { course:'CS301', date:'17 มี.ค. 2568', status:'absent',  time:'—' },
  { course:'CS304', date:'17 มี.ค. 2568', status:'present', time:'09:29:11' },
  { course:'CS302', date:'15 มี.ค. 2568', status:'leave',   time:'—' },
  { course:'CS303', date:'14 มี.ค. 2568', status:'present', time:'13:02:58' },
];

document.addEventListener('DOMContentLoaded', () => {
  renderOverallStats();
  renderSubjectStats();
  renderHistory();
});

function renderOverallStats() {
  let present = 0, absent = 0, late = 0;
  SUBJECT_STATS.forEach(s => { present += s.present; absent += s.absent; late += s.late; });
  document.getElementById('statPresent').textContent = present;
  document.getElementById('statAbsent').textContent  = absent;
  document.getElementById('statLate').textContent    = late;
}

function renderSubjectStats() {
  const container = document.getElementById('subjectStatsList');
  if (!container) return;

  container.innerHTML = SUBJECT_STATS.map(s => {
    const pct = Math.round((s.present + s.late * 0.5) / s.total * 100);
    const cls = getPctClass(pct);
    return `
      <div style="padding:14px 0;border-bottom:1px solid var(--border-light);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:8px;">
          <div>
            <span style="font-size:11px;font-weight:700;background:var(--yellow-light);color:#7A6000;padding:2px 8px;border-radius:20px;margin-right:8px;">${s.code}</span>
            <span style="font-size:14px;font-weight:600;">${s.name}</span>
          </div>
          <div style="display:flex;gap:12px;font-size:12px;">
            <span style="color:var(--green);">✅ ${s.present}</span>
            <span style="color:var(--red);">❌ ${s.absent}</span>
            <span style="color:var(--orange);">⏰ ${s.late}</span>
            <span style="color:var(--blue);">📋 ${s.leave}</span>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          <div class="progress-bar-wrap" style="flex:1;">
            <div class="progress-bar-fill ${cls}" style="width:${pct}%;"></div>
          </div>
          <span style="font-size:13px;font-weight:700;min-width:40px;text-align:right;">${pct}%</span>
        </div>
      </div>
    `;
  }).join('');
}

function renderHistory() {
  const list = document.getElementById('historyList');
  if (!list) return;

  const statusIcon = { present:'✅', absent:'❌', late:'⏰', leave:'📋' };
  const statusBg   = { present:'var(--green-bg)', absent:'var(--red-bg)', late:'var(--orange-bg)', leave:'var(--blue-bg)' };

  list.innerHTML = HISTORY_DATA.map(h => `
    <div class="history-item">
      <div class="hist-icon" style="background:${statusBg[h.status]};">${statusIcon[h.status]}</div>
      <div class="hist-info">
        <div class="hist-course">${h.course}</div>
        <div class="hist-date">${h.date}</div>
      </div>
      <div class="hist-time">${h.time}</div>
      ${statusBadge(h.status)}
    </div>
  `).join('');
}

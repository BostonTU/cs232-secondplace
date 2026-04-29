/* ============================================
   AttendX - Teacher Dashboard JS
   ============================================ */

let currentFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
  renderStats();
  renderStudentTable('all');
  renderNotifList(MOCK_NOTIFS_TEACHER, 'notifList');

  // Update subtitle
  const sub = document.getElementById('dashSubtitle');
  if (sub) sub.textContent = `ภาคเรียน 1/2568 • CS301 ${formatThaiDate().split('•')[0].trim()}`;
});

// ── Stats Cards ───────────────────────────────
function renderStats() {
  const total   = MOCK_STUDENTS.length;
  const present = MOCK_STUDENTS.filter(s => s.status === 'present').length;
  const late    = MOCK_STUDENTS.filter(s => s.status === 'late').length;
  const absent  = MOCK_STUDENTS.filter(s => s.status === 'absent').length;
  const leave   = MOCK_STUDENTS.filter(s => s.status === 'leave').length;
  const pct     = Math.round((present + late) / total * 100);

  const grid = document.getElementById('statsGrid');
  if (!grid) return;

  const cards = [
    { icon:'✅', bg:'var(--green-bg)',  color:'var(--green)',  value:`${pct}%`, label:'อัตราเข้าเรียน',  delta:'+2.1%', deltaColor:'var(--green)' },
    { icon:'👥', bg:'var(--yellow-light)', color:'#7A6000',   value:present+late, label:`เข้าเรียนวันนี้`, delta:`+${present+late-38}`, deltaColor:'var(--green)' },
    { icon:'❌', bg:'var(--red-bg)',    color:'var(--red)',    value:absent,    label:'ขาดเรียนวันนี้',   delta:`-${absent-6}`, deltaColor:'var(--red)' },
    { icon:'📋', bg:'var(--blue-bg)',   color:'var(--blue)',   value:leave+MOCK_LEAVE_REQUESTS.filter(l=>l.status==='pending').length,
      label:'ใบลาอนุมัติ', delta:'new', deltaColor:'var(--orange)' },
  ];

  grid.innerHTML = cards.map(c => `
    <div class="card stat-card">
      <div class="stat-top">
        <div class="stat-icon" style="background:${c.bg};">${c.icon}</div>
        <span class="stat-delta" style="background:${c.bg};color:${c.color};">${c.delta}</span>
      </div>
      <div class="stat-value">${c.value}</div>
      <div class="stat-label">${c.label}</div>
    </div>
  `).join('');
}

// ── Student Table ─────────────────────────────
function filterStudents(filter) {
  currentFilter = filter;
  // Update active button
  document.querySelectorAll('[id^="filter-"]').forEach(b => {
    b.className = b.id === `filter-${filter}` ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm';
  });
  renderStudentTable(filter);
}

function renderStudentTable(filter) {
  const tbody = document.getElementById('studentTableBody');
  if (!tbody) return;

  const filtered = filter === 'all'
    ? MOCK_STUDENTS
    : MOCK_STUDENTS.filter(s => s.status === filter);

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--text-muted);">ไม่มีข้อมูล</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(s => `
    <tr>
      <td class="student-name-cell">${s.name}</td>
      <td class="student-id-cell">${s.id}</td>
      <td>${statusBadge(s.status)}</td>
      <td class="time-cell">${s.time}</td>
      <td>${renderProgressBar(s.pct)}</td>
    </tr>
  `).join('');
}

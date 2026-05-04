/* ============================================
   AttendX - Teacher Dashboard (Real API)
   ============================================ */

let currentFilter = 'all';
let allStudents   = [];
let sessionInfo   = null;

document.addEventListener('DOMContentLoaded', async () => {
  await loadDashboard();
  setInterval(loadDashboard, 30000);
});

// ── โหลดข้อมูลหลัก ─────────────────────────────
async function loadDashboard() {
  try {
    const res  = await fetch('/teacher/attendance/current', { credentials: 'include' });
    if (res.status === 401) { window.location.href = 'login.html'; return; }
    const json = await res.json();

    if (json.message === 'No active session') {
      allStudents = [];
      sessionInfo = null;
      renderStats({ present:0, late:0, absent:0, leave:0 }, 0);
      renderStudentTable('all');
      updateSubtitle('ยังไม่มี Session เปิดอยู่');
      return;
    }

    sessionInfo = json;
    allStudents = (json.data || []).map(mapToUI);
    renderStats(json.stats, allStudents.length);
    renderStudentTable(currentFilter);
    updateSubtitle(`${json.subject} • ห้อง ${json.room}`);

    // โหลด notification ใบลา pending จาก API
    loadNotifications();

  } catch (err) {
    console.error(err);
    showToast('โหลดข้อมูลไม่สำเร็จ', 'error');
  }
}

async function loadNotifications() {
  try {
    const res  = await fetch('/api/leave/all', { credentials: 'include' });
    const json = await res.json();
    if (!json.success) return;

    const pending = (json.data || []).filter(l => l.status === 'pending');
    const notifs  = pending.slice(0, 5).map(l => ({
      icon: '📋',
      title: `คำร้องลาใหม่: ${l.studentName || l.studentId}`,
      time: formatTimeAgo(l.submittedAt),
      unread: true
    }));
    renderNotifList(notifs.length ? notifs : [{ icon: '✅', title: 'ไม่มีการแจ้งเตือนใหม่', time: '', unread: false }], 'notifList');

    const badge = document.getElementById('notifBadge');
    if (badge) { badge.textContent = pending.length; badge.style.display = pending.length ? 'flex' : 'none'; }
  } catch {}
}

function formatTimeAgo(isoStr) {
  if (!isoStr) return '';
  const diff = Date.now() - new Date(isoStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'เมื่อกี้';
  if (m < 60) return `${m} นาทีที่แล้ว`;
  return `${Math.floor(m / 60)} ชั่วโมงที่แล้ว`;
}

function updateSubtitle(text) {
  const el = document.getElementById('dashSubtitle');
  if (el) el.textContent = `ภาคเรียน 1/2568 • ${text}`;
}

function mapToUI(a) {
  let timeStr = '—';
  if (a.checkinDate) {
    const d  = new Date(a.checkinDate);
    timeStr  = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
  }
  const statusMap = { 'มา':'present', 'สาย':'late', 'ขาด':'absent', 'ลา':'leave' };
  return {
    id:     a.studentId,
    name:   a.fullName || a.studentId,
    status: statusMap[a.status] || 'present',
    time:   timeStr,
    pct:    0
  };
}

// ── Stats Cards ────────────────────────────────
function renderStats(stats, total) {
  const grid = document.getElementById('statsGrid');
  if (!grid) return;
  const pct = total > 0 ? Math.round((stats.present + stats.late) / total * 100) : 0;
  const cards = [
    { icon:'✅', bg:'var(--green-bg)',     value:`${pct}%`,                label:'อัตราเข้าเรียน'  },
    { icon:'👥', bg:'var(--yellow-light)', value:stats.present+stats.late, label:'เข้าเรียนวันนี้' },
    { icon:'❌', bg:'var(--red-bg)',        value:stats.absent,             label:'ขาดเรียนวันนี้'  },
    { icon:'📋', bg:'var(--blue-bg)',       value:stats.leave,              label:'ลาวันนี้'        },
  ];
  grid.innerHTML = cards.map(c => `
    <div class="card stat-card">
      <div class="stat-top"><div class="stat-icon" style="background:${c.bg};">${c.icon}</div></div>
      <div class="stat-value">${c.value}</div>
      <div class="stat-label">${c.label}</div>
    </div>`).join('');
}

// ── Student Table ──────────────────────────────
function filterStudents(filter) {
  currentFilter = filter;
  document.querySelectorAll('[id^="filter-"]').forEach(b => {
    b.className = b.id === `filter-${filter}` ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm';
  });
  renderStudentTable(filter);
}

function renderStudentTable(filter) {
  const tbody = document.getElementById('studentTableBody');
  if (!tbody) return;

  const filtered = filter === 'all' ? allStudents : allStudents.filter(s => s.status === filter);

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--text-muted);">
      ${allStudents.length === 0 ? '⏳ รอนักศึกษาเช็คชื่อ...' : 'ไม่มีข้อมูลในหมวดนี้'}
    </td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(s => `
    <tr>
      <td class="student-name-cell">${s.name}</td>
      <td class="student-id-cell">${s.id}</td>
      <td>${statusBadge(s.status)}</td>
      <td class="time-cell">${s.time}</td>
      <td>—</td>
    </tr>`).join('');
}
/* ============================================
   AttendX - Student Stats JS
   ============================================ */

async function loadStats() {
  try {
    const res  = await fetch('/student/attendance/my-stats', { credentials: 'include' });

    if (res.status === 401) {
      showStatsError('กรุณาล็อกอินก่อน');
      return;
    }

    const data = await res.json();
    if (!data.success) { showStatsError(data.message || 'โหลดข้อมูลไม่สำเร็จ'); return; }

    renderOverallStats(data.summary);
    renderHistory(data.history);
    renderSubjectStats(data.history);

  } catch (err) {
    showStatsError('เชื่อมต่อ server ไม่ได้');
  }
}

function showStatsError(msg) {
  const list = document.getElementById('historyList');
  if (list) list.innerHTML = `<div style="color:var(--text-muted);font-size:13px;padding:16px 0;text-align:center;">⚠️ ${msg}</div>`;
}

document.addEventListener('DOMContentLoaded', () => {
  // ── User Info ─────────────────────────────
  const user = getUser();
  if (user) {
    const nameEl = document.getElementById('sidebarName');
    const roleEl = document.getElementById('sidebarRole');
    if (nameEl) nameEl.textContent = user.name?.split(' ')[0] || 'นักศึกษา';
    if (roleEl) roleEl.textContent = `นักศึกษา`;
    initSidebarAvatar();
  }
  
  loadStats();
});

function renderOverallStats(summary) {
  document.getElementById('statPresent').textContent = summary.present;
  document.getElementById('statAbsent').textContent  = summary.absent;
  document.getElementById('statLate').textContent    = summary.late;
}

function renderSubjectStats(history = []) {
  const map = {};

  history.forEach(h => {
    if (!map[h.subject]) {
      map[h.subject] = { present:0, late:0, absent:0, total:0 };
    }

    map[h.subject].total++;

    if (h.status === 'มา') map[h.subject].present++;
    else if (h.status === 'สาย') map[h.subject].late++;
    else if (h.status === 'ขาด') map[h.subject].absent++;
  });

  const container = document.getElementById('subjectStatsList');

  container.innerHTML = Object.entries(map).map(([subject, s]) => {
    const pct = Math.round((s.present + s.late * 0.5) / s.total * 100);

    return `
      <div style="padding:14px 0;border-bottom:1px solid var(--border-light);">
        <div style="display:flex;justify-content:space-between;">
          <span>${subject}</span>
          <span>${pct}%</span>
        </div>
        <div class="progress-bar-wrap">
          <div class="progress-bar-fill" style="width:${pct}%"></div>
        </div>
      </div>
    `;
  }).join('');
}

function renderHistory(history = []) {
  const list = document.getElementById('historyList');

  if (!history.length) {
    list.innerHTML = '<div style="color:var(--text-muted);font-size:13px;padding:16px 0;text-align:center;">ยังไม่มีประวัติการเข้าเรียน</div>';
    return;
  }

  list.innerHTML = history.map(h => `
    <div class="history-item">
      <div class="hist-icon">${getStatusIcon(h.status)}</div>
      <div class="hist-info">
        <div class="hist-course">${h.subject || '—'}</div>
        <div class="hist-date">${h.checkinDate || '—'}</div>
      </div>
      <div class="hist-time">${h.time || '—'}</div>
      ${statusBadge(h.status)}
    </div>
  `).join('');
}
function getStatusIcon(status) {
  if (status === 'มา') return '✅';
  if (status === 'สาย') return '⏰';
  if (status === 'ขาด') return '❌';
  return '❓';
}

function statusBadge(status) {
  let cls = '';
  if (status === 'มา') cls = 'badge-green';
  else if (status === 'สาย') cls = 'badge-orange';
  else if (status === 'ขาด') cls = 'badge-red';

  return `<span class="status-badge ${cls}">${status}</span>`;
}
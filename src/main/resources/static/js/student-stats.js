/* ============================================
   AttendX - Student Stats JS
   ============================================ */

   async function loadStats() {
     // แสดง skeleton loading ก่อนเลย ไม่รอ API
     const list = document.getElementById('historyList');
     if (list) list.innerHTML = `<div style="color:var(--text-muted);font-size:13px;padding:16px 0;text-align:center;">⏳ กำลังโหลด...</div>`;

     try {
       const res = await fetch('/student/attendance/my-stats', { credentials: 'include' });

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
  const user = getUser();
  if (user) {
    const nameEl = document.getElementById('sidebarName');
    const roleEl = document.getElementById('sidebarRole');
    if (nameEl) nameEl.textContent = user.name?.split(' ')[0] || 'นักศึกษา';
    if (roleEl) roleEl.textContent = `นักศึกษา`;
    initSidebarAvatar();
  }
  loadStats();                    // โหลด stats ก่อนเลย
  loadStudentNotifications();     // notification ตามหลัง ไม่ block
});

function renderOverallStats(summary) {
  const presentEl = document.getElementById('statPresent');
  const absentEl  = document.getElementById('statAbsent');
  const lateEl    = document.getElementById('statLate');
  // ✅ FIX: null-safe เผื่อ element ไม่มีอยู่ใน HTML
  if (presentEl) presentEl.textContent = summary.present;
  if (absentEl)  absentEl.textContent  = summary.absent;
  if (lateEl)    lateEl.textContent    = summary.late;
}

function renderSubjectStats(history = []) {
  const map = {};

  history.forEach(h => {
    // ✅ FIX: ข้าม record ที่ไม่มีชื่อวิชา (session อาจถูกลบแล้ว)
    const subjectKey = h.subject || '(ไม่ทราบวิชา)';
    if (!map[subjectKey]) {
      map[subjectKey] = { present:0, late:0, absent:0, total:0 };
    }

    map[subjectKey].total++;

    if (h.status === 'มา') map[subjectKey].present++;
    else if (h.status === 'สาย') map[subjectKey].late++;
    else if (h.status === 'ขาด') map[subjectKey].absent++;
  });

  const container = document.getElementById('subjectStatsList');
  // ✅ FIX: null-safe เผื่อ element ไม่มี
  if (!container) return;

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
function statusBadge(status) {
  const map = {
    'มา':  { bg:'#D1FAE5', color:'#065F46', label:'✅ มาเรียน' },
    'สาย': { bg:'#FEF3C7', color:'#92400E', label:'⏰ มาสาย' },
    'ขาด': { bg:'#FEE2E2', color:'#991B1B', label:'❌ ขาด' },
    'ลา':  { bg:'#DBEAFE', color:'#1E40AF', label:'📝 ลา' },
  };
  const s = map[status] || { bg:'#F3F4F6', color:'#374151', label: status || '?' };
  return `<span style="padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600;background:${s.bg};color:${s.color};">${s.label}</span>`;
}
function getStatusIcon(status) {
  if (status === 'มา') return '✅';
  if (status === 'สาย') return '⏰';
  if (status === 'ขาด') return '❌';
  return '❓';
}
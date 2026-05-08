/* ============================================
   AttendX - Shared Utilities (utils.js)
   ============================================ */

// ── Toast Notifications ──────────────────────
function showToast(message, type = 'default', duration = 3000) {
	const container = document.getElementById('toastContainer');
	if (!container) return;

	const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️', default: '🔔' };
	const toast = document.createElement('div');
	toast.className = `toast toast-${type}`;
	toast.innerHTML = `<span>${icons[type] || icons.default}</span><span>${message}</span>`;
	container.appendChild(toast);

	setTimeout(() => {
		toast.style.animation = 'none';
		toast.style.opacity = '0';
		toast.style.transform = 'translateX(20px)';
		toast.style.transition = 'all 0.3s ease';
		setTimeout(() => toast.remove(), 300);
	}, duration);
}

// ── Date & Time Helpers ───────────────────────
function formatThaiDate(date = new Date()) {
	const thDays = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
	const thMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
		'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
	const d = thDays[date.getDay()];
	const day = date.getDate();
	const mon = thMonths[date.getMonth()];
	const yr = date.getFullYear() + 543;
	const hh = String(date.getHours()).padStart(2, '0');
	const mm = String(date.getMinutes()).padStart(2, '0');
	return `วัน${d}ที่ ${day} ${mon} ${yr} • ${hh}:${mm} น.`;
}

function formatTime(date = new Date()) {
	return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
}

function formatDate(date = new Date()) {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}


// ── Sidebar Toggle ───────────────────────────
function toggleSidebar() {
	const sidebar = document.getElementById('sidebar');
	const backdrop = document.getElementById('sidebarBackdrop');
	if (!sidebar) return;
	const isOpen = sidebar.classList.toggle('open');
	if (backdrop) backdrop.classList.toggle('show', isOpen);
}

function closeSidebar() {
	const sidebar = document.getElementById('sidebar');
	const backdrop = document.getElementById('sidebarBackdrop');
	if (sidebar) sidebar.classList.remove('open');
	if (backdrop) backdrop.classList.remove('show');
}

// Backdrop click → ปิด sidebar
document.addEventListener('DOMContentLoaded', () => {
	const bd = document.getElementById('sidebarBackdrop');
	if (bd) bd.addEventListener('click', closeSidebar);
});

// ── Sidebar Toggle ───────────────────────────

// ── Notification Dropdown ────────────────────
function toggleNotif() {
	const drop = document.getElementById('notifDropdown');
	if (!drop) return;
	drop.style.display = drop.style.display === 'none' ? 'block' : 'none';
}

// Close notif when clicking outside
document.addEventListener('click', (e) => {
	const drop = document.getElementById('notifDropdown');
	const btn = document.getElementById('notifBtn');
	if (!drop || !btn) return;
	if (!drop.contains(e.target) && !btn.contains(e.target)) {
		drop.style.display = 'none';
	}
});

function getReadIds() {
	return JSON.parse(localStorage.getItem('attendx_read_notifs') || '[]');
}
function saveReadId(id) {
	const ids = getReadIds();
	if (!ids.includes(id)) { ids.push(id); localStorage.setItem('attendx_read_notifs', JSON.stringify(ids)); }
}
function saveAllRead(ids) {
	const merged = [...new Set([...getReadIds(), ...ids])];
	localStorage.setItem('attendx_read_notifs', JSON.stringify(merged));
}

function markAllRead() {
  const ids = [...document.querySelectorAll('.notif-item[data-id]')].map(el => el.dataset.id).filter(Boolean);
  const stored = JSON.parse(localStorage.getItem('attendx_read_notifs') || '[]');
  localStorage.setItem('attendx_read_notifs', JSON.stringify([...new Set([...stored, ...ids])]));
  document.querySelectorAll('.notif-item.unread').forEach(el => el.classList.remove('unread'));

  const nb = document.getElementById('notifBadge');
  if (nb) nb.style.display = 'none';

  // ซ่อน leaveNavBadge เฉพาะหน้าอื่น — หน้า teacher-leave ให้ renderSummary จัดการเอง
  if (!window.location.pathname.includes('teacher-leave')) {
    const lb = document.getElementById('leaveNavBadge');
    if (lb) lb.style.display = 'none';
  }

  showToast('อ่านการแจ้งเตือนทั้งหมดแล้ว', 'success');
}

// ── Sidebar Avatar ───────────────────────────
function initSidebarAvatar() {
	const avatarEl = document.getElementById('sidebarAvatar');
	if (!avatarEl) return;
	if (avatarEl.querySelector('img')) return; // ถูก set โดย inline script แล้ว

	const user = getUser();
	const faceUrl = user ? localStorage.getItem('attendx_face_url_' + user.id) : null;
	if (faceUrl) {
		avatarEl.textContent = '';
		const img = document.createElement('img');
		img.src = faceUrl;
		img.alt = 'profile';
		img.onerror = () => { img.remove(); _setAvatarInitials(avatarEl); };
		avatarEl.appendChild(img);
	} else {
		_setAvatarInitials(avatarEl);
	}
}

function _setAvatarInitials(avatarEl) {
	const user = getUser();
	if (!user) return;
	const initials = user.name ? user.name.charAt(0).toUpperCase() : '?';
	avatarEl.textContent = initials;
}

document.addEventListener('DOMContentLoaded', initSidebarAvatar);


async function logout() {
	// ✅ FIX: เรียก backend logout ก่อน เพื่อ invalidate server-side session
	try {
		await fetch('/api/logout', { method: 'POST', credentials: 'include' });
	} catch (e) { /* ถ้า network error ก็ยัง clear local storage */ }
	sessionStorage.clear();
	localStorage.removeItem('attendx_user');
	showToast('ออกจากระบบแล้ว', 'info', 1500);
	setTimeout(() => { window.location.href = 'login.html'; }, 1200);
}

function getUser() {
	try {
		return JSON.parse(localStorage.getItem('attendx_user') || sessionStorage.getItem('attendx_user') || 'null');
	} catch { return null; }
}

function requireAuth(role) {
	const user = getUser();
	if (!user) { window.location.href = 'login.html'; return null; }
	// ✅ FIX: เปรียบเทียบ role แบบ case-insensitive
	if (role && (user.role || '').toLowerCase() !== role.toLowerCase()) {
		window.location.href = 'login.html'; return null;
	}
	return user;
}

// ── Progress Bar Helpers ─────────────────────
function getPctClass(pct) {
	if (pct >= 80) return 'high';
	if (pct >= 60) return 'mid';
	return 'low';
}

function renderProgressBar(pct) {
	const cls = getPctClass(pct);
	return `
    <div class="percent-cell">
      <div class="pct-row"><span>${pct}%</span></div>
      <div class="progress-bar-wrap">
        <div class="progress-bar-fill ${cls}" style="width:${pct}%"></div>
      </div>
    </div>`;
}

// ── Status Badge Helpers ─────────────────────
const STATUS_MAP = {
	// English keys (frontend internal)
	present: { cls: 'badge-green', label: '✅ มาเรียน' },
	late: { cls: 'badge-orange', label: '⏰ สาย' },
	absent: { cls: 'badge-red', label: '❌ ขาด' },
	leave: { cls: 'badge-blue', label: '📋 ลา' },
	pending: { cls: 'badge-orange', label: '⏳ รอดำเนินการ' },
	approved: { cls: 'badge-green', label: '✅ อนุมัติแล้ว' },
	rejected: { cls: 'badge-red', label: '❌ ปฏิเสธแล้ว' },
	// Thai keys (from backend/DB)
	'มา': { cls: 'badge-green', label: '✅ มาเรียน' },
	'สาย': { cls: 'badge-orange', label: '⏰ สาย' },
	'ขาด': { cls: 'badge-red', label: '❌ ขาด' },
	'ลา': { cls: 'badge-blue', label: '📋 ลา' },
};

function statusBadge(status) {
	const s = STATUS_MAP[status] || { cls: 'badge-gray', label: status };
	return `<span class="badge ${s.cls}">${s.label}</span>`;
}

// ── Mock Data ────────────────────────────────
const MOCK_STUDENTS = [
	{ id: '6401234567', name: 'กิตติดินทร์ เชงมงคลศักดิ์', status: 'present', time: '09:31:07', pct: 84 },
	{ id: '6401234568', name: 'ณิชารีย์ สุขใจ', status: 'late', time: '09:45:22', pct: 90 },
	{ id: '6401234569', name: 'ปิยะพงษ์ มีสุข', status: 'absent', time: '—', pct: 68 },
	{ id: '6401234570', name: 'สุภาดี รักเรียน', status: 'present', time: '09:28:44', pct: 96 },
	{ id: '6401234571', name: 'ธนวัฒน์ จิตดี', status: 'leave', time: '—', pct: 76 },
	{ id: '6401234572', name: 'วรรณพร ใจงาม', status: 'present', time: '09:30:11', pct: 88 },
	{ id: '6401234573', name: 'ภูมิพัฒน์ สว่างใจ', status: 'present', time: '09:29:55', pct: 92 },
	{ id: '6401234574', name: 'อรนุช มงคลดี', status: 'absent', time: '—', pct: 55 },
];

const MOCK_LEAVE_REQUESTS = [
	{ id: 'L001', studentId: '6401234569', name: 'ปิยะพงษ์ มีสุข', subject: 'CS301', date: '2025-03-19', type: 'sick', reason: 'ไข้หวัดใหญ่ มีใบรับรองแพทย์', status: 'pending', hasFile: true },
	{ id: 'L002', studentId: '6401234571', name: 'ธนวัฒน์ จิตดี', subject: 'CS301', date: '2025-03-19', type: 'personal', reason: 'ธุระครอบครัวด่วน', status: 'pending', hasFile: false },
	{ id: 'L003', studentId: '6401234574', name: 'อรนุช มงคลดี', subject: 'CS302', date: '2025-03-18', type: 'sick', reason: 'ปวดศีรษะ ไม่สบาย', status: 'pending', hasFile: false },
	{ id: 'L004', studentId: '6401234568', name: 'ณิชารีย์ สุขใจ', subject: 'CS301', date: '2025-03-15', type: 'personal', reason: 'ไปงานแต่งงาน', status: 'approved', hasFile: false },
	{ id: 'L005', studentId: '6401234572', name: 'วรรณพร ใจงาม', subject: 'CS303', date: '2025-03-14', type: 'other', reason: 'ไม่ได้ระบุเหตุผล', status: 'rejected', hasFile: false },
];

const MOCK_NOTIFS_STUDENT = [
	{ icon: '✅', title: 'อนุมัติใบลา CS301 วันที่ 15/03', time: '2 ชั่วโมงที่แล้ว', unread: true },
	{ icon: '📋', title: 'Check-In สำเร็จ 09:31 น.', time: 'วันนี้', unread: true },
	{ icon: '🔔', title: 'เปิดเช็คชื่อวิชา CS302 แล้ว', time: 'เมื่อวาน', unread: false },
];

const MOCK_NOTIFS_TEACHER = [
	{ icon: '📋', title: 'คำร้องลาใหม่: ปิยะพงษ์ มีสุข', time: '10 นาทีที่แล้ว', unread: true },
	{ icon: '📋', title: 'คำร้องลาใหม่: ธนวัฒน์ จิตดี', time: '30 นาทีที่แล้ว', unread: true },
	{ icon: '📋', title: 'คำร้องลาใหม่: อรนุช มงคลดี', time: '1 ชั่วโมงที่แล้ว', unread: true },
	{ icon: '✅', title: 'นักศึกษาเช็คชื่อแล้ว 41 คน', time: 'วันนี้', unread: false },
];

// ── Notification Loader (Real API) ───────────
function formatTimeAgo(isoStr) {
	if (!isoStr) return '';
	const diff = Date.now() - new Date(isoStr).getTime();
	const m = Math.floor(diff / 60000);
	if (m < 1) return 'เมื่อกี้';
	if (m < 60) return `${m} นาทีที่แล้ว`;
	const h = Math.floor(m / 60);
	if (h < 24) return `${h} ชั่วโมงที่แล้ว`;
	return `${Math.floor(h / 24)} วันที่แล้ว`;
}

// อาจารย์ — ดึงใบลา pending จาก API
async function loadTeacherNotifications() {
  try {
    const res  = await fetch('/api/teacher/leave/all', { credentials: 'include' });
    if (!res.ok) return;
    const json = await res.json();
    if (!json.success) return;

    const pending  = (json.data || []).filter(l => l.status === 'pending');
    const readIds  = JSON.parse(localStorage.getItem('attendx_read_notifs') || '[]');
    const notifs   = pending.slice(0, 5).map(l => ({
      icon:   '📋',
      title:  `คำร้องลาใหม่: ${l.studentName || l.studentId}`,
      time:   formatTimeAgo(l.submittedAt),
      unread: !readIds.includes(String(l.id)),
      id:     l.id,
      url:    'teacher-leave.html'
    }));

    renderNotifList(
      notifs.length ? notifs : [{ icon: '✅', title: 'ไม่มีการแจ้งเตือนใหม่', time: '', unread: false, url: '#' }],
      'notifList'
    );

    const unread = notifs.filter(n => n.unread).length;
    const badge  = document.getElementById('notifBadge');
    if (badge) { badge.textContent = unread; badge.style.display = unread ? 'flex' : 'none'; }

    const leaveBadge = document.getElementById('leaveNavBadge');
    if (leaveBadge) { leaveBadge.textContent = unread; leaveBadge.style.display = unread ? 'inline-flex' : 'none'; }

  } catch(e) { console.error('loadTeacherNotifications:', e); }
}


// นักศึกษา — ดึงสถานะใบลาของตัวเอง
async function loadStudentNotifications() {
	const user = getUser();
	if (!user) return;
	try {
		const res = await fetch(`/api/student/leave?studentId=${user.id}`, { credentials: 'include' });
		if (!res.ok) return;
		const leaves = await res.json();

		const readIds = JSON.parse(localStorage.getItem('attendx_read_notifs') || '[]');
		const notifs = (Array.isArray(leaves) ? leaves : []).slice(0, 5).map(l => {
		  const statusLabel = l.status === 'approved' ? '✅ อนุมัติ' : l.status === 'rejected' ? '❌ ปฏิเสธ' : '⏳ รอดำเนินการ';
		  return {
		    icon: l.status === 'approved' ? '✅' : l.status === 'rejected' ? '❌' : '📋',
		    title: `ใบลา ${l.subject || ''} — ${statusLabel}`,
		    time: formatTimeAgo(l.submittedAt),
		    unread: !readIds.includes(String(l.id)) && (l.status === 'approved' || l.status === 'rejected'),
		    id: l.id,
		    url: 'student-leave.html'
		  };
		});

		renderNotifList(
			notifs.length ? notifs : [{ icon: '🔔', title: 'ยังไม่มีการแจ้งเตือน', time: '', unread: false }],
			'notifList'
		);

		const unreadCount = notifs.filter(n => n.unread).length;
		const badge = document.getElementById('notifBadge');
		if (badge) {
			badge.textContent = unreadCount;
			badge.style.display = unreadCount ? 'flex' : 'none';
		}
	} catch (e) { console.error('loadStudentNotifications:', e); }
}

// Render notification list
function renderNotifList(notifs, containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = notifs.map(n => `
    <a class="notif-item ${n.unread ? 'unread' : ''}"
       href="${n.url || '#'}"
       data-id="${n.id || ''}"
       onclick="markOneRead(this,event)"
       style="text-decoration:none;color:inherit;display:flex;align-items:flex-start;gap:10px;">
      <span class="notif-icon">${n.icon}</span>
      <div class="notif-text">
        <div class="title">${n.title}</div>
        <div class="time">${n.time}</div>
      </div>
    </a>
  `).join('');
}

function markOneRead(el, event) {
  event.preventDefault();
  el.classList.remove('unread');
  if (el.dataset.id) {
    const stored = JSON.parse(localStorage.getItem('attendx_read_notifs') || '[]');
    if (!stored.includes(el.dataset.id)) { stored.push(el.dataset.id); localStorage.setItem('attendx_read_notifs', JSON.stringify(stored)); }
  }
  const unread = document.querySelectorAll('.notif-item.unread').length;
  const nb = document.getElementById('notifBadge');
  if (nb) { nb.textContent = unread; nb.style.display = unread ? 'flex' : 'none'; }
  const lb = document.getElementById('leaveNavBadge');
  if (lb) { lb.textContent = unread; lb.style.display = unread ? 'inline-flex' : 'none'; }
  const href = el.getAttribute('href');
  setTimeout(() => { if (href && href !== '#') window.location.href = href; }, 150);
}

function updateBadgeCount() {
	const unreadCount = document.querySelectorAll('.notif-item.unread').length;

	const notifBadge = document.getElementById('notifBadge');
	if (notifBadge) {
		notifBadge.textContent = unreadCount;
		notifBadge.style.display = unreadCount ? 'flex' : 'none';
	}

	const leaveBadge = document.getElementById('leaveNavBadge');
	if (leaveBadge) {
		leaveBadge.textContent = unreadCount;
		leaveBadge.style.display = unreadCount ? 'inline-flex' : 'none';
	}
}



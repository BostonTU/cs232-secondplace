/* ══════════════════════════════════════
   DATA
══════════════════════════════════════ */
const NOTIFS = {
  professor: [
    { id:'p1', icon:'📋', type:'leave', title:'ใบลาใหม่ — กิตติบดินทร์', body:'ขอลาป่วย วันที่ 19 มี.ค. 2568', time:'วันนี้ 07:14', unread:true, page:'page-prof-leave' },
    { id:'p2', icon:'📋', type:'leave', title:'ใบลาใหม่ — ณิชารีย์', body:'ขอลากิจ วันที่ 20 มี.ค. 2568', time:'เมื่อคืน 23:02', unread:true, page:'page-prof-leave' },
    { id:'p3', icon:'📋', type:'leave', title:'ใบลาใหม่ — ธนวัฒน์', body:'ขอลาฉุกเฉิน 19–20 มี.ค. 2568', time:'วันนี้ 06:55', unread:true, page:'page-prof-leave' },
    { id:'p4', icon:'✅', type:'checkin', title:'Check-In เสร็จสิ้น', body:'CS301 มีนักศึกษาเช็คอิน 41/46 คน', time:'วันนี้ 09:31', unread:false, page:'page-qr-gen' },
  ],
  student: [
    { id:'s1', icon:'✅', type:'approved', title:'ใบลาได้รับการอนุมัติ!', body:'CS301 — ลาป่วย วันที่ 15 มี.ค. ถูกอนุมัติโดย อ.สมชาย', time:'15 มี.ค. 10:32', unread:true, page:'page-leave' },
    { id:'s2', icon:'❌', type:'rejected', title:'ใบลาถูกปฏิเสธ', body:'CS303 — ลากิจ วันที่ 5 มี.ค. เหตุผล: เอกสารไม่ครบ', time:'5 มี.ค. 14:15', unread:true, page:'page-leave' },
    { id:'s3', icon:'⏰', type:'warn', title:'เตือน: ใกล้เกณฑ์เข้าเรียน!', body:'CS301 — เหลือสิทธิ์ขาดได้อีก 2 ครั้งเท่านั้น', time:'18 มี.ค. 09:00', unread:false, page:'page-status' },
  ]
};

const NAVS = {
  student: [
    { icon:'✅', label:'Check-In', page:'page-checkin' },
    { icon:'📋', label:'ขอใบลา', page:'page-leave' },
    { icon:'📊', label:'สถิติการเข้าเรียน', page:'page-status' },
  ],
  professor: [
    { icon:'🏠', label:'Dashboard', page:'page-prof-dash' },
    { icon:'📷', label:'QR Generator', page:'page-qr-gen' },
    { icon:'📋', label:'จัดการใบลา', page:'page-prof-leave', badge: 3 },
    { icon:'📊', label:'Analytics', page:'page-analytics' },
  ]
};

const PAGE_LABEL_MAP = {
  'page-checkin':'Check-In',
  'page-leave':'ขอใบลา',
  'page-status':'สถิติการเข้าเรียน',
  'page-prof-dash':'Dashboard',
  'page-qr-gen':'QR Generator',
  'page-prof-leave':'จัดการใบลา',
  'page-analytics':'Analytics',
};

let currentRole = 'student';
let sidebarOpen = false;
let notifPanelOpen = false;

/* ══════════════════════════════════════
   TU API CONFIGURATION
══════════════════════════════════════ */
const TU_API = {
  BASE_URL: 'https://restapi.tu.ac.th',
  APP_KEY:  'YOUR_APPLICATION_KEY_HERE', // ← ใส่ Application-Key ที่ได้จาก restapi.tu.ac.th

  // ดู Log การ Login ของ user
  // status: true = login สำเร็จ, false = login ล้มเหลว
  async getAuthLog(username, status = true, record = 10) {
    const url = `${this.BASE_URL}/api/v1/auth/Log/auth/?status=${status}&username=${username}&record=${record}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Application-Key': this.APP_KEY
      }
    });
    if (!res.ok) throw new Error('TU API Error: ' + res.status);
    return res.json();
  },

  // ดู Log ตามวันที่
  async getLogByDate(date, username = '', record = 10) {
    let url = `${this.BASE_URL}/api/v1/auth/Log/find/?date=${date}&record=${record}`;
    if (username) url += `&username=${username}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Application-Key': this.APP_KEY
      }
    });
    if (!res.ok) throw new Error('TU API Error: ' + res.status);
    return res.json();
  }
};

/* ══════════════════════════════════════
   LOGIN FUNCTIONS
══════════════════════════════════════ */
let loginRole = 'student';

function switchLoginRole(role) {
  loginRole = role;
  document.getElementById('tab-student').classList.toggle('active', role === 'student');
  document.getElementById('tab-professor').classList.toggle('active', role === 'professor');
  document.getElementById('login-title').textContent = role === 'student' ? 'เข้าสู่ระบบ นักศึกษา' : 'เข้าสู่ระบบ อาจารย์';
  document.getElementById('login-sub').textContent = role === 'student' ? 'กรอกรหัสนักศึกษาและรหัสผ่าน' : 'กรอกรหัสอาจารย์และรหัสผ่าน';
  document.getElementById('label-username').textContent = role === 'student' ? 'รหัสนักศึกษา (TU)' : 'รหัสอาจารย์ (TU)';
  document.getElementById('input-username').placeholder = role === 'student' ? 'เช่น 6401234567' : 'เช่น thep_p';
  document.getElementById('login-error').style.display = 'none';
}

function togglePwd() {
  const inp = document.getElementById('input-password');
  inp.type = inp.type === 'password' ? 'text' : 'password';
}

async function doLogin() {
  const username = document.getElementById('input-username').value.trim();
  const password = document.getElementById('input-password').value;
  const errBox   = document.getElementById('login-error');
  const errText  = document.getElementById('login-error-text');
  const btn      = document.getElementById('login-btn');

  if (!username || !password) {
    errText.textContent = 'กรุณากรอกรหัสผู้ใช้และรหัสผ่าน';
    errBox.style.display = 'flex'; return;
  }

  btn.disabled = true;
  document.getElementById('login-btn-text').textContent = 'กำลังตรวจสอบ...';
  document.getElementById('login-btn-spinner').style.display = 'inline';
  errBox.style.display = 'none';

  try {
    // ── ตรวจสอบผ่าน TU API ─────────────────────────────────────────────────
    // เช็คว่า username นี้มี Log การ Login สำเร็จล่าสุดไหม
    const logs = await TU_API.getAuthLog(username, true, 1);

    if (!logs || logs.length === 0) {
      // ไม่พบ Log → user ไม่มีในระบบ TU หรือยังไม่เคย login
      throw new Error('ไม่พบบัญชีผู้ใช้ในระบบ TU กรุณาตรวจสอบรหัสผู้ใช้');
    }

    // พบ Log → login สำเร็จ
    // ดึง username จาก Description เช่น "Login Success : thep_p"
    const latestLog = logs[0];
    const nameFromLog = latestLog.Description?.split(': ')[1] || username;

    const user = {
      name: nameFromLog,
      id: username,
      role: loginRole,
      lastLogin: latestLog.CreateDate
    };

    // บันทึก session
    sessionStorage.setItem('attendx_user', JSON.stringify(user));
    sessionStorage.setItem('attendx_app_key', TU_API.APP_KEY);

    enterApp(loginRole, user);

  } catch (err) {
    // ── ถ้า API Key ยังไม่ได้ใส่ หรือ CORS error → ใช้ Demo mode แทน ──────
    if (TU_API.APP_KEY === 'YOUR_APPLICATION_KEY_HERE' || err.message.includes('fetch')) {
      console.warn('⚠️ TU API ยังไม่ได้ตั้งค่า — ใช้ Demo mode แทน');
      const user = {
        name: loginRole === 'student' ? `นักศึกษา (${username})` : `อาจารย์ (${username})`,
        id: username,
        role: loginRole
      };
      enterApp(loginRole, user);
      return;
    }
    errText.textContent = err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่';
    errBox.style.display = 'flex';
  } finally {
    btn.disabled = false;
    document.getElementById('login-btn-text').textContent = 'เข้าสู่ระบบ';
    document.getElementById('login-btn-spinner').style.display = 'none';
  }
}

function enterApp(role, user) {
  currentRole = role;
  document.getElementById('role-screen').style.display = 'none';
  document.getElementById('app').classList.add('visible');

  // ── อัปเดต user info จาก login ──────────────────
  const name = user?.name || (role === 'student' ? 'นักศึกษา' : 'อาจารย์');
  const id   = user?.id   || '';
  const initials = name.substring(0, 2);

  const badge = document.getElementById('role-badge');
  const avatar = document.getElementById('user-avatar');

  if (role === 'student') {
    badge.textContent = 'นักศึกษา';
    badge.className = 'topbar-role-badge badge-student';
    avatar.textContent = initials;
    avatar.className = 'user-avatar';
    document.getElementById('user-name').textContent = name;
    document.getElementById('user-role-text').textContent = 'นักศึกษา CS — ' + id;
  } else {
    badge.textContent = 'อาจารย์';
    badge.className = 'topbar-role-badge badge-professor';
    avatar.textContent = initials;
    avatar.className = 'user-avatar prof-av';
    document.getElementById('user-name').textContent = name;
    document.getElementById('user-role-text').textContent = 'อาจารย์ประจำหลักสูตร CS';
  }

  buildNav(role);
  showPage(NAVS[role][0].page);
  updateNotifBadge();
  startTimers();

  // Demo toast
  if (role === 'student') {
    setTimeout(() => showToast('📋 ใบลาของคุณถูกอนุมัติ!', 'CS301 — ลาป่วย วันที่ 15 มี.ค.', 'success'), 1800);
  } else {
    setTimeout(() => showToast('📋 ใบลาเข้าใหม่ 3 รายการ', 'กรุณาตรวจสอบและอนุมัติ', 'warn'), 1800);
  }
}

/* ══════════════════════════════════════
   NAV
══════════════════════════════════════ */
function buildNav(role) {
  const nav = document.getElementById('sidebar-nav');
  nav.innerHTML = '';
  const lbl = document.createElement('div');
  lbl.className = 'nav-group-label';
  lbl.textContent = role === 'student' ? 'เมนูนักศึกษา' : 'เมนูอาจารย์';
  nav.appendChild(lbl);

  NAVS[role].forEach((item, i) => {
    const el = document.createElement('div');
    el.className = 'nav-item' + (i === 0 ? ' active' : '');
    el.dataset.page = item.page;
    let badgeHtml = '';
    if (item.badge) badgeHtml = `<span style="background:var(--red);color:#fff;font-size:11px;font-weight:700;padding:1px 6px;border-radius:20px;margin-left:auto;" id="nav-badge-${item.page}">${item.badge}</span>`;
    el.innerHTML = `<span class="nav-icon">${item.icon}</span><span>${item.label}</span>${badgeHtml}`;
    el.onclick = () => { showPage(item.page); closeSidebar(); };
    nav.appendChild(el);
  });
}

function showPage(pageId) {
  document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(pageId);
  if (target) target.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === pageId);
  });
  // scroll to top
  const main = document.querySelector('.main');
  if (main) main.scrollTop = 0;
}

/* ══════════════════════════════════════
   SIDEBAR
══════════════════════════════════════ */
function toggleSidebar() {
  sidebarOpen = !sidebarOpen;
  document.getElementById('sidebar').classList.toggle('mobile-open', sidebarOpen);
  document.getElementById('sidebar-overlay').classList.toggle('open', sidebarOpen);
}
function closeSidebar() {
  sidebarOpen = false;
  document.getElementById('sidebar').classList.remove('mobile-open');
  document.getElementById('sidebar-overlay').classList.remove('open');
}
function backToRole() {
  document.getElementById('role-screen').style.display = 'flex';
  document.getElementById('app').classList.remove('visible');
  document.getElementById('input-username').value = '';
  document.getElementById('input-password').value = '';
  document.getElementById('login-error').style.display = 'none';
  sessionStorage.removeItem('attendx_token');
  sessionStorage.removeItem('attendx_user');
  closeNotifPanel();
}

/* ══════════════════════════════════════
   NOTIFICATION PANEL
══════════════════════════════════════ */
function updateNotifBadge() {
  const notifs = NOTIFS[currentRole] || [];
  const unreadCount = notifs.filter(n => n.unread).length;
  const dot = document.querySelector('.notif-dot');
  if (dot) {
    dot.textContent = unreadCount || '';
    dot.style.display = unreadCount ? 'flex' : 'none';
  }
}

function openNotifPanel() {
  renderNotifs('all');
  document.getElementById('notif-panel').classList.add('open');
  document.getElementById('notif-overlay').classList.add('open');
  notifPanelOpen = true;
}

function closeNotifPanel() {
  document.getElementById('notif-panel').classList.remove('open');
  document.getElementById('notif-overlay').classList.remove('open');
  notifPanelOpen = false;
}

function switchNotifTab(type, el) {
  document.querySelectorAll('.notif-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  renderNotifs(type);
}

function renderNotifs(filter) {
  const notifs = NOTIFS[currentRole] || [];
  const list = filter === 'unread' ? notifs.filter(n => n.unread) : notifs;
  const body = document.getElementById('notif-body');

  if (list.length === 0) {
    body.innerHTML = `<div class="notif-empty"><div class="notif-empty-icon">🔕</div><div>ไม่มีการแจ้งเตือน</div></div>`;
    return;
  }

  const iconClass = { leave:'ni-leave', approved:'ni-approved', rejected:'ni-rejected', checkin:'ni-checkin', warn:'ni-leave' };
  body.innerHTML = list.map(n => `
    <div class="notif-item ${n.unread ? 'unread' : ''}" onclick="handleNotifClick('${n.id}','${n.page}')">
      <div class="notif-icon-wrap ${iconClass[n.type] || 'ni-leave'}">${n.icon}</div>
      <div class="notif-content">
        <div class="notif-title-text">${n.title}</div>
        <div class="notif-sub-text">${n.body}</div>
        <div class="notif-time">${n.time}</div>
      </div>
      ${n.unread ? '<div class="notif-unread-dot"></div>' : ''}
    </div>
  `).join('');
}

function handleNotifClick(id, page) {
  // Mark as read
  const notifs = NOTIFS[currentRole];
  const n = notifs.find(x => x.id === id);
  if (n) n.unread = false;
  updateNotifBadge();
  closeNotifPanel();
  showPage(page);
}

/* ══════════════════════════════════════
   TOAST
══════════════════════════════════════ */
function showToast(title, body, type = 'default') {
  const icons = { success:'✅', warn:'⚠️', info:'ℹ️', default:'🔔' };
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div class="toast-icon">${icons[type]||'🔔'}</div>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      <div class="toast-body">${body}</div>
    </div>
    <div class="toast-close" onclick="this.parentElement.remove()">✕</div>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastOut .3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}

/* ══════════════════════════════════════
   LEAVE MANAGEMENT (PROFESSOR)
══════════════════════════════════════ */
function approveLeave(id, name) {
  const card = document.getElementById('lrc-' + id);
  if (!card) return;
  // Update card UI
  card.classList.remove('unread-card');
  card.style.opacity = '0.75';
  card.dataset.status = 'approved';
  const header = card.querySelector('.lrc-header');
  header.querySelector('.chip').className = 'chip chip-green';
  header.querySelector('.chip').textContent = '✓ อนุมัติแล้ว';
  const dot = header.querySelector('[style*="border-radius:50%"]');
  if (dot) dot.remove();
  // Remove action buttons
  const actions = card.querySelector('.lrc-actions');
  if (actions) actions.remove();

  // Update counter
  decrementPending();

  // Add to student notifications
  NOTIFS.student.unshift({
    id: 's_new_' + id, icon: '✅', type: 'approved',
    title: 'ใบลาได้รับการอนุมัติ! 🎉',
    body: `ใบลาของคุณถูกอนุมัติโดย อ.สมชาย ใจดี แล้ว`,
    time: 'เมื่อกี้', unread: true, page: 'page-leave'
  });

  showToast(`✅ อนุมัติใบลา — ${name}`, 'นักศึกษาจะได้รับการแจ้งเตือนทันที', 'success');
}

function rejectLeave(id, name) {
  const card = document.getElementById('lrc-' + id);
  if (!card) return;
  card.classList.remove('unread-card');
  card.style.opacity = '0.75';
  card.dataset.status = 'rejected';
  const header = card.querySelector('.lrc-header');
  header.querySelector('.chip').className = 'chip chip-red';
  header.querySelector('.chip').textContent = '✗ ไม่อนุมัติ';
  const dot = header.querySelector('[style*="border-radius:50%"]');
  if (dot) dot.remove();
  const actions = card.querySelector('.lrc-actions');
  if (actions) actions.remove();

  decrementPending();

  NOTIFS.student.unshift({
    id: 's_rej_' + id, icon: '❌', type: 'rejected',
    title: 'ใบลาถูกปฏิเสธ',
    body: `ใบลาของคุณถูกปฏิเสธโดย อ.สมชาย ใจดี กรุณาติดต่ออาจารย์`,
    time: 'เมื่อกี้', unread: true, page: 'page-leave'
  });

  showToast(`ปฏิเสธใบลา — ${name}`, 'นักศึกษาจะได้รับการแจ้งเตือนทันที', 'warn');
}

function decrementPending() {
  const el = document.getElementById('count-pending');
  if (el) el.textContent = Math.max(0, parseInt(el.textContent) - 1);
  // Update nav badge
  const navBadge = document.getElementById('nav-badge-page-prof-leave');
  if (navBadge) {
    const cur = parseInt(navBadge.textContent) - 1;
    navBadge.textContent = cur > 0 ? cur : '';
    if (cur <= 0) navBadge.style.display = 'none';
  }
  // Update notif badge
  const pNotif = NOTIFS.professor.find(n => n.type === 'leave' && n.unread);
  if (pNotif) pNotif.unread = false;
  updateNotifBadge();
}

function filterLeave(status, btn) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.leave-request-card').forEach(card => {
    if (status === 'all' || card.dataset.status === status) {
      card.style.display = '';
    } else {
      card.style.display = 'none';
    }
  });
}

/* ══════════════════════════════════════
   CHECK-IN — 3 State Flow
   State 1: รอสแกน QR (state-waiting)
   State 2: ยืนยัน (state-confirm)
   State 3: สำเร็จ (state-success)
══════════════════════════════════════ */
let checkedIn = false;
let scannedSessionId = '';

// ── State helpers ────────────────────────────────────────
function showCheckinState(state) {
  ['state-waiting','state-confirm'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = id === state ? 'block' : 'none';
  });
  const success = document.getElementById('state-success');
  if (success) {
    success.style.display = state === 'state-success' ? 'block' : 'none';
    success.classList.toggle('show', state === 'state-success');
  }
}

// ── เมื่อสแกน QR ได้ข้อความ ──────────────────────────────
function onQRScanned(qrText) {
  // QR ที่ถูกต้องต้องขึ้นต้นด้วย ATTENDX:CHECKIN:
  // เช่น "ATTENDX:CHECKIN:CS301-ABC12345"
  if (!qrText || !qrText.startsWith('ATTENDX:CHECKIN:')) {
    document.getElementById('scan-error-text').textContent = 'QR ไม่ถูกต้อง กรุณาสแกนใหม่';
    document.getElementById('scan-error').style.display = 'block';
    return;
  }

  // ดึง Session ID จาก QR
  scannedSessionId = qrText.replace('ATTENDX:CHECKIN:', '');

  // ตรวจสอบว่า Session ตรงกับ Session ปัจจุบันของอาจารย์
  if (scannedSessionId !== currentSessionId) {
    document.getElementById('scan-error-text').textContent = 'QR หมดอายุแล้ว กรุณาให้อาจารย์สร้าง QR ใหม่';
    document.getElementById('scan-error').style.display = 'block';
    return;
  }

  // สแกนสำเร็จ → ไป State 2
  const now = new Date();
  const t = [now.getHours(), now.getMinutes(), now.getSeconds()]
    .map(n => String(n).padStart(2,'0')).join(':');

  document.getElementById('confirm-session-id').textContent = scannedSessionId;
  document.getElementById('confirm-session-time').textContent = 'สแกนเมื่อ: ' + t;
  document.getElementById('scan-error').style.display = 'none';

  showCheckinState('state-confirm');
  showToast('📷 สแกน QR สำเร็จ!', 'กรุณายืนยันการเช็คอิน', 'info');
}

// ── กรอก Session ID เอง (กรณีกล้องใช้ไม่ได้) ──────────────
function submitManualSession() {
  const input = document.getElementById('manual-session-input');
  const val = input?.value?.trim();
  if (!val) {
    document.getElementById('scan-error-text').textContent = 'กรุณากรอก Session ID';
    document.getElementById('scan-error').style.display = 'block';
    return;
  }
  // จำลองว่าสแกนได้
  onQRScanned('ATTENDX:CHECKIN:' + val);
}

// ── เปิดกล้องสแกน (Demo: จำลองสแกนสำเร็จ) ──────────────────
function openQRScanner() {
  // Demo mode: จำลองสแกนได้ session ปัจจุบัน
  // อนาคตเปลี่ยนเป็น html5-qrcode library จริงๆ
  if (!currentSessionId) {
    document.getElementById('scan-error-text').textContent = 'ยังไม่มี Session เปิดอยู่ กรุณารอให้อาจารย์เริ่มเช็คชื่อก่อน';
    document.getElementById('scan-error').style.display = 'block';
    return;
  }
  // จำลองสแกนสำเร็จ
  showToast('📷 จำลองการสแกน QR...', '', 'info');
  setTimeout(() => onQRScanned('ATTENDX:CHECKIN:' + currentSessionId), 800);
}

// ── ยกเลิก → กลับไป State 1 ─────────────────────────────
function cancelScan() {
  scannedSessionId = '';
  showCheckinState('state-waiting');
  const input = document.getElementById('manual-session-input');
  if (input) input.value = '';
  document.getElementById('scan-error').style.display = 'none';
}

// ── ยืนยันเช็คอิน → State 3 ─────────────────────────────
function doCheckin() {
  if (checkedIn) return;
  if (!scannedSessionId) {
    showToast('⚠️ กรุณาสแกน QR ก่อน', 'ยังไม่ได้สแกน QR Code', 'warn');
    showCheckinState('state-waiting');
    return;
  }
  checkedIn = true;

  const now = new Date();
  const t = [now.getHours(), now.getMinutes(), now.getSeconds()]
    .map(n => String(n).padStart(2,'0')).join(':');

  document.getElementById('success-time-val').textContent = t;
  document.getElementById('success-session-id').textContent = scannedSessionId;

  showCheckinState('state-success');
  showToast('✅ เช็คอินสำเร็จ!', `CS301 — ${t} น.`, 'success');
}

// ── รีเซ็ตกลับไป State 1 ────────────────────────────────
function resetCheckin() {
  checkedIn = false;
  scannedSessionId = '';
  showCheckinState('state-waiting');
  const input = document.getElementById('manual-session-input');
  if (input) input.value = '';
}

/* ══════════════════════════════════════
   QR CODE
══════════════════════════════════════ */
let currentSessionId = '';
let qrStudentInstance = null;
let qrProfInstance = null;

function generateSessionId() {
  // สร้าง Session ID แบบ random — อนาคตเปลี่ยนเป็น ID จาก Backend
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = 'CS301-';
  for (let i = 0; i < 8; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

function buildQR(elementId, text, size) {
  const el = document.getElementById(elementId);
  if (!el) return null;
  el.innerHTML = ''; // clear เก่า
  try {
    return new QRCode(el, {
      text: text,
      width: size,
      height: size,
      colorDark: '#111827',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M
    });
  } catch(e) {
    console.warn('QRCode not ready yet:', e);
    return null;
  }
}

function initQRCodes() {
  currentSessionId = generateSessionId();

  // QR สำหรับนักศึกษา — เนื้อหาในQR คือ sessionId
  // อนาคตเปลี่ยนเป็น URL จริง เช่น https://your-api.com/checkin?session=XXX
  const studentQRText = `ATTENDX:CHECKIN:${currentSessionId}`;
  qrStudentInstance = buildQR('qr-student', studentQRText, 156);

  // QR สำหรับอาจารย์ — ใช้ session เดียวกัน
  qrProfInstance = buildQR('qr-professor', studentQRText, 196);

  // Refresh QR ทุก 5 นาที (300 วินาที)
  setTimeout(() => refreshQR(), 300000);
}

function refreshQR() {
  currentSessionId = generateSessionId();
  const newText = `ATTENDX:CHECKIN:${currentSessionId}`;

  if (document.getElementById('qr-student')) buildQR('qr-student', newText, 156);
  if (document.getElementById('qr-professor')) buildQR('qr-professor', newText, 196);

  showToast('🔄 QR Code ต่ออายุแล้ว', 'Session ใหม่: ' + currentSessionId, 'info');
  setTimeout(() => refreshQR(), 300000);
}

/* ══════════════════════════════════════
   TIMERS
══════════════════════════════════════ */
function startTimer(elId, secs) {
  let t = secs;
  setInterval(() => {
    const el = document.getElementById(elId);
    if (!el) return;
    t = t > 0 ? t - 1 : 300;
    el.textContent = Math.floor(t/60) + ':' + String(t%60).padStart(2,'0');
  }, 1000);
}
function startTimers() {
  startTimer('qr-cd', 292);
  startTimer('prof-cd', 292);
  // รอ library โหลดเสร็จก่อนสร้าง QR
  setTimeout(() => initQRCodes(), 300);
}

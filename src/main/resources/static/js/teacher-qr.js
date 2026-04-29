/* ============================================
   AttendX - Teacher QR Generator JS
   ============================================ */

let sessionActive  = false;
let timerInterval  = null;
let secondsLeft    = 300;
let qrInstance     = null;
let checkinList    = [];

// ── Init ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // nothing auto-starts
});

// ── Start Session ─────────────────────────────
function startSession() {
  const subject  = document.getElementById('sessionSubject').value;
  const room     = document.getElementById('sessionRoom').value.trim() || 'SC-301';
  const duration = parseInt(document.getElementById('sessionDuration').value) || 5;

  secondsLeft  = duration * 60;
  checkinList  = [];
  sessionActive = true;

  // Generate session ID
  const sessionId = subject + '-' + Math.random().toString(36).substring(2, 9).toUpperCase();
  const sessionUrl = `https://attendx.com/checkin/${sessionId}`;
  const now = new Date();

  // Show active session UI
  document.getElementById('startSessionCard').style.display   = 'none';
  document.getElementById('activeSessionWrap').style.display  = 'block';

  // Fill info panel
  document.getElementById('qrCourseLabel').textContent  = subject;
  document.getElementById('qrRoomLabel').textContent     = `ห้อง ${room}`;
  document.getElementById('infoSessionId').textContent   = sessionId;
  document.getElementById('infoSubject').textContent     = subject + ' — Web Application Development';
  document.getElementById('infoRoom').textContent        = room;
  document.getElementById('infoStart').textContent       = formatTime(now);

  // Generate QR code
  const qrBox = document.getElementById('qrCodeBox');
  qrBox.innerHTML = '';
  try {
    qrInstance = new QRCode(qrBox, {
      text: sessionUrl,
      width: 210, height: 210,
      colorDark: '#1A2035',
      colorLight: '#FFFFFF',
      correctLevel: QRCode.CorrectLevel.H,
    });
  } catch (e) {
    qrBox.innerHTML = `<div style="padding:20px;text-align:center;font-size:12px;color:var(--text-muted);">QR: ${sessionId}</div>`;
  }

  // Store session link for copy
  document.getElementById('copyLinkBtn').dataset.url = sessionUrl;

  // Start countdown
  updateTimer();
  timerInterval = setInterval(() => {
    secondsLeft--;
    updateTimer();
    if (secondsLeft <= 0) endSession();

    // Simulate random checkins every few seconds
    if (Math.random() < 0.05 && checkinList.length < MOCK_STUDENTS.length) {
      const remaining = MOCK_STUDENTS.filter(s => !checkinList.find(c => c.id === s.id));
      if (remaining.length) {
        const student = remaining[Math.floor(Math.random() * remaining.length)];
        checkinList.push({ id: student.id, name: student.name, time: formatTime() });
        updateCheckinPanel();
        showToast(`${student.name} เช็คชื่อแล้ว`, 'success', 2000);
      }
    }
  }, 1000);

  showToast('เริ่ม Session สำเร็จ', 'success');
}

// ── Timer ─────────────────────────────────────
function updateTimer() {
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');
  const timerEl = document.getElementById('qrTimer');
  timerEl.textContent = `${mm}:${ss}`;
  timerEl.className   = `qr-timer${secondsLeft <= 60 ? ' warning' : ''}`;
}

// ── End Session ───────────────────────────────
function endSession() {
  clearInterval(timerInterval);
  sessionActive = false;

  showToast(`จบ Session แล้ว — เช็คชื่อ ${checkinList.length} คน`, 'info');

  setTimeout(() => {
    document.getElementById('startSessionCard').style.display  = 'block';
    document.getElementById('activeSessionWrap').style.display = 'none';
    qrInstance = null;
    checkinList = [];
  }, 2000);
}

// ── Copy Link ─────────────────────────────────
function copySessionLink() {
  const url = document.getElementById('copyLinkBtn').dataset.url;
  if (!url) return;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(() => showToast('คัดลอก Link แล้ว', 'success'));
  } else {
    const el = document.createElement('textarea');
    el.value = url;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    showToast('คัดลอก Link แล้ว', 'success');
  }
}

// ── Checkin Panel ─────────────────────────────
function updateCheckinPanel() {
  const list = document.getElementById('checkinMiniList');
  const info = document.getElementById('infoCheckins');
  if (!list || !info) return;

  info.textContent = `${checkinList.length} คน`;

  list.innerHTML = checkinList.length
    ? checkinList.slice().reverse().map(c => `
        <div class="checkin-mini-item">
          <span>✅</span>
          <span class="check-name">${c.name}</span>
          <span class="check-time">${c.time}</span>
        </div>`).join('')
    : '<div style="font-size:13px;color:var(--text-muted);padding:8px 0;">ยังไม่มีนักศึกษาเช็คชื่อ</div>';
}

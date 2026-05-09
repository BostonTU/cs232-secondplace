/* ============================================
   AttendX - Teacher QR Generator JS
   ============================================ */

let sessionActive      = false;
let timerInterval      = null;
let secondsLeft        = 300;
let qrInstance         = null;
let currentSessionCode = null;

document.addEventListener('DOMContentLoaded', () => {
  loadTeachingSubjects();
});

// ── โหลดวิชาที่อาจารย์สอนจาก DB ──────────────
async function loadTeachingSubjects() {
  try {
    const res  = await fetch('/api/subjects/teaching', { credentials: 'include' });
    const data = await res.json();
    if (!data.success) return;

    const select = document.getElementById('sessionSubject');
    select.innerHTML = '<option value="">— เลือกวิชา —</option>';
    data.data.forEach(s => {
      const opt = document.createElement('option');
      opt.value       = s.subject_code;
      opt.textContent = `${s.subject_code} - ${s.subject_name}`;
      select.appendChild(opt);
    });
  } catch (e) {
    console.warn('โหลดวิชาไม่สำเร็จ ใช้ค่า hardcode แทน');
  }
}

// ── ดึง GPS ของอาจารย์ ────────────────────────
function getTeacherPosition() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve({ lat: null, lng: null });
    const timer = setTimeout(() => resolve({ lat: null, lng: null }), 5000);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timer);
        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => { clearTimeout(timer); resolve({ lat: null, lng: null }); }
    );
  });
}

// ── Start Session ─────────────────────────────
async function startSession() {
  const subject  = document.getElementById('sessionSubject').value;
  const room     = document.getElementById('sessionRoom').value.trim() || '';
  const duration = parseInt(document.getElementById('sessionDuration').value) || 5;

  if (!subject) {
    showToast('กรุณาเลือกวิชาก่อน', 'error');
    return;
  }

  // ✅ ดึง GPS ของอาจารย์เป็นพิกัดอ้างอิง
  showToast('กำลังดึงตำแหน่ง GPS...', 'info', 2000);
  const { lat, lng } = await getTeacherPosition();

  const body = { subject, room, duration };
  if (lat !== null && lng !== null) {
    body.latitude    = lat;
    body.longitude   = lng;
    body.radiusMeter = 100; // 100 เมตร default
  }
  // ถ้า GPS ไม่ได้ → ไม่ส่ง lat/lng → backend จะไม่บังคับเช็ค GPS

  try {
    const response = await fetch('/api/session/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'include'
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      showToast(data.message || 'ไม่สามารถสร้าง Session ได้', 'error');
      return;
    }

    currentSessionCode = data.sessionCode;
    secondsLeft        = duration * 60;
    sessionActive      = true;

    const sessionUrl = `${window.location.origin}/pages/student-checkin.html?session=${data.sessionCode}`;
    const now        = new Date();

    document.getElementById('startSessionCard').style.display  = 'none';
    document.getElementById('activeSessionWrap').style.display = 'block';

    document.getElementById('qrCourseLabel').textContent = data.subject;
    document.getElementById('qrRoomLabel').textContent   = `ห้อง ${data.room}`;
    document.getElementById('infoSessionId').textContent = data.sessionCode;
    document.getElementById('infoSubject').textContent   = data.subject;
    document.getElementById('infoRoom').textContent      = data.room;
    document.getElementById('infoStart').textContent     = formatTime(now);
    document.getElementById('infoCheckins').textContent  = '0 คน';

    const gpsNote = document.getElementById('gpsNote');
    if (gpsNote) {
      gpsNote.textContent = data.hasGps
        ? `📍 GPS เปิดอยู่ — รัศมี 100 ม. (${lat?.toFixed(4)}, ${lng?.toFixed(4)})`
        : '📍 ไม่ได้ใช้ GPS — นักศึกษาทุกคนเช็คชื่อได้';
      gpsNote.style.display = 'block';
    }

    const qrBox = document.getElementById('qrCodeBox');
    qrBox.innerHTML = '';
    try {
      qrInstance = new QRCode(qrBox, {
        text: sessionUrl,
        width: 210, height: 210,
        colorDark: '#1A2035', colorLight: '#FFFFFF',
        correctLevel: QRCode.CorrectLevel.H,
      });
    } catch (e) {
      qrBox.innerHTML = `<div style="padding:20px;text-align:center;font-size:13px;color:var(--text-muted);">${data.sessionCode}</div>`;
    }

    document.getElementById('copyLinkBtn').dataset.url = sessionUrl;

    updateTimer();
    timerInterval = setInterval(async () => {
      secondsLeft--;
      updateTimer();
      if (secondsLeft <= 0) await endSession();
    }, 1000);

    const gpsMsg = data.hasGps ? ' (GPS เปิด)' : ' (ไม่มี GPS)';
    showToast(`สร้าง Session สำเร็จ: ${data.sessionCode}${gpsMsg}`, 'success');

  } catch (err) {
    showToast('เกิดข้อผิดพลาด กรุณาลองใหม่', 'error');
    console.error(err);
  }
}

// ── Timer ──────────────────────────────────────
function updateTimer() {
  const mm      = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss      = String(secondsLeft % 60).padStart(2, '0');
  const timerEl = document.getElementById('qrTimer');
  if (timerEl) {
    timerEl.textContent = `${mm}:${ss}`;
    timerEl.className   = `qr-timer${secondsLeft <= 60 ? ' warning' : ''}`;
  }
}

// ── End Session ────────────────────────────────
async function endSession() {
  clearInterval(timerInterval);
  sessionActive = false;

  if (currentSessionCode) {
    try {
      await fetch('/api/session/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionCode: currentSessionCode }),
        credentials: 'include'
      });
    } catch (err) {
      console.error('End session error:', err);
    }
  }

  showToast('จบ Session แล้ว', 'info');
  setTimeout(() => {
    document.getElementById('startSessionCard').style.display  = 'block';
    document.getElementById('activeSessionWrap').style.display = 'none';
    qrInstance = null;
    currentSessionCode = null;
  }, 1500);
}

// ── Copy Link ──────────────────────────────────
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
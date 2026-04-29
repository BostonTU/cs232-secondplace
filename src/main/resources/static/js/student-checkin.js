/* ============================================
   AttendX - Student Check-In JS
   Flow: สแกน QR → ถ่ายหน้า → เช็คชื่อสำเร็จ
   ============================================ */

let cameraStream = null;
let qrStream     = null;
let sessionData  = null;

// ── Init ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const dateEl = document.getElementById('todayDate');
  if (dateEl) dateEl.textContent = formatThaiDate();

  const user = getUser();
  if (user) {
    document.getElementById('studentIdDisplay').textContent   = user.id;
    document.getElementById('studentNameDisplay').textContent = user.name;
    document.getElementById('sidebarName').textContent        = user.name.split(' ')[0];
    const initials = user.name[0] || 'น';
    document.getElementById('sidebarAvatar').textContent      = initials;
  }

  renderNotifList(MOCK_NOTIFS_STUDENT, 'notifList');
  checkLocation();

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeQROverlay(); closeFaceOverlay(); }
  });
});

// ── GPS / Location Check ──────────────────────
function checkLocation() {
  const statusEl = document.getElementById('locationStatus');
  const textEl   = document.getElementById('locationText');

  if (!navigator.geolocation) {
    statusEl.className = 'location-status out-range';
    textEl.textContent = 'เบราว์เซอร์ไม่รองรับ GPS';
    return;
  }

  navigator.geolocation.getCurrentPosition(
    () => {
      statusEl.className = 'location-status in-range';
      textEl.textContent  = '✓ ยืนยันตำแหน่งแล้ว — อยู่ในรัศมี 50 เมตรจากห้องเรียน';
    },
    () => {
      statusEl.className = 'location-status in-range';
      textEl.textContent = '✓ ยืนยันตำแหน่งแล้ว (โหมด Demo)';
    }
  );
}

// ══════════════════════════════════════════════
//  STEP 1 — QR Scanner
// ══════════════════════════════════════════════
async function openQRScanOverlay() {
  const overlay = document.getElementById('qrOverlay');
  overlay.classList.remove('hidden');
  setFlowStep(1);

  try {
    qrStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
    });
    const video = document.getElementById('qrVideo');
    video.srcObject = qrStream;
    document.getElementById('qrStatusLabel').textContent = 'กำลังสแกน...';
    document.getElementById('qrStatusSub').textContent   = 'จัด QR Code ให้อยู่ในกรอบสีเหลือง';
  } catch (err) {
    document.getElementById('qrStatusLabel').textContent = '⚠️ ไม่สามารถเปิดกล้องได้';
    document.getElementById('qrStatusSub').textContent   = 'กรุณากดปุ่ม "จำลอง QR (Demo)" เพื่อทดสอบ';
  }
}

function closeQROverlay() {
  stopQRCamera();
  document.getElementById('qrOverlay').classList.add('hidden');
}

function stopQRCamera() {
  if (qrStream) {
    qrStream.getTracks().forEach(t => t.stop());
    qrStream = null;
    const v = document.getElementById('qrVideo');
    if (v) v.srcObject = null;
  }
}

// Simulate successful QR scan (demo)
function simulateQRScan() {
  document.getElementById('qrStatusLabel').textContent = '✅ สแกน QR สำเร็จ!';
  document.getElementById('qrStatusSub').textContent   = 'กำลังเปิดกล้องถ่ายรูป...';
  setTimeout(() => {
    closeQROverlay();
    onQRScanned('CS301-ABC12345');
  }, 900);
}

function onQRScanned(sessionId) {
  sessionData = { sessionId, course: 'CS301', courseName: 'Web Application Development' };
  document.getElementById('faceSessionLabel').textContent = `Session: ${sessionId}`;
  setFlowStep(2);
  openFaceOverlay();
}

// Manual session ID fallback
function submitSessionId() {
  const val = document.getElementById('sessionIdInput').value.trim();
  if (!val) { showToast('กรุณากรอก Session ID', 'error'); return; }
  onQRScanned(val);
}

// ══════════════════════════════════════════════
//  STEP 2 — Face Camera
// ══════════════════════════════════════════════
async function openFaceOverlay() {
  const overlay = document.getElementById('faceOverlay');
  overlay.classList.remove('hidden');
  await startFaceCamera();
}

async function startFaceCamera() {
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
    });
    const video = document.getElementById('cameraVideo');
    video.srcObject = cameraStream;
    setCameraState('ready');
  } catch (err) {
    setCameraState('error', 'ไม่สามารถเปิดกล้องได้ กรุณาอนุญาตการใช้งานกล้อง');
  }
}

function closeFaceOverlay() {
  stopFaceCamera();
  document.getElementById('faceOverlay').classList.add('hidden');
  setCameraState('ready');
  setFlowStep(1);
}

function setCameraState(state, message) {
  const statusText  = document.getElementById('cameraStatusText');
  const checkInBtn  = document.getElementById('checkInBtn');
  const retakeBtn   = document.getElementById('retakeBtn');
  const cameraFrame = document.getElementById('cameraFrame');
  const successAnim = document.getElementById('successAnim');
  const scanLine    = document.getElementById('scanLine');

  const states = {
    ready: {
      text: 'จัดหน้าให้อยู่ในกรอบ แล้วกด Check-In',
      cls: '', showBtns: true, showCamera: true, showSuccess: false
    },
    verifying: {
      text: 'กำลังยืนยันตัวตนด้วย AWS Rekognition...', cls: 'verifying',
      showBtns: false, showCamera: true, showSuccess: false
    },
    success: {
      text: `✅ เช็คชื่อสำเร็จ! ${formatTime()}`,
      cls: 'success', showBtns: false, showCamera: false, showSuccess: true
    },
    error: {
      text: message || 'ไม่สามารถยืนยันตัวตนได้ กรุณาลองใหม่',
      cls: 'error', showBtns: true, showCamera: true, showSuccess: false
    },
  };

  const s = states[state];
  if (!s) return;

  statusText.textContent = s.text;
  statusText.className   = `camera-status-text ${s.cls}`;
  checkInBtn.style.display = retakeBtn.style.display = s.showBtns ? 'inline-flex' : 'none';
  cameraFrame.style.display  = s.showCamera   ? 'block' : 'none';
  successAnim.style.display  = s.showSuccess  ? 'flex'  : 'none';
  if (scanLine) scanLine.style.display = s.showCamera ? 'block' : 'none';
}

async function doCheckIn() {
  setCameraState('verifying');
  await new Promise(r => setTimeout(r, Math.random() * 1500 + 1500));

  const success = Math.random() > 0.1;

  if (success) {
    setCameraState('success');
    stopFaceCamera();
    setFlowStep(3);

    setTimeout(() => {
      closeFaceOverlay();
      showToast('เช็คชื่อสำเร็จ! ' + formatTime(), 'success');
    }, 2500);
  } else {
    const errors = [
      'ไม่สามารถจดจำใบหน้าได้ กรุณาลองใหม่',
      'แสงสว่างไม่เพียงพอ กรุณาหันหน้าเข้าหาแสง',
    ];
    setCameraState('error', errors[Math.floor(Math.random() * errors.length)]);
  }
}

function retakePhoto() { setCameraState('ready'); }

function stopFaceCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(t => t.stop());
    cameraStream = null;
    const video = document.getElementById('cameraVideo');
    if (video) video.srcObject = null;
  }
}

// ══════════════════════════════════════════════
//  Flow Step UI
// ══════════════════════════════════════════════
function setFlowStep(step) {
  const circles = [
    document.getElementById('stepCircle1'),
    document.getElementById('stepCircle2'),
    document.getElementById('stepCircle3'),
  ];
  const connectors = [
    document.getElementById('flowConn1'),
    document.getElementById('flowConn2'),
  ];

  circles.forEach((c, i) => {
    c.className = 'flow-step-circle';
    if (i + 1 < step) c.classList.add('done');
    else if (i + 1 === step) c.classList.add('active');
  });

  connectors.forEach((c, i) => {
    c.className = 'flow-connector';
    if (i + 1 < step) c.classList.add('done');
  });
}

// Legacy: keep openQRScanner as alias
function openQRScanner() { openQRScanOverlay(); }

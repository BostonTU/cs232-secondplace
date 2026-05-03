/* ============================================
   AttendX - Student Check-In JS
   Flow: กรอก/สแกน Session Code → เช็คชื่อสำเร็จ
   ============================================ */

let cameraStream = null;
let qrStream     = null;
let sessionData  = null;

// ── Init ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
	const dateEl = document.getElementById('todayDate');
	if (dateEl) dateEl.textContent = formatThaiDate();

	const user = getUser();
	if (!user) { window.location.href = 'login.html'; return; }

	const idEl   = document.getElementById('studentIdDisplay');
	const nameEl = document.getElementById('studentNameDisplay');
	const sbName = document.getElementById('sidebarName');
	if (idEl)   idEl.textContent   = user.id || user.username || '';
	if (nameEl) nameEl.textContent = user.name || '';
	if (sbName) sbName.textContent = (user.name || '').split(' ')[0] || 'นักศึกษา';
	initSidebarAvatar();

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
	if (!statusEl || !textEl) return;

	if (!navigator.geolocation) {
		statusEl.className    = 'location-status out-range';
		textEl.textContent    = 'เบราว์เซอร์ไม่รองรับ GPS';
		return;
	}

	statusEl.className = 'location-status checking';
	textEl.textContent = 'กำลังตรวจสอบตำแหน่ง...';

	navigator.geolocation.getCurrentPosition(
		(pos) => {
			statusEl.className = 'location-status in-range';
			textEl.textContent = `✓ ตรวจพบตำแหน่งแล้ว (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`;
		},
		() => {
			// ✅ FIX: ไม่โกหกว่า "ยืนยันแล้ว" ถ้า GPS deny — แจ้งตามจริง
			statusEl.className = 'location-status checking';
			textEl.textContent = '⚠️ ไม่สามารถดึง GPS ได้ — ระบบจะใช้ตำแหน่งเป็น 0,0 (เช็คชื่อได้ถ้า Session ไม่บังคับ GPS)';
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
		document.getElementById('qrStatusSub').textContent   = 'กรุณากรอก Session Code ในช่องด้านล่างแทน';
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

// ✅ FIX: simulateQRScan ใช้ session code จากช่อง input ถ้ามี ไม่งั้น prompt
function simulateQRScan() {
	const inputVal = document.getElementById('sessionIdInput')?.value?.trim();
	if (!inputVal) {
		showToast('กรุณากรอก Session Code ในช่องก่อน แล้วกด Demo อีกครั้ง', 'warning');
		closeQROverlay();
		return;
	}
	document.getElementById('qrStatusLabel').textContent = '✅ สแกน QR สำเร็จ!';
	document.getElementById('qrStatusSub').textContent   = 'กำลังตรวจสอบ Session...';
	setTimeout(() => {
		closeQROverlay();
		onQRScanned(inputVal);
	}, 700);
}

function onQRScanned(sessionCode) {
	sessionData = { sessionCode: String(sessionCode).trim() };
	const label = document.getElementById('faceSessionLabel');
	if (label) label.textContent = `Session: ${sessionData.sessionCode}`;
	setFlowStep(2);
	openFaceOverlay();
}

// Manual session ID
function submitSessionId() {
	const val = document.getElementById('sessionIdInput')?.value?.trim();
	if (!val) { showToast('กรุณากรอก Session Code', 'error'); return; }
	onQRScanned(val);
}

// ══════════════════════════════════════════════
//  STEP 2 — Face / Check-In
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
		// ✅ กล้องเปิดไม่ได้ก็ยังเช็คชื่อได้ — แค่ไม่มีรูป
		setCameraState('ready');
		showToast('ไม่สามารถเปิดกล้องได้ — กด Check-In เพื่อเช็คชื่อต่อได้เลย', 'warning');
	}
}

function closeFaceOverlay() {
	stopFaceCamera();
	document.getElementById('faceOverlay').classList.add('hidden');
	setCameraState('ready');
	setFlowStep(1);
}

// ✅ FIX: เพิ่ม retakePhoto ที่หายไป
function retakePhoto() {
	stopFaceCamera();
	startFaceCamera();
}

function setCameraState(state, message) {
	const statusText = document.getElementById('cameraStatusText');
	const checkInBtn = document.getElementById('checkInBtn');
	const retakeBtn  = document.getElementById('retakeBtn');
	const cameraFrame = document.getElementById('cameraFrame');
	const successAnim = document.getElementById('successAnim');
	const scanLine    = document.getElementById('scanLine');

	const states = {
		ready: {
			text: 'จัดหน้าให้อยู่ในกรอบ แล้วกด Check-In',
			cls: '', showBtns: true, showCamera: true, showSuccess: false
		},
		verifying: {
			text: 'กำลังบันทึกการเข้าเรียน...', cls: 'verifying',
			showBtns: false, showCamera: true, showSuccess: false
		},
		success: {
			text: `✅ เช็คชื่อสำเร็จ! ${formatTime()}`,
			cls: 'success', showBtns: false, showCamera: false, showSuccess: true
		},
		error: {
			text: message || 'เช็คชื่อไม่สำเร็จ กรุณาลองใหม่',
			cls: 'error', showBtns: true, showCamera: true, showSuccess: false
		},
	};

	const s = states[state];
	if (!s) return;

	if (statusText) { statusText.textContent = s.text; statusText.className = `camera-status-text ${s.cls}`; }
	if (checkInBtn) checkInBtn.style.display = s.showBtns ? 'inline-flex' : 'none';
	if (retakeBtn)  retakeBtn.style.display  = s.showBtns ? 'inline-flex' : 'none';
	if (cameraFrame) cameraFrame.style.display = s.showCamera ? 'block' : 'none';
	if (successAnim) successAnim.style.display  = s.showSuccess ? 'flex'  : 'none';
	if (scanLine)    scanLine.style.display      = s.showCamera  ? 'block' : 'none';
}

async function doCheckIn() {
	setCameraState('verifying');

	if (!sessionData || !sessionData.sessionCode) {
		setCameraState('error', 'ไม่พบ Session Code');
		return;
	}

	try {
		// ── STEP 1: verify sessionCode → ดึง sessionId จริง ──
		const verifyRes  = await fetch(`/api/session/verify/${encodeURIComponent(sessionData.sessionCode)}`, {
			credentials: 'include'
		});

		if (!verifyRes.ok) {
			setCameraState('error', 'Session ไม่ถูกต้องหรือหมดอายุแล้ว');
			return;
		}

		const verifyData = await verifyRes.json();
		if (!verifyData.success) {
			setCameraState('error', verifyData.message || 'Session ไม่ถูกต้อง');
			return;
		}

		const realSessionId = verifyData.sessionId;

		// แสดงชื่อวิชาและห้องใน overlay
		const label = document.getElementById('faceSessionLabel');
		if (label) label.textContent = `${verifyData.subject || ''} — ${verifyData.room || ''}`;

		// ── STEP 2: ดึง GPS (timeout 5 วิ, fallback null) ──
		const { lat, lng } = await getPosition();

		// ── STEP 3: POST เช็คชื่อ ──
		const res = await fetch('/student/attendance/checkin', {
			method: 'POST',
			credentials: 'include',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				sessionId: realSessionId,
				latitude:  lat,
				longitude: lng
			}),
		});

		// ✅ FIX: ตรวจสอบ HTTP status ก่อน parse JSON
		if (res.status === 401) {
			// session หมด → redirect login
			showToast('หมดเวลา session กรุณา login ใหม่', 'error');
			setTimeout(() => { window.location.href = 'login.html'; }, 1500);
			return;
		}

		const data = await res.json();

		if (data.success) {
			setCameraState('success');
			stopFaceCamera();
			setFlowStep(3);

			// แสดงข้อมูลสำเร็จ
			showToast(`เช็คชื่อสำเร็จ! วิชา ${data.subject || verifyData.subject || ''}`, 'success', 4000);

			setTimeout(() => {
				window.location.href = 'student-stats.html';
			}, 2500);
		} else {
			setCameraState('error', data.message || 'เช็คชื่อไม่สำเร็จ');
		}

	} catch (err) {
		console.error('CheckIn error:', err);
		setCameraState('error', 'เชื่อมต่อ server ไม่ได้ กรุณาลองใหม่');
	}
}

// ✅ GPS helper — ถ้า deny หรือ timeout ให้ส่ง null (ไม่ใช่ 0,0)
// AttendanceService จะ skip การตรวจ GPS เมื่อได้รับ null
function getPosition() {
	return new Promise((resolve) => {
		if (!navigator.geolocation) return resolve({ lat: null, lng: null });
		const timer = setTimeout(() => resolve({ lat: null, lng: null }), 5000);
		navigator.geolocation.getCurrentPosition(
			(pos) => {
				clearTimeout(timer);
				resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
			},
			() => {
				clearTimeout(timer);
				resolve({ lat: null, lng: null });
			}
		);
	});
}

// ── Flow Step UI ──────────────────────────────
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
		if (!c) return;
		c.className = 'flow-step-circle';
		if (i + 1 < step)      c.classList.add('done');
		else if (i + 1 === step) c.classList.add('active');
	});

	connectors.forEach((c, i) => {
		if (!c) return;
		c.className = 'flow-connector';
		if (i + 1 < step) c.classList.add('done');
	});
}

function openQRScanner() { openQRScanOverlay(); }

function stopFaceCamera() {
	if (cameraStream) {
		cameraStream.getTracks().forEach(track => track.stop());
		cameraStream = null;
		const video = document.getElementById('cameraVideo');
		if (video) video.srcObject = null;
	}
}
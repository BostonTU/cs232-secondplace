/* ============================================
   AttendX - Student Leave JS
   ============================================ */

document.addEventListener('DOMContentLoaded', async () => {
  const user = getUser();
  if (user) {
    const nameEl = document.getElementById('sidebarName');
    const roleEl = document.getElementById('sidebarRole');
    if (nameEl) nameEl.textContent = user.name?.split(' ')[0] || 'นักศึกษา';
    if (roleEl) roleEl.textContent = 'นักศึกษา';
    initSidebarAvatar();
  }

  const dateInput = document.getElementById('leaveDate');
  if (dateInput) dateInput.value = formatDate();

  // ✅ ดึงวิชาจาก DB แทน hardcode
  await loadMySubjects();
  await loadLeaveHistory();
});

// ── โหลดวิชาที่ enroll จาก DB ─────────────────
async function loadMySubjects() {
  try {
    const res  = await fetch('/api/subjects/my', { credentials: 'include' });
    const data = await res.json();
    if (!data.success) return;

    const select = document.getElementById('leaveSubject');
    if (!select) return;
    select.innerHTML = '<option value="">— เลือกวิชา —</option>';
    data.data.forEach(s => {
      const opt = document.createElement('option');
      opt.value       = s.subject_code;
      opt.textContent = `${s.subject_code} - ${s.subject_name}`;
      select.appendChild(opt);
    });
  } catch (e) {
    console.warn('โหลดวิชาไม่สำเร็จ');
  }
}

function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  const label = document.getElementById('fileLabel');
  label.textContent = `📎 ${file.name} (${(file.size / 1024).toFixed(0)} KB)`;
  document.getElementById('fileDropArea').style.borderColor = 'var(--green)';
  document.getElementById('fileDropArea').style.background  = 'var(--green-bg)';
}

// ✅ FIX: TYPE_LABELS ตรงกับค่าที่ DB เก็บจริง (ภาษาไทย)
const TYPE_LABELS = { 'ป่วย': 'ลาป่วย', 'กิจ': 'ลากิจ', 'อื่นๆ': 'อื่นๆ' };
const TYPE_MAP    = { sick: 'ป่วย', personal: 'กิจ', other: 'อื่นๆ' };

let leaveHistory = [];

async function submitLeave(event) {
  event.preventDefault();

  const user    = getUser();
  const subject = document.getElementById('leaveSubject').value;
  const date    = document.getElementById('leaveDate').value;
  const type    = document.getElementById('leaveType').value;
  const reason  = document.getElementById('leaveReason').value.trim();
  const fileEl  = document.getElementById('leaveFile');

  if (!subject || !date || !type || !reason) {
    showToast('กรุณากรอกข้อมูลให้ครบ', 'error');
    return;
  }

  const btn     = document.getElementById('leaveSubmitBtn');
  const spinner = document.getElementById('leaveSpinner');
  btn.disabled  = true;
  spinner.style.display = 'block';
  btn.querySelector('.btn-text').style.display = 'none';

  try {
    const fd = new FormData();
    fd.append('studentId',   user?.id || user?.username || '');
    fd.append('studentName', user?.name || '');
    fd.append('subject',     subject);
    fd.append('leaveDate',   date);
    fd.append('type',        TYPE_MAP[type] || type);
    fd.append('leaveReason', reason);
    if (fileEl?.files[0]) fd.append('file', fileEl.files[0]);

    const res  = await fetch('/api/student/leave', {
      method: 'POST',
      body: fd,
      credentials: 'include'
    });
    const data = await res.json();

    if (!data.success) throw new Error(data.message || 'ส่งไม่สำเร็จ');

    document.getElementById('leaveForm').reset();
    document.getElementById('leaveDate').value = formatDate();
    document.getElementById('fileLabel').textContent = 'คลิกหรือลากไฟล์มาวาง';
    document.getElementById('fileDropArea').style.borderColor = '';
    document.getElementById('fileDropArea').style.background  = '';

    // โหลดวิชาใหม่หลัง reset form
    await loadMySubjects();

    document.getElementById('leaveSuccess').style.display = 'flex';
    setTimeout(() => document.getElementById('leaveSuccess').style.display = 'none', 4000);

    showToast('ส่งใบลาเรียบร้อย รอการอนุมัติ', 'success');
    await loadLeaveHistory();

  } catch (err) {
    showToast(err.message || 'เกิดข้อผิดพลาด', 'error');
  } finally {
    btn.disabled = false;
    spinner.style.display = 'none';
    btn.querySelector('.btn-text').style.display = 'inline';
  }
}

async function loadLeaveHistory() {
  const user      = getUser();
  const studentId = user?.id || user?.username || '';
  try {
    const res = await fetch(`/api/student/leave?studentId=${encodeURIComponent(studentId)}`, {
      credentials: 'include'
    });
    leaveHistory = await res.json();
    if (!Array.isArray(leaveHistory)) leaveHistory = [];
  } catch {
    leaveHistory = [];
  }
  renderLeaveHistory();
  renderSummaryChips();
}

function renderLeaveHistory() {
  const list = document.getElementById('leaveHistoryList');
  if (!list) return;

  if (!leaveHistory.length) {
    list.innerHTML = '<div style="color:var(--text-muted);font-size:13px;padding:12px 0;">ยังไม่มีประวัติการลา</div>';
    return;
  }

  list.innerHTML = leaveHistory.map((l, idx) => `
    <div class="leave-history-item" onclick="openHistoryModal(${idx})" style="cursor:pointer;">
      <div class="hist-icon" style="background:var(--bg-page);">
        ${l.type === 'ป่วย' ? '🤒' : l.type === 'กิจ' ? '👤' : '📝'}
      </div>
      <div class="lhi-info">
        <div class="lhi-course">${l.subject} — ${TYPE_LABELS[l.type] || l.type}</div>
        <div class="lhi-date">${l.leaveDate} • ${(l.leaveReason||'').substring(0,40)}${(l.leaveReason||'').length>40?'...':''}</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        ${statusBadge(l.status)}
        <span style="font-size:16px;color:var(--text-muted);">›</span>
      </div>
    </div>
  `).join('');
}

function renderSummaryChips() {
  const el = document.getElementById('leaveSummaryChips');
  if (!el) return;
  const counts = { pending: 0, approved: 0, rejected: 0 };
  leaveHistory.forEach(l => { if (counts[l.status] !== undefined) counts[l.status]++; });
  el.innerHTML = `
    <span class="badge badge-orange">⏳ รอ ${counts.pending}</span>
    <span class="badge badge-green">✅ อนุมัติ ${counts.approved}</span>
    <span class="badge badge-red">❌ ปฏิเสธ ${counts.rejected}</span>
  `;
}

function openHistoryModal(idx) {
  const leave = leaveHistory[idx];
  if (!leave) return;

  document.getElementById('histModalIcon').textContent    = leave.type === 'ป่วย' ? '🤒' : leave.type === 'กิจ' ? '👤' : '📝';
  document.getElementById('histModalSubject').textContent = `${leave.subject} — ${TYPE_LABELS[leave.type] || leave.type}`;
  document.getElementById('histModalDate').textContent    = `วันที่ ${leave.leaveDate}`;
  document.getElementById('histModalReason').textContent  = leave.leaveReason;
  document.getElementById('histModalStatus').innerHTML    = statusBadge(leave.status);

  const statusNote = document.getElementById('histModalNote');
  statusNote.innerHTML = leave.status === 'rejected'
    ? `<div style="margin-top:12px;padding:10px 14px;background:var(--red-bg);border-radius:8px;border:1px solid rgba(239,68,68,0.2);font-size:13px;color:var(--red);">⚠️ ใบลาถูกปฏิเสธ กรุณาส่งใบลาใหม่พร้อมเหตุผลเพิ่มเติม</div>`
    : '';

  const fileSection = document.getElementById('histModalFile');
  fileSection.innerHTML = leave.documentUrl
    ? `<div style="margin-top:14px;padding:10px 14px;background:var(--bg-page);border-radius:8px;border:1px solid var(--border);">
        <div style="font-size:12px;font-weight:600;color:var(--text-muted);margin-bottom:6px;">📎 เอกสารที่แนบไป</div>
        <a href="/uploads/${leave.documentUrl}" target="_blank" style="display:flex;align-items:center;gap:8px;text-decoration:none;">
          <span style="font-size:22px;">📄</span>
          <div style="font-size:13px;font-weight:600;color:var(--blue);">${leave.documentUrl}</div>
        </a>
      </div>`
    : `<div style="margin-top:10px;font-size:12px;color:var(--text-muted);">ไม่มีเอกสารแนบ</div>`;

  document.getElementById('histModal').classList.remove('hidden');
}

function closeHistModal() {
  document.getElementById('histModal').classList.add('hidden');
}

document.addEventListener('click', e => {
  const m = document.getElementById('histModal');
  if (m && e.target === m) closeHistModal();
});
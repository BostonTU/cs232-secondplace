/* ============================================
   AttendX - Student Leave JS
   ============================================ */

// ── Init ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Set default date to today
  const dateInput = document.getElementById('leaveDate');
  if (dateInput) dateInput.value = formatDate();

  renderLeaveHistory();
  renderSummaryChips();
});

// ── File Select ───────────────────────────────
function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  const label = document.getElementById('fileLabel');
  label.textContent = `📎 ${file.name} (${(file.size / 1024).toFixed(0)} KB)`;
  document.getElementById('fileDropArea').style.borderColor = 'var(--green)';
  document.getElementById('fileDropArea').style.background  = 'var(--green-bg)';
}

// ── Submit Leave ──────────────────────────────
async function submitLeave(event) {
  event.preventDefault();

  const subject = document.getElementById('leaveSubject').value;
  const date    = document.getElementById('leaveDate').value;
  const type    = document.getElementById('leaveType').value;
  const reason  = document.getElementById('leaveReason').value.trim();

  if (!subject || !date || !type || !reason) {
    showToast('กรุณากรอกข้อมูลให้ครบ', 'error');
    return;
  }

  const btn     = document.getElementById('leaveSubmitBtn');
  const spinner = document.getElementById('leaveSpinner');
  btn.disabled  = true;
  spinner.style.display = 'block';
  btn.querySelector('.btn-text').style.display = 'none';

  await new Promise(r => setTimeout(r, 1200));

  // Add to mock history
  MOCK_LEAVE_REQUESTS.unshift({
    id: 'L' + Date.now(),
    studentId: '6401234567',
    name: 'กิตติดินทร์ เชงมงคลศักดิ์',
    subject, date, type, reason,
    status: 'pending',
    hasFile: !!document.getElementById('leaveFile').files[0],
  });

  // Reset form
  document.getElementById('leaveForm').reset();
  document.getElementById('leaveDate').value = formatDate();
  document.getElementById('fileLabel').textContent = 'คลิกหรือลากไฟล์มาวาง';
  document.getElementById('fileDropArea').style.borderColor = '';
  document.getElementById('fileDropArea').style.background  = '';

  btn.disabled = false;
  spinner.style.display = 'none';
  btn.querySelector('.btn-text').style.display = 'inline';

  document.getElementById('leaveSuccess').style.display = 'flex';
  setTimeout(() => document.getElementById('leaveSuccess').style.display = 'none', 4000);

  showToast('ส่งใบลาเรียบร้อย รอการอนุมัติ', 'success');
  renderLeaveHistory();
  renderSummaryChips();
}

// ── Render History ────────────────────────────
const TYPE_LABELS = { sick: 'ลาป่วย', personal: 'ลากิจ', other: 'อื่นๆ' };

function renderLeaveHistory() {
  const list = document.getElementById('leaveHistoryList');
  if (!list) return;

  const myLeaves = MOCK_LEAVE_REQUESTS.filter(l => l.studentId === '6401234567');

  if (!myLeaves.length) {
    list.innerHTML = '<div style="color:var(--text-muted);font-size:13px;padding:12px 0;">ยังไม่มีประวัติการลา</div>';
    return;
  }

  list.innerHTML = myLeaves.map(l => `
    <div class="leave-history-item" onclick="openHistoryModal('${l.id}')" style="cursor:pointer;">
      <div class="hist-icon" style="background:var(--bg-page);">
        ${l.type === 'sick' ? '🤒' : l.type === 'personal' ? '👤' : '📝'}
      </div>
      <div class="lhi-info">
        <div class="lhi-course">${l.subject} — ${TYPE_LABELS[l.type] || l.type}</div>
        <div class="lhi-date">${l.date} • ${l.reason.substring(0, 40)}${l.reason.length > 40 ? '...' : ''}</div>
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
  const myLeaves = MOCK_LEAVE_REQUESTS.filter(l => l.studentId === '6401234567');
  const counts = { pending: 0, approved: 0, rejected: 0 };
  myLeaves.forEach(l => counts[l.status]++);

  el.innerHTML = `
    <span class="badge badge-orange">⏳ รอ ${counts.pending}</span>
    <span class="badge badge-green">✅ อนุมัติ ${counts.approved}</span>
    <span class="badge badge-red">❌ ปฏิเสธ ${counts.rejected}</span>
  `;
}

// ── History Detail Modal ──────────────────────
function openHistoryModal(id) {
  const leave = MOCK_LEAVE_REQUESTS.find(l => l.id === id);
  if (!leave) return;

  document.getElementById('histModalIcon').textContent = leave.type === 'sick' ? '🤒' : leave.type === 'personal' ? '👤' : '📝';
  document.getElementById('histModalSubject').textContent = `${leave.subject} — ${TYPE_LABELS[leave.type] || leave.type}`;
  document.getElementById('histModalDate').textContent = `วันที่ ${leave.date}`;
  document.getElementById('histModalReason').textContent = leave.reason;
  document.getElementById('histModalStatus').innerHTML = statusBadge(leave.status);

  const statusNote = document.getElementById('histModalNote');
  if (leave.status === 'rejected') {
    statusNote.innerHTML = `<div style="margin-top:12px;padding:10px 14px;background:var(--red-bg);border-radius:8px;border:1px solid rgba(239,68,68,0.2);font-size:13px;color:var(--red);">⚠️ ใบลาถูกปฏิเสธ กรุณาส่งใบลาใหม่พร้อมเหตุผลเพิ่มเติม</div>`;
  } else {
    statusNote.innerHTML = '';
  }

  const fileSection = document.getElementById('histModalFile');
  if (leave.hasFile) {
    fileSection.innerHTML = `
      <div style="margin-top:14px;padding:10px 14px;background:var(--bg-page);border-radius:8px;border:1px solid var(--border);">
        <div style="font-size:12px;font-weight:600;color:var(--text-muted);margin-bottom:6px;">📎 เอกสารที่แนบไป</div>
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:22px;">📄</span>
          <div style="font-size:13px;font-weight:600;">${leave.fileName || 'เอกสารแนบ.pdf'}</div>
        </div>
      </div>`;
  } else {
    fileSection.innerHTML = `<div style="margin-top:10px;font-size:12px;color:var(--text-muted);">ไม่มีเอกสารแนบ</div>`;
  }

  document.getElementById('histModal').classList.remove('hidden');
}

function closeHistModal() {
  document.getElementById('histModal').classList.add('hidden');
}

document.addEventListener('click', e => {
  const m = document.getElementById('histModal');
  if (m && e.target === m) closeHistModal();
});

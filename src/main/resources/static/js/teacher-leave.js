/* ============================================
   AttendX - Teacher Leave Management JS
   ============================================ */

let currentFilter  = 'pending';
let pendingAction  = null; // { id, action }

// ── Init ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  renderSummary();
  renderLeaveList('pending');
});

// ── Summary Row ───────────────────────────────
function renderSummary() {
  const counts = { pending: 0, approved: 0, rejected: 0 };
  MOCK_LEAVE_REQUESTS.forEach(l => counts[l.status]++);

  const row = document.getElementById('leaveSummaryRow');
  if (!row) return;

  const items = [
    { label:'รอดำเนินการ', count:counts.pending,  color:'var(--orange)', bg:'var(--orange-bg)' },
    { label:'อนุมัติแล้ว',  count:counts.approved, color:'var(--green)',  bg:'var(--green-bg)' },
    { label:'ปฏิเสธแล้ว',  count:counts.rejected, color:'var(--red)',    bg:'var(--red-bg)'   },
  ];

  row.innerHTML = items.map(i => `
    <div class="leave-summary-card">
      <div class="lsc-count" style="color:${i.color};">${i.count}</div>
      <div class="lsc-label">${i.label}</div>
    </div>
  `).join('');

  const badge = document.getElementById('leaveNavBadge');
  if (badge) badge.textContent = counts.pending;
}

// ── Filter Tabs ───────────────────────────────
function filterLeave(filter) {
  currentFilter = filter;
  ['pending','approved','rejected','all'].forEach(f => {
    const tab = document.getElementById(`tab-${f}`);
    if (!tab) return;
    tab.className = f === filter ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm';
  });
  renderLeaveList(filter);
}

// ── Render Leave List ─────────────────────────
const TYPE_LABELS = { sick:'ลาป่วย', personal:'ลากิจ', other:'อื่นๆ' };

function renderLeaveList(filter) {
  const list = document.getElementById('leaveList');
  if (!list) return;

  const items = filter === 'all'
    ? MOCK_LEAVE_REQUESTS
    : MOCK_LEAVE_REQUESTS.filter(l => l.status === filter);

  if (!items.length) {
    list.innerHTML = `
      <div style="text-align:center;padding:48px;color:var(--text-muted);">
        <div style="font-size:40px;margin-bottom:12px;">📭</div>
        <div style="font-size:15px;font-weight:600;">ไม่มีรายการ</div>
      </div>`;
    return;
  }

  list.innerHTML = items.map(l => `
    <div class="leave-request-card" id="leave-card-${l.id}">
      <div class="lr-avatar">${l.name[0]}</div>
      <div class="lr-info">
        <div class="lr-name">${l.name} <span style="font-size:12px;color:var(--text-muted);font-weight:400;">(${l.studentId})</span></div>
        <div class="lr-meta">
          ${l.subject} • ${TYPE_LABELS[l.type] || l.type} • วันที่ ${l.date}
        </div>
        <div class="lr-reason">${l.reason.substring(0, 60)}${l.reason.length > 60 ? '...' : ''}
          <button onclick="openDetailModal('${l.id}')" style="background:none;border:none;color:var(--blue);cursor:pointer;font-size:12px;font-weight:600;padding:0 4px;text-decoration:underline;">ดูเพิ่มเติม</button>
        </div>
        <div class="leave-actions">
          ${l.status === 'pending' ? `
            <button class="btn btn-success btn-sm" onclick="promptAction('${l.id}','approved')">✅ อนุมัติ</button>
            <button class="btn btn-danger btn-sm"  onclick="promptAction('${l.id}','rejected')">❌ ปฏิเสธ</button>
          ` : ''}
          ${statusBadge(l.status)}
          ${l.hasFile ? `<button onclick="openDetailModal('${l.id}')" class="btn btn-secondary btn-sm">📎 ดูเอกสาร</button>` : ''}
        </div>
      </div>
    </div>
  `).join('');
}

// ── Detail Modal (view full reason + file) ─────
function openDetailModal(id) {
  const leave = MOCK_LEAVE_REQUESTS.find(l => l.id === id);
  if (!leave) return;

  document.getElementById('detailModalIcon').textContent  = leave.type === 'sick' ? '🤒' : leave.type === 'personal' ? '👤' : '📝';
  document.getElementById('detailModalName').textContent  = `${leave.name} (${leave.studentId})`;
  document.getElementById('detailModalMeta').textContent  = `${leave.subject} • ${TYPE_LABELS[leave.type] || leave.type} • วันที่ ${leave.date}`;
  document.getElementById('detailModalReason').textContent = leave.reason;
  document.getElementById('detailModalStatus').innerHTML  = statusBadge(leave.status);

  const fileSection = document.getElementById('detailModalFile');
  if (leave.hasFile) {
    fileSection.innerHTML = `
      <div style="margin-top:16px;padding:12px 16px;background:var(--blue-bg,rgba(59,130,246,0.08));border-radius:10px;border:1px solid rgba(59,130,246,0.2);">
        <div style="font-size:13px;font-weight:600;color:var(--text-secondary);margin-bottom:8px;">📎 เอกสารแนบ</div>
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="font-size:24px;">📄</span>
          <div>
            <div style="font-size:13px;font-weight:600;">${leave.fileName || 'medical_certificate.pdf'}</div>
            <div style="font-size:12px;color:var(--text-muted);">${leave.fileSize || '245 KB'}</div>
          </div>
          <button onclick="mockDownload()" class="btn btn-secondary btn-sm" style="margin-left:auto;">⬇ ดาวน์โหลด</button>
        </div>
      </div>`;
  } else {
    fileSection.innerHTML = `<div style="margin-top:12px;font-size:13px;color:var(--text-muted);">📭 ไม่มีเอกสารแนบ</div>`;
  }

  const actionBtns = document.getElementById('detailModalActions');
  if (leave.status === 'pending') {
    actionBtns.innerHTML = `
      <button class="btn btn-success" onclick="closeDetailModal();promptAction('${leave.id}','approved')">✅ อนุมัติ</button>
      <button class="btn btn-danger"  onclick="closeDetailModal();promptAction('${leave.id}','rejected')">❌ ปฏิเสธ</button>
    `;
  } else {
    actionBtns.innerHTML = '';
  }

  document.getElementById('detailModal').classList.remove('hidden');
}

function closeDetailModal() {
  document.getElementById('detailModal').classList.add('hidden');
}

function mockDownload() {
  showToast('ดาวน์โหลดเอกสาร... (Mock)', 'success');
}

// ── Confirm Modal ─────────────────────────────
function promptAction(id, action) {
  pendingAction = { id, action };
  const modal = document.getElementById('confirmModal');
  const leave = MOCK_LEAVE_REQUESTS.find(l => l.id === id);

  document.getElementById('modalIcon').textContent  = action === 'approved' ? '✅' : '❌';
  document.getElementById('modalTitle').textContent = action === 'approved' ? 'ยืนยันการอนุมัติ' : 'ยืนยันการปฏิเสธ';
  document.getElementById('modalBody').textContent  = `คุณต้องการ${action === 'approved' ? 'อนุมัติ' : 'ปฏิเสธ'}ใบลาของ ${leave?.name}?`;
  document.getElementById('modalConfirmBtn').className = `btn ${action === 'approved' ? 'btn-success' : 'btn-danger'}`;
  document.getElementById('modalConfirmBtn').textContent = action === 'approved' ? 'อนุมัติ' : 'ปฏิเสธ';

  modal.classList.remove('hidden');
}

function closeModal() {
  document.getElementById('confirmModal').classList.add('hidden');
  pendingAction = null;
}

function confirmAction() {
  if (!pendingAction) return;
  const { id, action } = pendingAction;
  const leave = MOCK_LEAVE_REQUESTS.find(l => l.id === id);
  if (leave) leave.status = action;

  closeModal();
  renderSummary();
  renderLeaveList(currentFilter);

  const msg = action === 'approved'
    ? `อนุมัติใบลาของ ${leave?.name} แล้ว`
    : `ปฏิเสธใบลาของ ${leave?.name} แล้ว`;
  showToast(msg, action === 'approved' ? 'success' : 'error');
}

// Close modals on overlay click
document.addEventListener('click', e => {
  const confirmModal = document.getElementById('confirmModal');
  if (confirmModal && e.target === confirmModal) closeModal();
  const detailModal = document.getElementById('detailModal');
  if (detailModal && e.target === detailModal) closeDetailModal();
});

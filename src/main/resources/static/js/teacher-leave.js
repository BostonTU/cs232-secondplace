/* ============================================
   AttendX - Teacher Leave Management (Real API)
   ============================================ */

let currentFilter = 'pending';
let allLeaves     = [];
let pendingAction = null;

document.addEventListener('DOMContentLoaded', async () => {
  // ✅ FIX: ตรวจสอบ auth และโหลด user info ใน sidebar
  const user = typeof getUser === 'function' ? getUser() : null;
  if (!user) { window.location.href = 'login.html'; return; }

  const nameEl = document.getElementById('sidebarName');
  if (nameEl) nameEl.textContent = user.name?.split(' ')[0] || 'อาจารย์';
  if (typeof initSidebarAvatar === 'function') initSidebarAvatar();

  await loadLeaves();
  // ✅ FIX: ไม่เรียก loadTeacherNotifications() อีก เพราะ renderSummary() จัดการ leaveNavBadge แล้ว
  // loadTeacherNotifications() จะ overwrite badge ที่ renderSummary() set ไว้ด้วย API call ซ้ำ
  // เรียกแค่เพื่ออัปเดต bell notifBadge และ dropdown list เท่านั้น
  _updateBellNotif();
});

// ── โหลดใบลาจาก API ───────────────────────────
async function loadLeaves() {
  try {
    const res  = await fetch('/api/teacher/leave/all', { credentials: 'include' });
    if (res.status === 401) { window.location.href = 'login.html'; return; }
    const json = await res.json();
    if (!json.success) { showToast('โหลดข้อมูลไม่สำเร็จ', 'error'); return; }

    allLeaves = json.data || [];
    renderSummary();
    renderLeaveList(currentFilter);
    // ✅ อัปเดต bell dropdown จากข้อมูลที่โหลดมาแล้ว โดยไม่ยิง API ซ้ำ
    _updateBellNotif();
  } catch (err) {
    console.error(err);
    showToast('โหลดข้อมูลไม่สำเร็จ', 'error');
  }
}

// อัปเดตแค่ bell icon + notif dropdown จาก allLeaves ที่มีอยู่แล้ว
// ไม่แตะ leaveNavBadge (renderSummary() จัดการแล้ว)
function _updateBellNotif() {
  const pending = allLeaves.filter(l => l.status === 'pending');
  const readIds = JSON.parse(localStorage.getItem('attendx_read_notifs') || '[]');
  const notifs  = pending.slice(0, 5).map(l => ({
    icon:   '📋',
    title:  `คำร้องลาใหม่: ${l.studentName || l.studentId}`,
    time:   typeof formatTimeAgo === 'function' ? formatTimeAgo(l.submittedAt) : '',
    unread: !readIds.includes(String(l.id)),
    id:     l.id,
    url:    'teacher-leave.html'
  }));

  if (typeof renderNotifList === 'function') {
    renderNotifList(
      notifs.length ? notifs : [{ icon: '✅', title: 'ไม่มีการแจ้งเตือนใหม่', time: '', unread: false, url: '#' }],
      'notifList'
    );
  }

  const unread = notifs.filter(n => n.unread).length;
  const notifBadge = document.getElementById('notifBadge');
  if (notifBadge) { notifBadge.textContent = unread; notifBadge.style.display = unread ? 'flex' : 'none'; }
}

// ── Summary Row ───────────────────────────────
function renderSummary() {
  const counts = { pending:0, approved:0, rejected:0 };
  allLeaves.forEach(l => { if (counts[l.status] !== undefined) counts[l.status]++; });

  const row = document.getElementById('leaveSummaryRow');
  if (row) {
    row.innerHTML = [
      { label:'รอดำเนินการ', count:counts.pending,  color:'var(--orange)', bg:'var(--orange-bg)' },
      { label:'อนุมัติแล้ว',  count:counts.approved, color:'var(--green)',  bg:'var(--green-bg)'  },
      { label:'ปฏิเสธแล้ว',  count:counts.rejected, color:'var(--red)',    bg:'var(--red-bg)'    },
    ].map(i => `
      <div class="leave-summary-card">
        <div class="lsc-count" style="color:${i.color};">${i.count}</div>
        <div class="lsc-label">${i.label}</div>
      </div>`).join('');
  }

  const badge = document.getElementById('leaveNavBadge');
  if (badge) {
    badge.textContent   = counts.pending;
    badge.style.display = counts.pending > 0 ? 'inline-flex' : 'none';
  }
}

// ── Filter Tabs ───────────────────────────────
function filterLeave(filter) {
  currentFilter = filter;
  ['pending','approved','rejected','all'].forEach(f => {
    const tab = document.getElementById(`tab-${f}`);
    if (tab) tab.className = f === filter ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm';
  });
  renderLeaveList(filter);
}

// ── Render Leave List ─────────────────────────
// TYPE_LABELS ตรงกับค่าที่ DB เก็บจริง (ภาษาไทย)
const TYPE_LABELS = { 'ป่วย':'ลาป่วย', 'กิจ':'ลากิจ', 'อื่นๆ':'อื่นๆ', sick:'ลาป่วย', personal:'ลากิจ', other:'อื่นๆ' };

function renderLeaveList(filter) {
  const list = document.getElementById('leaveList');
  if (!list) return;

  const items = filter === 'all' ? allLeaves : allLeaves.filter(l => l.status === filter);

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
      <div class="lr-avatar">${(l.studentName || l.studentId)[0]}</div>
      <div class="lr-info">
        <div class="lr-name">${l.studentName || l.studentId}
          <span style="font-size:12px;color:var(--text-muted);font-weight:400;">(${l.studentId})</span>
        </div>
        <div class="lr-meta">
          ${l.subject} • ${TYPE_LABELS[l.type] || l.type} • วันที่ ${l.leaveDate}
        </div>
        <div class="lr-reason">${(l.leaveReason||'').substring(0,60)}${(l.leaveReason||'').length>60?'...':''}
          <button onclick="openDetailModal(${l.id})" style="background:none;border:none;color:var(--blue);cursor:pointer;font-size:12px;font-weight:600;padding:0 4px;text-decoration:underline;">ดูเพิ่มเติม</button>
        </div>
        <div class="leave-actions">
          ${l.status === 'pending' ? `
            <button class="btn btn-success btn-sm" onclick="promptAction(${l.id},'approved')">✅ อนุมัติ</button>
            <button class="btn btn-danger  btn-sm" onclick="promptAction(${l.id},'rejected')">❌ ปฏิเสธ</button>
          ` : ''}
          ${statusBadge(l.status)}
          ${l.hasFile ? `<button onclick="openDetailModal(${l.id})" class="btn btn-secondary btn-sm">📎 ดูเอกสาร</button>` : ''}
        </div>
      </div>
    </div>`).join('');
}

// ── Detail Modal ──────────────────────────────
function openDetailModal(id) {
  const leave = allLeaves.find(l => l.id === id);
  if (!leave) return;

  document.getElementById('detailModalIcon').textContent   = leave.type==='sick'?'🤒':leave.type==='personal'?'👤':'📝';
  document.getElementById('detailModalName').textContent   = `${leave.studentName||leave.studentId} (${leave.studentId})`;
  document.getElementById('detailModalMeta').textContent   = `${leave.subject} • ${TYPE_LABELS[leave.type]||leave.type} • วันที่ ${leave.leaveDate}`;
  document.getElementById('detailModalReason').textContent = leave.leaveReason;
  document.getElementById('detailModalStatus').innerHTML   = statusBadge(leave.status);

  const fileSection = document.getElementById('detailModalFile');
  if (leave.hasFile && leave.documentUrl) {
    fileSection.innerHTML = `
      <div style="margin-top:16px;padding:12px 16px;background:var(--blue-bg);border-radius:10px;">
        <div style="font-size:13px;font-weight:600;color:var(--text-secondary);margin-bottom:8px;">📎 เอกสารแนบ</div>
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="font-size:24px;">📄</span>
          <div style="font-size:13px;font-weight:600;">${leave.documentUrl.split('?')[0].split('/').pop().split('_').slice(1).join('_') || 'เอกสาร'}</div>
		  <a href="${leave.documentUrl}" target="_blank" class="btn btn-secondary btn-sm" style="margin-left:auto;">⬇ เปิดไฟล์</a>
        </div>
      </div>`;
  } else {
    fileSection.innerHTML = `<div style="margin-top:12px;font-size:13px;color:var(--text-muted);">📭 ไม่มีเอกสารแนบ</div>`;
  }

  const actionBtns = document.getElementById('detailModalActions');
  actionBtns.innerHTML = leave.status === 'pending' ? `
    <button class="btn btn-success" onclick="closeDetailModal();promptAction(${leave.id},'approved')">✅ อนุมัติ</button>
    <button class="btn btn-danger"  onclick="closeDetailModal();promptAction(${leave.id},'rejected')">❌ ปฏิเสธ</button>` : '';

  document.getElementById('detailModal').classList.remove('hidden');
}

function closeDetailModal() { document.getElementById('detailModal').classList.add('hidden'); }

// ── Confirm Modal ─────────────────────────────
// หลังแก้ — เมื่ออนุมัติ ให้โหลด sessions มาให้เลือกก่อน

async function promptAction(id, action) {
    pendingAction = { id, action, sessionId: null };
    const leave = allLeaves.find(l => l.id === id);

    document.getElementById('modalIcon').textContent      = action === 'approved' ? '✅' : '❌';
    document.getElementById('modalTitle').textContent     = action === 'approved' ? 'ยืนยันการอนุมัติ' : 'ยืนยันการปฏิเสธ';
    document.getElementById('modalBody').textContent      = `คุณต้องการ${action === 'approved' ? 'อนุมัติ' : 'ปฏิเสธ'}ใบลาของ ${leave?.studentName || leave?.studentId}?`;
    document.getElementById('modalConfirmBtn').className  = `btn ${action === 'approved' ? 'btn-success' : 'btn-danger'}`;
    document.getElementById('modalConfirmBtn').textContent = action === 'approved' ? 'อนุมัติ' : 'ปฏิเสธ';

    // ── ถ้าอนุมัติ → โหลด sessions ของวิชา+วันที่นั้นให้เลือก ──
    const sessionPickWrap = document.getElementById('sessionPickWrap');
    if (sessionPickWrap) sessionPickWrap.innerHTML = '';

    if (action === 'approved') {
        try {
            const res  = await fetch(`/api/teacher/leave/${id}/sessions`, { credentials: 'include' });
            const json = await res.json();
            const sessions = json.data || [];

            if (sessions.length > 0 && sessionPickWrap) {
                const options = sessions.map(s =>
                    `<option value="${s.sessionId}">${s.sessionCode} — ${s.startedAt ? new Date(s.startedAt).toLocaleString('th-TH') : 'ไม่ระบุเวลา'}</option>`
                ).join('');
                sessionPickWrap.innerHTML = `
                    <div style="margin-top:12px;">
                        <label style="font-size:13px;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:6px;">
                            📅 เลือก Session ที่ต้องการอัปเดต:
                        </label>
                        <select id="sessionPickSelect"
                            style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:var(--radius-md);font-family:Prompt,sans-serif;font-size:13px;"
                            onchange="pendingAction.sessionId = this.value ? Number(this.value) : null">
                            <option value="">-- ทุก Session ในวันนั้น --</option>
                            ${options}
                        </select>
                    </div>`;
            } else if (sessionPickWrap) {
                sessionPickWrap.innerHTML = `
                    <div style="margin-top:10px;font-size:13px;color:var(--text-muted);">
                        ⚠️ ไม่พบ session ของวิชานี้ในวันที่ลา — ระบบจะบันทึก "ลา" ไว้รอ
                    </div>`;
            }
        } catch (e) {
            console.warn('โหลด sessions ไม่สำเร็จ', e);
        }
    }

    document.getElementById('confirmModal').classList.remove('hidden');
}

async function confirmAction() {
    if (!pendingAction) return;
    const { id, action, sessionId } = pendingAction;
    closeModal();

    try {
        const res  = await fetch(`/api/leave/${id}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ status: action, sessionId: sessionId || null })
        });
        const json = await res.json();

        if (json.success) {
            const leave = allLeaves.find(l => l.id === id);
            if (leave) leave.status = action;
            renderSummary();
            renderLeaveList(currentFilter);
            _updateBellNotif();
            showToast(action === 'approved' ? 'อนุมัติใบลาแล้ว — สถานะเด็กอัปเดตแล้ว' : 'ปฏิเสธใบลาแล้ว',
                      action === 'approved' ? 'success' : 'error');
        } else {
            showToast(json.message || 'เกิดข้อผิดพลาด', 'error');
        }
    } catch (err) {
        showToast('เกิดข้อผิดพลาด', 'error');
        console.error(err);
    }
}

function closeModal() {
  document.getElementById('confirmModal').classList.add('hidden');
  pendingAction = null;
}

async function confirmAction() {
  if (!pendingAction) return;
  const { id, action } = pendingAction;
  closeModal();

  try {
    const res  = await fetch(`/api/leave/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status: action })
    });
    const json = await res.json();

    if (json.success) {
      // อัปเดตใน local array เลย ไม่ต้องรีโหลด
      const leave = allLeaves.find(l => l.id === id);
      if (leave) leave.status = action;
      renderSummary();
      renderLeaveList(currentFilter);
      _updateBellNotif();
      showToast(action==='approved'?`อนุมัติใบลาแล้ว`:`ปฏิเสธใบลาแล้ว`, action==='approved'?'success':'error');
    } else {
      showToast(json.message||'เกิดข้อผิดพลาด', 'error');
    }
  } catch (err) {
    showToast('เกิดข้อผิดพลาด', 'error');
    console.error(err);
  }
}

document.addEventListener('click', e => {
  if (e.target === document.getElementById('confirmModal')) closeModal();
  if (e.target === document.getElementById('detailModal'))  closeDetailModal();
});
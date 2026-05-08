/* ============================================
   AttendX - Teacher Analytics (Real API)
   ============================================ */

let analyticsData = [];
let tableData = [];
let enrolledStudents = [];

document.addEventListener('DOMContentLoaded', async () => {
	const user = typeof getUser === 'function' ? getUser() : null;
	if (!user) { window.location.href = 'login.html'; return; }

	const nameEl = document.getElementById('sidebarName');
	if (nameEl) nameEl.textContent = user.name?.split(' ')[0] || 'อาจารย์';
	if (typeof initSidebarAvatar === 'function') initSidebarAvatar();

	await loadSubjects();
	await loadAnalytics();
	loadTeacherNotifications();
});

// ── โหลดวิชาที่อาจารย์สอน → ใส่ dropdown ──────
async function loadSubjects() {
	try {
		const res = await fetch('/api/subjects/teaching', { credentials: 'include' });
		const json = await res.json();
		if (!json.success) return;

		const select = document.getElementById('subjectFilter');
		if (!select) return;
		(json.data || []).forEach(s => {
			const opt = document.createElement('option');
			opt.value = s.subject_code;
			opt.textContent = `${s.subject_code} — ${s.subject_name || s.subject_code}`;
			select.appendChild(opt);
		});
	} catch (e) {
		console.warn('โหลดรายวิชาไม่สำเร็จ', e);
	}
}

// ── เมื่อเปลี่ยนวิชา ──────────────────────────
async function onSubjectChange() {
	await loadAnalytics();
}

// ── โหลดสถิติจาก API ──────────────────────────
async function loadAnalytics() {
	const subject = document.getElementById('subjectFilter')?.value || '';

	try {
		const url = subject
			? `/teacher/attendance/stats?subject=${encodeURIComponent(subject)}`
			: '/teacher/attendance/stats';

		const res = await fetch(url, { credentials: 'include' });
		if (res.status === 401) { window.location.href = 'login.html'; return; }
		const json = await res.json();

		if (!json.success) {
			showToast('โหลดข้อมูลไม่สำเร็จ', 'error'); return;
		}

		analyticsData = (json.data || []).map(s => ({
			id: s.studentId,
			name: s.fullName || s.studentId,
			present: Number(s.present) || 0,
			late: Number(s.late) || 0,
			absent: Number(s.absent) || 0,
			leave: Number(s.leave) || 0,
			total: Number(s.total) || 0,
		}));

		// ถ้าเลือกวิชา → โหลดรายชื่อนักเรียนที่ enroll ด้วย
		if (subject) {
			await loadEnrolledStudents(subject);
		} else {
			enrolledStudents = [];
			const countEl = document.getElementById('enrolledCount');
			if (countEl) countEl.textContent = '';
		}

		// Merge: นักเรียน enroll แต่ยังไม่เคยเช็คชื่อเลย → ใส่เป็น 0
		// หลังแก้ — ต้องรู้จำนวน sessions ทั้งหมดของวิชานั้นก่อน แล้วใส่เป็น absent
		// เพิ่มตัวแปรนับ totalSessions ก่อน merge (คำนวณจาก analyticsData ที่มีข้อมูลอยู่แล้ว)
		const maxTotal = analyticsData.length > 0
			? Math.max(...analyticsData.map(s => s.total))
			: 0;
		const checkedIds = new Set(analyticsData.map(s => s.id));
		enrolledStudents.forEach(e => {
			if (!checkedIds.has(e.studentId)) {
				analyticsData.push({
					id: e.studentId,
					name: e.studentName || e.studentId,
					present: 0,
					late: 0,
					absent: maxTotal,   // ขาดทุก session ที่เปิดไป
					leave: 0,
					total: maxTotal,
				});
			}
		});

		tableData = [...analyticsData];

		const sub = document.getElementById('analyticsSubtitle');
		if (sub) {
			const subjectLabel = subject || (json.subject || '');
			sub.textContent = `ภาพรวมการเข้าเรียน${subjectLabel ? ' ' + subjectLabel : ''} ภาคเรียน 1/2568`;
		}

		drawPieChart();
		drawBarChart();
		renderSummaryCards();
		renderTable(tableData);

	} catch (err) {
		console.error(err);
		showToast('โหลดข้อมูลไม่สำเร็จ', 'error');
	}
}

// ── โหลดนักเรียนที่ enroll วิชานี้ ──────────────
async function loadEnrolledStudents(subjectCode) {
	try {
		const res = await fetch(`/teacher/attendance/enrolled?subject=${encodeURIComponent(subjectCode)}`, { credentials: 'include' });
		if (!res.ok) { enrolledStudents = []; return; }
		const json = await res.json();
		enrolledStudents = (json.data || []).map(s => ({
			studentId: s.student_id || s.studentId,
			studentName: s.student_name || s.studentName || s.fullName,
		}));
		const countEl = document.getElementById('enrolledCount');
		if (countEl && enrolledStudents.length > 0) {
			countEl.textContent = `(นักเรียนในคลาส ${enrolledStudents.length} คน)`;
		}
	} catch (e) {
		enrolledStudents = [];
	}
}

// ── Pie Chart ─────────────────────────────────
function drawPieChart() {
	const canvas = document.getElementById('pieChart');
	if (!canvas || !analyticsData.length) return;
	const ctx = canvas.getContext('2d');

	let present = 0, absent = 0, late = 0, leave = 0;
	analyticsData.forEach(s => { present += s.present; absent += s.absent; late += s.late; leave += s.leave; });
	const total = present + absent + late + leave || 1;

	const slices = [
		{ label: 'มาเรียน', value: present, color: '#22C55E' },
		{ label: 'ขาดเรียน', value: absent, color: '#EF4444' },
		{ label: 'มาสาย', value: late, color: '#F59E0B' },
		{ label: 'ลา', value: leave, color: '#3B82F6' },
	];

	const cx = canvas.width / 2, cy = canvas.height / 2, r = Math.min(cx, cy) - 10;
	let startAngle = -Math.PI / 2;
	ctx.clearRect(0, 0, canvas.width, canvas.height);

	slices.forEach(s => {
		if (s.value === 0) return;
		const angle = (s.value / total) * 2 * Math.PI;
		ctx.beginPath(); ctx.moveTo(cx, cy);
		ctx.arc(cx, cy, r, startAngle, startAngle + angle);
		ctx.closePath(); ctx.fillStyle = s.color; ctx.fill();
		ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
		startAngle += angle;
	});

	ctx.beginPath(); ctx.arc(cx, cy, r * 0.55, 0, 2 * Math.PI);
	ctx.fillStyle = '#fff'; ctx.fill();

	const avgPct = Math.round((present + late * 0.5) / total * 100);
	ctx.fillStyle = '#1A1A2E'; ctx.font = 'bold 22px Prompt, sans-serif';
	ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
	ctx.fillText(avgPct + '%', cx, cy - 8);
	ctx.font = '12px Prompt, sans-serif'; ctx.fillStyle = '#9AA3B2';
	ctx.fillText('เฉลี่ย', cx, cy + 14);

	const legend = document.getElementById('pieLegend');
	if (legend) {
		legend.innerHTML = slices.map(s => `
      <div class="pie-legend-item">
        <span class="leg-dot" style="background:${s.color};"></span>
        <span class="leg-label">${s.label}</span>
        <span class="leg-val">${s.value} (${Math.round(s.value / total * 100)}%)</span>
      </div>`).join('');
	}
}

// ── Analytics Table ───────────────────────────
function renderTable(data) {
	const tbody = document.getElementById('analyticsTableBody');
	if (!tbody) return;

	if (!data.length) {
		tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:32px;color:var(--text-muted);">ยังไม่มีข้อมูลการเช็คชื่อ</td></tr>`;
		return;
	}

	tbody.innerHTML = data.map((s, i) => {
		const pct = s.total > 0 ? Math.round((s.present + s.late * 0.5) / s.total * 100) : 0;
		const status = pct >= 80 ? 'present' : pct >= 60 ? 'late' : 'absent';
		const statusLabels = { present: '✅ ผ่าน', late: '⚠️ เสี่ยง', absent: '❌ ไม่ผ่าน' };
		const statusColors = { present: 'var(--green)', late: 'var(--orange)', absent: 'var(--red)' };
		return `
    <tr>
      <td style="color:var(--text-muted);font-size:13px;">${i + 1}</td>
      <td class="student-name-cell">${s.name}</td>
      <td class="student-id-cell">${s.id}</td>
      <td style="font-size:13px;color:var(--green);font-weight:600;">${s.present}</td>
      <td style="font-size:13px;color:var(--red);font-weight:600;">${s.absent}</td>
      <td style="font-size:13px;color:var(--orange);font-weight:600;">${s.late}</td>
      <td style="font-size:13px;color:var(--blue);font-weight:600;">${s.leave}</td>
      <td>
        <div style="display:flex;align-items:center;gap:8px;min-width:120px;">
          <div class="progress-bar-wrap" style="flex:1;">
            <div class="progress-bar-fill ${getPctClass(pct)}" style="width:${pct}%;"></div>
          </div>
          <span style="font-size:13px;font-weight:700;min-width:36px;">${pct}%</span>
        </div>
      </td>
      <td><span style="font-size:12px;font-weight:700;color:${statusColors[status]};">${statusLabels[status]}</span></td>
    </tr>`;
	}).join('');
}

// ── Table Search ──────────────────────────────
function filterTable(query) {
	const q = query.toLowerCase().trim();
	tableData = q ? analyticsData.filter(s => s.name.toLowerCase().includes(q) || s.id.includes(q)) : [...analyticsData];
	renderTable(tableData);
}

// ── Summary Cards ─────────────────────────────
function renderSummaryCards() {
	const wrap = document.getElementById('analyticsSummary');
	if (!wrap || !analyticsData.length) return;

	const total = analyticsData.length;
	const allPct = analyticsData.map(s => s.total > 0 ? Math.round((s.present + s.late * 0.5) / s.total * 100) : 0);
	const avgPct = Math.round(allPct.reduce((a, b) => a + b, 0) / total);
	const passing = allPct.filter(p => p >= 80).length;
	const risk = allPct.filter(p => p >= 60 && p < 80).length;
	const failing = allPct.filter(p => p < 60).length;

	wrap.innerHTML = [
		{ icon: '👥', label: 'นักศึกษาทั้งหมด', value: `${total} คน`, bg: 'var(--yellow-light)' },
		{ icon: '📊', label: 'เฉลี่ยเข้าเรียน', value: `${avgPct}%`, bg: 'var(--green-bg)' },
		{ icon: '✅', label: 'ผ่านเกณฑ์ (≥80%)', value: `${passing} คน`, bg: 'var(--green-bg)' },
		{ icon: '⚠️', label: 'เสี่ยง (60–79%)', value: `${risk} คน`, bg: 'var(--orange-bg)' },
		{ icon: '❌', label: 'ไม่ผ่าน (<60%)', value: `${failing} คน`, bg: 'var(--red-bg)' },
	].map(c => `
    <div class="card stat-card">
      <div class="stat-top"><div class="stat-icon" style="background:${c.bg};">${c.icon}</div></div>
      <div class="stat-value">${c.value}</div>
      <div class="stat-label">${c.label}</div>
    </div>`).join('');
}

// ── Bar Chart ─────────────────────────────────
function drawBarChart() {
	const wrap = document.getElementById('barChart');
	if (!wrap || !analyticsData.length) return;

	let totalPresent = 0, totalLate = 0, totalAbsent = 0, totalLeave = 0, totalSessions = 0;
	analyticsData.forEach(s => {
		totalPresent += s.present;
		totalLate += s.late;
		totalAbsent += s.absent;
		totalLeave += s.leave;
		totalSessions = Math.max(totalSessions, s.total);
	});

	if (totalSessions === 0) {
		wrap.innerHTML = '<div style="text-align:center;padding:32px;color:var(--text-muted);">ยังไม่มีข้อมูล</div>';
		return;
	}

	const sessionsPerWeek = 2;
	const numWeeks = Math.ceil(totalSessions / sessionsPerWeek);
	const students = analyticsData.length || 1;

	const weeks = Array.from({ length: numWeeks }, (_, i) => {
		const sessionStart = i * sessionsPerWeek;
		const sessionEnd = Math.min(sessionStart + sessionsPerWeek, totalSessions);
		const ratio = (sessionEnd - sessionStart) / totalSessions;
		const p = Math.round((totalPresent * ratio) / students);
		const l = Math.round((totalLate * ratio) / students);
		const pct = (sessionEnd - sessionStart) > 0
			? Math.round((p + l * 0.5) / (sessionEnd - sessionStart) * 100) : 0;
		return { label: `สัปดาห์ ${i + 1}`, pct: Math.min(pct, 100) };
	});

	wrap.innerHTML = weeks.map(w => `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
      <div style="width:90px;font-size:12px;color:var(--text-muted);text-align:right;white-space:nowrap;">${w.label}</div>
      <div style="flex:1;background:var(--border-light);border-radius:99px;height:10px;">
        <div class="progress-bar-fill ${w.pct >= 80 ? 'high' : w.pct >= 60 ? 'mid' : 'low'}"
             style="width:${w.pct}%;height:10px;border-radius:99px;transition:width 0.6s ease;"></div>
      </div>
      <div style="width:36px;font-size:12px;font-weight:700;color:var(--text-main);">${w.pct}%</div>
    </div>`).join('');
}
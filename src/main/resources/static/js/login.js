/* ============================================
   AttendX - Login JS (login.js)
   ============================================ */

let currentRole = 'student';

// ── Role Selection ────────────────────────────
function selectRole(role, btn) {
  currentRole = role;

  // Toggle active button
  document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  // Update form labels
  const isStudent = role === 'student';
  document.getElementById('formTitle').textContent    = `เข้าสู่ระบบ ${isStudent ? 'นักศึกษา' : 'อาจารย์'}`;
  document.getElementById('formSubtitle').textContent = isStudent
    ? 'กรอกรหัสนักศึกษาและรหัสผ่าน'
    : 'กรอก Email และรหัสผ่าน';
  document.getElementById('idLabel').textContent      = isStudent ? 'รหัสนักศึกษา' : 'Email';
  document.getElementById('userId').placeholder       = isStudent ? 'เช่น 6401234567' : 'เช่น somchai@tu.ac.th';
  document.getElementById('loginError').style.display = 'none';
}

// ── Toggle Password Visibility ────────────────
function togglePassword() {
  const input = document.getElementById('password');
  const icon  = document.getElementById('eyeIcon');
  if (input.type === 'password') {
    input.type = 'text';
    icon.textContent = '🙈';
  } else {
    input.type = 'password';
    icon.textContent = '👁️';
  }
}

// ── Form Validation ───────────────────────────
function validateForm() {
  let valid = true;
  const userId   = document.getElementById('userId').value.trim();
  const password = document.getElementById('password').value;

  // Clear errors
  document.getElementById('userIdError').style.display = 'none';
  document.getElementById('passError').style.display   = 'none';
  document.getElementById('userId').classList.remove('input-error');
  document.getElementById('password').classList.remove('input-error');

  if (!userId) {
    document.getElementById('userIdError').style.display = 'flex';
    document.getElementById('userId').classList.add('input-error');
    valid = false;
  }
  if (!password) {
    document.getElementById('passError').style.display = 'flex';
    document.getElementById('password').classList.add('input-error');
    valid = false;
  }
  return valid;
}

// ── Mock Auth ─────────────────────────────────
const MOCK_USERS = {
  student: [
    { id:'6401234567', password:'1234', name:'นายกิตติดินทร์ เชงมงคลศักดิ์', hasFace:true  },
    { id:'6401234568', password:'1234', name:'นางสาวณิชารีย์ สุขใจ',         hasFace:false },
  ],
  teacher: [
    { id:'teacher01',            password:'1234', name:'อาจารย์ สมชาย ใจดี',    hasFace:true },
    { id:'somchai@tu.ac.th',     password:'1234', name:'อาจารย์ สมชาย ใจดี',    hasFace:true },
  ],
};

function authenticate(role, id, password) {
  const users = MOCK_USERS[role] || [];
  return users.find(u => u.id === id && u.password === password) || null;
}

// ── Login Handler ─────────────────────────────
async function handleLogin(event) {
  event.preventDefault();
  if (!validateForm()) return;

  const userId   = document.getElementById('userId').value.trim();
  const password = document.getElementById('password').value;
  const remember = document.getElementById('rememberMe').checked;
  const btn      = document.getElementById('loginBtn');
  const spinner  = document.getElementById('loginSpinner');
  const errDiv   = document.getElementById('loginError');

  // Loading state
  btn.disabled = true;
  btn.classList.add('loading');
  spinner.style.display = 'block';
  errDiv.style.display  = 'none';

  // Simulate API delay
  await new Promise(r => setTimeout(r, 1200));

  const user = authenticate(currentRole, userId, password);

  if (!user) {
    // Error state
    btn.disabled = false;
    btn.classList.remove('loading');
    spinner.style.display = 'none';
    errDiv.style.display  = 'flex';
    document.getElementById('loginErrorText').textContent = 'รหัสผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
    document.getElementById('userId').classList.add('input-error');
    document.getElementById('password').classList.add('input-error');
    return;
  }

  // Save session
  const session = { id: user.id, name: user.name, role: currentRole, hasFace: user.hasFace };
  if (remember) {
    localStorage.setItem('attendx_user', JSON.stringify(session));
  } else {
    sessionStorage.setItem('attendx_user', JSON.stringify(session));
  }

  showToast(`ยินดีต้อนรับ, ${user.name}`, 'success');

  // Redirect after short delay
  await new Promise(r => setTimeout(r, 800));

  if (currentRole === 'student') {
    if (!user.hasFace) {
      window.location.href = 'face-register.html';
    } else {
      window.location.href = 'student-checkin.html';
    }
  } else {
    window.location.href = 'teacher-dashboard.html';
  }
}

// ── Init ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Auto-fill if remembered
  const saved = getUser();
  if (saved) {
    // Already logged in, redirect
    if (saved.role === 'student') window.location.href = 'student-checkin.html';
    else window.location.href = 'teacher-dashboard.html';
  }

  // Set today's date display
  const now = new Date();
  document.title = 'AttendX — เข้าสู่ระบบ';
});

/* ============================================
   AttendX - Login JS (login.js)
   เชื่อมต่อ Backend + TU API จริง
   ============================================ */

let currentRole = 'student';

function selectRole(role, btn) {
  currentRole = role;
  document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const isStudent = role === 'student';
  document.getElementById('formTitle').textContent    = `เข้าสู่ระบบ ${isStudent ? 'นักศึกษา' : 'อาจารย์'}`;
  document.getElementById('formSubtitle').textContent = isStudent ? 'กรอกรหัสนักศึกษาและรหัสผ่าน' : 'กรอก Email และรหัสผ่าน';
  document.getElementById('idLabel').textContent      = isStudent ? 'รหัสนักศึกษา' : 'Email';
  document.getElementById('userId').placeholder       = isStudent ? 'เช่น 6401234567' : 'เช่น somchai@tu.ac.th';
  document.getElementById('loginError').style.display = 'none';
}

function togglePassword() {
  const input = document.getElementById('password');
  const icon  = document.getElementById('eyeIcon');
  if (input.type === 'password') { input.type = 'text'; icon.textContent = '🙈'; }
  else { input.type = 'password'; icon.textContent = '👁️'; }
}

function validateForm() {
  let valid = true;
  const userId   = document.getElementById('userId').value.trim();
  const password = document.getElementById('password').value;
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

async function handleLogin(event) {
  event.preventDefault();
  if (!validateForm()) return;

  const userId   = document.getElementById('userId').value.trim();
  const password = document.getElementById('password').value;
  const remember = document.getElementById('rememberMe').checked;
  const btn      = document.getElementById('loginBtn');
  const spinner  = document.getElementById('loginSpinner');
  const errDiv   = document.getElementById('loginError');

  btn.disabled = true;
  btn.classList.add('loading');
  spinner.style.display = 'block';
  errDiv.style.display  = 'none';

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: userId, password: password }),
      credentials: 'include'
    });

    const data = await response.json();

    if (response.ok && data.success) {
      // ✅ FIX: normalize role เป็น lowercase ก่อนเก็บและเปรียบเทียบ
      const normalizedRole = (data.role || '').toLowerCase();
      const session = {
        id: data.username,
        name: data.fullName,
        role: normalizedRole,
        email: data.email
      };
      if (remember) localStorage.setItem('attendx_user', JSON.stringify(session));
      else sessionStorage.setItem('attendx_user', JSON.stringify(session));

      showToast(`ยินดีต้อนรับ, ${data.fullName}`, 'success');
      await new Promise(r => setTimeout(r, 800));

      // ✅ FIX: เปรียบ role ที่ normalize แล้ว + รองรับ "staff" ด้วย
      if (normalizedRole === 'student') window.location.href = 'student-checkin.html';
      else window.location.href = 'teacher-dashboard.html';

    } else {
      btn.disabled = false;
      btn.classList.remove('loading');
      spinner.style.display = 'none';
      errDiv.style.display  = 'flex';
      document.getElementById('loginErrorText').textContent = data.message || 'รหัสผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
      document.getElementById('userId').classList.add('input-error');
      document.getElementById('password').classList.add('input-error');
    }

  } catch (err) {
    btn.disabled = false;
    btn.classList.remove('loading');
    spinner.style.display = 'none';
    errDiv.style.display  = 'flex';
    document.getElementById('loginErrorText').textContent = 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่';
    console.error('Login error:', err);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const saved = typeof getUser === 'function' ? getUser() : null;
  if (saved) {
    const role = (saved.role || '').toLowerCase();
    if (role === 'student') window.location.href = 'student-checkin.html';
    else window.location.href = 'teacher-dashboard.html';
  }
  document.title = 'AttendX — เข้าสู่ระบบ';
});

// ── Mock Auth (legacy, ไม่ใช้แล้วแต่เก็บไว้) ─────────────────────────────
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
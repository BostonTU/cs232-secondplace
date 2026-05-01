# AttendX — University Attendance Management System

## 📁 โครงสร้างไฟล์

```
attendx/
├── index.html                    ← Entry point (redirect → login)
│
├── pages/                        ← HTML Pages (แยกตามหน้า)
│   ├── login.html                ← หน้า Login (เลือก Student / Teacher)
│   ├── face-register.html        ← ลงทะเบียนใบหน้า (นักศึกษาครั้งแรก)
│   │
│   ├── student-checkin.html      ← เช็คชื่อ (QR Scan + Camera)
│   ├── student-leave.html        ← ขอใบลา + ดูสถานะ
│   ├── student-stats.html        ← สถิติการเข้าเรียน
│   │
│   ├── teacher-dashboard.html    ← Dashboard อาจารย์ + ตารางนักศึกษา
│   ├── teacher-qr.html           ← สร้าง QR Code session
│   ├── teacher-leave.html        ← จัดการใบลา (อนุมัติ/ปฏิเสธ)
│   └── teacher-analytics.html    ← กราฟและสถิติ
│
├── css/                          ← CSS (แยกตามบทบาท)
│   ├── global.css                ← CSS Variables, Reset, Shared Components
│   │                               (sidebar, topbar, table, badge, button...)
│   ├── login.css                 ← Styles เฉพาะหน้า Login
│   └── dashboard.css             ← Styles ทุกหน้าหลัง Login
│
└── js/                           ← JavaScript (แยกตามหน้า)
    ├── utils.js                  ← Shared: toast, date helper, auth, mock data
    ├── login.js                  ← Logic หน้า Login
    ├── student-checkin.js        ← Camera, GPS, Face-check flow
    ├── student-leave.js          ← Submit form, render history
    ├── student-stats.js          ← Render stats, subject table
    ├── teacher-dashboard.js      ← Stats cards, student table, filter
    ├── teacher-qr.js             ← QR generation, countdown timer, checkins
    ├── teacher-leave.js          ← Filter, approve/reject, modal
    └── teacher-analytics.js      ← Canvas pie chart, bar chart, table search
```

##  Mock Login Credentials

| Role      | ID / Email            | Password |
|-----------|-----------------------|----------|
| นักศึกษา  | 6401234567            | 1234     |
| นักศึกษา  | 6401234568 (ไม่มีface)| 1234     |
| อาจารย์   | teacher01             | 1234     |
| อาจารย์   | somchai@tu.ac.th      | 1234     |

##  Flow การใช้งาน

### นักศึกษา
1. Login → เลือก "นักศึกษา"
2. ถ้าไม่มีข้อมูลใบหน้า → หน้า face-register.html
3. Dashboard → student-checkin.html
   - กด "เปิดกล้องสแกน QR" → เปิด Camera Overlay
   - จัดหน้าแล้วกด Check-In (ใช้ getUserMedia)
   - ระบบจำลอง Face Recognition (2-3 วินาที)
4. ขอใบลา → student-leave.html
5. ดูสถิติ → student-stats.html

### อาจารย์
1. Login → เลือก "อาจารย์"
2. Dashboard → teacher-dashboard.html
3. สร้าง QR Session → teacher-qr.html
   - กำหนดวิชา/ห้อง/เวลา → กด "เริ่ม Session"
   - QR Code ถูก generate (ใช้ QRCode.js)
   - Countdown timer + จำลองนักศึกษาเช็คชื่อ
4. จัดการใบลา → teacher-leave.html
5. Analytics → teacher-analytics.html (Pie+Bar chart)

##  Dependencies (CDN - ไม่ต้อง install)
- Google Fonts: Prompt
- QRCode.js (teacher-qr.html): cdnjs.cloudflare.com

Mock Login: นักศึกษา 6401234567 / 1234 | อาจารย์ teacher01 / 1234
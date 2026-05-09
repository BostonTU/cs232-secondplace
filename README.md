# AttendX — ระบบเช็คชื่อนักศึกษา

ระบบบริหารการเข้าเรียนสำหรับมหาวิทยาลัย รองรับการเช็คชื่อผ่าน QR Code พร้อมยืนยันตัวตนด้วยใบหน้า (Face Recognition) และตรวจสอบตำแหน่ง GPS

---

## ภาพรวมระบบ

```
Browser (HTML/JS)
    │
    │  HTTP REST API
    ▼
Spring Boot Backend (Port 8080)
    ├── JPA/JDBC ──► AWS RDS SQL Server (AttendanceDB)
    ├── S3Service ──► AWS S3 (bucket: attendxfiles)
    ├── RekognitionService ──► AWS Rekognition (collection: attendance-faces)
    └── LoginController ──► TU API (restapi.tu.ac.th)
```

---

## การเชื่อมงานระหว่างส่วนต่าง ๆ

### Frontend → Backend API

| หน้า | ไฟล์ JS | API ที่เรียก |
|------|---------|-------------|
| Login | `login.js` | `POST /api/login`, `GET /api/profile` |
| นักศึกษา — เช็คชื่อ | `student-checkin.js` | `GET /api/session/verify/{code}`, `POST /api/face/verify`, `POST /student/attendance/checkin` |
| นักศึกษา — ขอใบลา | `student-leave.js` | `GET /api/subjects/my`, `POST /api/student/leave`, `GET /api/student/leave?studentId=` |
| นักศึกษา — สถิติ | `student-stats.js` | `GET /student/attendance/my-stats` |
| อาจารย์ — สร้าง QR | `teacher-qr.js` | `GET /api/subjects/teaching`, `POST /api/session/start`, `POST /api/session/end`, `GET /teacher/attendance/current` |
| อาจารย์ — Dashboard | `teacher-dashboard.js` | `GET /teacher/attendance/current`, `GET /api/teacher/leave/all` |
| อาจารย์ — Analytics | `teacher-analytics.js` | `GET /api/subjects/teaching`, `GET /teacher/attendance/stats?subject=`, `GET /teacher/attendance/enrolled?subject=` |
| อาจารย์ — จัดการใบลา | `teacher-leave.js` | `GET /api/teacher/leave/all`, `GET /api/teacher/leave/{id}/sessions`, `PATCH /api/leave/{id}/status` |

### Backend → Database (AWS RDS SQL Server)

| Controller / Service | Table ที่ใช้ |
|----------------------|-------------|
| `LoginController` | `users`, `Students`, `Teachers` |
| `SessionController` | `sessions`, `Student_Enrollments` |
| `AttendanceController` | `Attendance`, `sessions`, `users` |
| `StudentAttendanceController` | `Attendance`, `sessions` |
| `LeaveRequestController` | `Leave_Requests`, `sessions` |
| `FaceController` | `Students` (อ่าน/อัปเดต `face_photo_key`) |
| `SubjectController` | `Subjects`, `Teacher_Subjects`, `Student_Enrollments` |

### Backend → AWS Services

| Service | การใช้งาน |
|---------|----------|
| **AWS S3** (`attendxfiles`) | อัปโหลดรูปถ่ายตอนเช็คชื่อ (`photo_url`), เอกสารใบลา (`document_url`) |
| **AWS Rekognition** (`attendance-faces`) | ลงทะเบียนใบหน้านักศึกษา (`/api/face/register`), ยืนยันตัวตนก่อน check-in (`/api/face/verify`) |
| **GPS / GpsService** | ตรวจสอบพิกัดนักศึกษาก่อน check-in ว่าอยู่ในรัศมี 100 เมตร (`POST /api/gps/verify`) |

### Login → TU API (External)

`LoginController` ส่ง username + password ไปยัง `https://restapi.tu.ac.th/api/v1/auth/Ad/verify2` เพื่อยืนยันตัวตนนักศึกษาและอาจารย์ผ่านระบบของมหาวิทยาลัย จากนั้น `saveOrUpdateUser()` จะบันทึกหรืออัปเดตข้อมูลใน `users`, `Students`, หรือ `Teachers` โดยอัตโนมัติ

---

## โครงสร้างโปรเจกต์

```
src/
├── controller/
│   ├── LoginController.java          ← login, profile, logout
│   ├── SessionController.java        ← start/end session, verify QR
│   ├── AttendanceController.java     ← teacher: stats, history, enrolled
│   ├── StudentAttendanceController.java  ← student: checkin, my-stats
│   ├── FaceController.java           ← register, verify face
│   ├── LeaveRequestController.java   ← teacher: view/approve/reject leave
│   ├── StudentLeaveRequestController.java ← student: submit/view leave
│   ├── SubjectController.java        ← list subjects
│   ├── GpsController.java            ← verify GPS location
│   ├── FileController.java           ← serve uploaded files
│   └── UserController.java           ← current user info
├── service/
│   ├── AttendanceService.java
│   ├── LeaveRequestService.java
│   ├── RekognitionService.java       ← AWS Rekognition
│   ├── S3Service.java                ← AWS S3 upload/download
│   ├── GpsService.java
│   └── UserService.java
├── entity/                           ← JPA Entities (ตรงกับ DB tables)
├── repository/                       ← Spring Data JPA Repositories
├── dto/                              ← Request/Response DTOs
└── resources/
    ├── application.properties        ← DB, AWS, TU API config
    └── static/
        ├── pages/                    ← HTML หน้าต่าง ๆ
        ├── js/                       ← JavaScript แยกตามหน้า
        └── css/                      ← Stylesheet

```

---

## Deployment

ระบบ deploy บน **AWS EC2** โดยใช้ **Nginx** เป็น reverse proxy หน้า Spring Boot

```
Internet
    │  :80 / :443
    ▼
Nginx (reverse proxy)
    │  proxy_pass http://localhost:8080
    ▼
Spring Boot (Port 8080)
    │
    ▼
AWS RDS / S3 / Rekognition
```

### ขั้นตอน deploy บน EC2

```bash
# 1. โอนไฟล์ขึ้น EC2
scp cs232-secondplace-0_0_1-SNAPSHOT.jar ec2-user@<EC2_IP>:~/

# 2. รัน Spring Boot (background)
nohup java -jar cs232-secondplace-0_0_1-SNAPSHOT.jar > app.log 2>&1 &

# 3. ตั้งค่า Nginx (/etc/nginx/sites-available/attendx)
server {
    server_name 54.172.98.43.nip.io;
    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/54.172.98.43.nip.io/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/54.172.98.43.nip.io/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

server {
    if ($host = 54.172.98.43.nip.io) {
        return 301 https://$host$request_uri;
    }
    listen 80;
    server_name 54.172.98.43.nip.io;
    return 404;
}

# 4. เปิด Nginx
sudo nginx -t && sudo systemctl reload nginx
```

**หมายเหตุ:**
- ใช้ `nip.io` เพื่อแปลง EC2 IP เป็น domain สำหรับออก SSL certificate
- SSL certificate ออกด้วย **Let's Encrypt** (Certbot)
- HTTP (port 80) redirect → HTTPS (port 443) อัตโนมัติ
- `client_max_body_size 10M` รองรับอัปโหลดรูปและเอกสารใบลา (ตรงกับ Spring Boot config)

**ข้อกำหนด:** Java 21+, Nginx, Certbot, Security Group เปิด port 80 และ 443

---

## Database Schema

ดูไฟล์ `Database/AttendX.sql` สำหรับ DDL ครบทั้งหมด

ตาราง หลัก: `users` · `Students` · `Teachers` · `Subjects` · `Teacher_Subjects` · `Student_Enrollments` · `sessions` · `Attendance` · `Leave_Requests`
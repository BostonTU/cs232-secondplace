package com.example.controller;

import com.example.dto.CheckInRequest;
import com.example.entity.Attendance;
import com.example.entity.Session;
import com.example.entity.User;
import com.example.repository.AttendanceRepository;
import com.example.repository.SessionRepository;
import com.example.repository.UserRepository;
import com.example.service.AttendanceService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/teacher/attendance")
public class AttendanceController {

    @Autowired private AttendanceService service;
    @Autowired private AttendanceRepository attendanceRepo;
    @Autowired private SessionRepository sessionRepo;
    @Autowired private UserRepository userRepo;

    // ── นักศึกษาเช็คชื่อผ่าน teacher/attendance/checkin (legacy endpoint) ──
    // ✅ FIX: ดึง studentId จาก session เสมอ ป้องกันการปลอมแปลง
    // ✅ FIX: return JSON แทน plain String
    @PostMapping("/checkin")
    public ResponseEntity<?> checkIn(@RequestBody CheckInRequest req,
                                     HttpServletRequest request,
                                     HttpSession httpSession) {

        User student = (User) httpSession.getAttribute("user");
        if (student == null) {
            return ResponseEntity.status(401)
                    .body(Map.of("success", false, "message", "กรุณา Login ก่อนเช็คชื่อ"));
        }

        // ✅ FIX: case-insensitive role check
        String role = student.getRole() == null ? "" : student.getRole().toLowerCase();
        if (!"student".equals(role)) {
            return ResponseEntity.status(403)
                    .body(Map.of("success", false, "message", "เฉพาะนักศึกษาเท่านั้น"));
        }

        if (req.getSessionId() == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("success", false, "message", "กรุณาระบุ Session ID"));
        }

        // ✅ FIX: ใช้ studentId จาก session ไม่ใช่จาก request body
        String studentId = student.getUsername();
        String ip        = request.getRemoteAddr();

        // ตรวจสอบ session ก่อนเช็คชื่อ
        Optional<Session> sessionOpt = sessionRepo.findById(req.getSessionId());
        if (sessionOpt.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("success", false, "message", "ไม่พบ Session นี้"));
        }

        Session sess = sessionOpt.get();
        if (!sess.isActive()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("success", false, "message", "Session ปิดแล้ว"));
        }

        if (java.time.LocalDateTime.now().isAfter(sess.getExpiresAt())) {
            sess.setActive(false);
            sessionRepo.save(sess);
            return ResponseEntity.badRequest()
                    .body(Map.of("success", false, "message", "Session หมดเวลาแล้ว"));
        }

        String result = service.checkIn(studentId, req.getSessionId(), ip,
                req.getLatitude(), req.getLongitude());

        // ✅ FIX: return JSON พร้อม success flag แทน plain String
        return switch (result) {
            case "Success" -> ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "เช็คชื่อสำเร็จ!",
                    "subject", sess.getSubject(),
                    "room",    sess.getRoom()
            ));
            case "OUT_OF_RANGE" -> ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "คุณอยู่นอกพื้นที่ที่กำหนด กรุณาเช็คชื่อในห้องเรียน"
            ));
            case "Already checked in" -> ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "คุณเช็คชื่อไปแล้วในคาบนี้"
            ));
            case "SESSION_NOT_FOUND" -> ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "ไม่พบ Session หรือ Session หมดอายุแล้ว"
            ));
            default -> ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", result
            ));
        };
    }

    // ── อาจารย์ดึงข้อมูล session ที่กำลัง active ──────────────────────────
    @GetMapping("/current")
    public ResponseEntity<?> getCurrentSession(HttpSession httpSession) {
        User teacher = (User) httpSession.getAttribute("user");
        if (teacher == null) {
            return ResponseEntity.status(401).body(Map.of("success", false, "message", "Not logged in"));
        }

        Optional<Session> activeSession = sessionRepo
                .findFirstByTeacherUsernameAndActiveTrueOrderByStartedAtDesc(teacher.getUsername());

        if (activeSession.isEmpty()) {
            return ResponseEntity.ok(Map.of("success", true, "message", "No active session", "data", List.of()));
        }

        Session session = activeSession.get();

        // ✅ FIX: ตรวจสอบ expires แล้ว auto-close ถ้าหมดเวลา
        if (java.time.LocalDateTime.now().isAfter(session.getExpiresAt())) {
            session.setActive(false);
            sessionRepo.save(session);
            return ResponseEntity.ok(Map.of("success", true, "message", "No active session", "data", List.of()));
        }

        List<Attendance> records = attendanceRepo.findBySessionId(session.getId());

        List<Map<String, Object>> data = records.stream().map(a -> {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("studentId",   a.getStudentId());
            item.put("checkinDate", a.getCheckinDate() != null ? a.getCheckinDate().toString() : null);
            item.put("status",      a.getStatus());
            userRepo.findByUsername(a.getStudentId()).ifPresent(u ->
                    item.put("fullName", u.getFullName())
            );
            if (!item.containsKey("fullName")) item.put("fullName", a.getStudentId());
            return item;
        }).toList();

        long present = records.stream().filter(r -> "มา".equals(r.getStatus())).count();
        long late    = records.stream().filter(r -> "สาย".equals(r.getStatus())).count();
        long absent  = records.stream().filter(r -> "ขาด".equals(r.getStatus())).count();
        long leave   = records.stream().filter(r -> "ลา".equals(r.getStatus())).count();

        return ResponseEntity.ok(Map.of(
                "success",     true,
                "message",     "success",
                "sessionId",   session.getId(),
                "sessionCode", session.getSessionCode(),
                "subject",     session.getSubject(),
                "room",        session.getRoom(),
                "expiresAt",   session.getExpiresAt().toString(),
                "stats",       Map.of("present", present, "late", late, "absent", absent, "leave", leave),
                "data",        data
        ));
    }

    // ── อาจารย์ดึงสถิติรายนักศึกษา ────────────────────────────────────────
    @GetMapping("/stats")
    public ResponseEntity<?> getAttendanceStats(HttpSession httpSession) {
        User teacher = (User) httpSession.getAttribute("user");
        if (teacher == null) {
            return ResponseEntity.status(401).body(Map.of("success", false, "message", "Not logged in"));
        }

        List<Object[]> raw = attendanceRepo.countByStudentAndStatus();

        Map<String, Map<String, Object>> statsMap = new LinkedHashMap<>();

        for (Object[] row : raw) {
            String studentId = (String) row[0];
            String status    = (String) row[1];
            long   count     = (long)   row[2];

            statsMap.putIfAbsent(studentId, new LinkedHashMap<>(Map.of(
                    "studentId", studentId, "fullName", studentId,
                    "present", 0L, "late", 0L, "absent", 0L, "leave", 0L
            )));

            Map<String, Object> entry = statsMap.get(studentId);
            switch (status) {
                case "มา"  -> entry.put("present", count);
                case "สาย" -> entry.put("late",    count);
                case "ขาด" -> entry.put("absent",  count);
                case "ลา"  -> entry.put("leave",   count);
            }
        }

        statsMap.forEach((studentId, entry) ->
                userRepo.findByUsername(studentId).ifPresent(u -> entry.put("fullName", u.getFullName()))
        );

        List<Map<String, Object>> result = new ArrayList<>();
        for (Map<String, Object> entry : statsMap.values()) {
            long total = (long) entry.get("present") + (long) entry.get("late")
                       + (long) entry.get("absent")  + (long) entry.get("leave");
            entry.put("total", total);
            result.add(entry);
        }

        return ResponseEntity.ok(Map.of("success", true, "message", "success", "data", result));
    }
}
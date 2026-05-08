package com.example.controller;

import com.example.dto.CheckInRequest;
import com.example.entity.Attendance;
import com.example.entity.Session;
import com.example.entity.User;
import com.example.repository.AttendanceRepository;
import com.example.repository.SessionRepository;
import com.example.service.AttendanceService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@RestController
@RequestMapping("/student/attendance")
public class StudentAttendanceController {

    @Autowired private AttendanceService service;
    @Autowired private AttendanceRepository attendanceRepo;
    @Autowired private SessionRepository sessionRepo;

    @PostMapping("/checkin")
    public ResponseEntity<?> checkIn(@RequestBody CheckInRequest req,
                                     HttpServletRequest request,
                                     HttpSession httpSession) {

        User student = (User) httpSession.getAttribute("user");
        if (student == null) {
            return ResponseEntity.status(401)
                    .body(Map.of("success", false, "message", "กรุณา Login ก่อนเช็คชื่อ"));
        }

        String role = student.getRole() == null ? "" : student.getRole().toLowerCase();
        if (!"student".equals(role)) {
            return ResponseEntity.status(403)
                    .body(Map.of("success", false, "message", "เฉพาะนักศึกษาเท่านั้นที่สามารถเช็คชื่อได้"));
        }

        String studentId = student.getUsername();
        String ip        = request.getRemoteAddr();

        if (req.getSessionId() == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("success", false, "message", "กรุณาระบุ Session ID"));
        }

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

     // หลังแก้ — รองรับ grace period 1 ชม. เหมือนฝั่ง AttendanceController
        LocalDateTime now = LocalDateTime.now();

        // เกิน expiresAt + 1 ชม. → ปิดเลย
        if (now.isAfter(sess.getExpiresAt().plusHours(1))) {
            sess.setActive(false);
            sessionRepo.save(sess);
            return ResponseEntity.badRequest()
                    .body(Map.of("success", false, "message", "Session หมดเวลาแล้ว (เกิน 1 ชั่วโมง)"));
        }
        // อยู่ใน grace period (expiresAt ถึง expiresAt+1hr) → เช็คได้ แต่ service จะ mark สาย
        String result = service.checkIn(studentId, req.getSessionId(), ip,
                req.getLatitude(), req.getLongitude());

        return switch (result) {
            case "Success" -> ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "เช็คชื่อสำเร็จ!",
                    "time",    LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH:mm:ss")),
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
            default -> ResponseEntity.badRequest().body(Map.of("success", false, "message", result));
        };
    }

    @GetMapping("/my-stats")
    public ResponseEntity<?> getMyStats(HttpSession httpSession) {
        User student = (User) httpSession.getAttribute("user");
        if (student == null) {
            return ResponseEntity.status(401)
                    .body(Map.of("success", false, "message", "Not logged in"));
        }

        String studentId = student.getUsername();
        List<Attendance> records = attendanceRepo.findByStudentIdOrderByCheckinDateDesc(studentId);

        // ─── FIX: เพิ่ม "ลา" ในสถิติด้วย ─────────────────────────────────
        long present = attendanceRepo.countByStudentIdAndStatus(studentId, "มา");
        long late    = attendanceRepo.countByStudentIdAndStatus(studentId, "สาย");
        long absent  = attendanceRepo.countByStudentIdAndStatus(studentId, "ขาด");
        long leave   = attendanceRepo.countByStudentIdAndStatus(studentId, "ลา");

        DateTimeFormatter fmt     = DateTimeFormatter.ofPattern("HH:mm:ss");
        DateTimeFormatter dateFmt = DateTimeFormatter.ofPattern("dd/MM/yyyy");
        List<Map<String, Object>> history = new ArrayList<>();
        for (Attendance a : records) {
            Map<String, Object> item = new HashMap<>();
            item.put("id",          a.getId());
            item.put("sessionId",   a.getSessionId());
            item.put("status",      a.getStatus());
            item.put("checkinDate", a.getCheckinDate() != null ? a.getCheckinDate().format(dateFmt) : "—");
            item.put("time",        a.getCheckinDate() != null ? a.getCheckinDate().format(fmt) : "—");
            sessionRepo.findById(a.getSessionId()).ifPresent(s -> {
                item.put("subject", s.getSubject());
                item.put("room",    s.getRoom());
            });
            history.add(item);
        }

        Map<String, Object> result = new HashMap<>();
        result.put("success",     true);
        result.put("studentId",   studentId);
        result.put("studentName", student.getFullName());
        result.put("summary", Map.of(
                "present", present,
                "late",    late,
                "absent",  absent,
                "leave",   leave,
                "total",   present + late + absent + leave
        ));
        result.put("history", history);

        return ResponseEntity.ok(result);
    }
}
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
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@RestController
@RequestMapping("/teacher/attendance")
public class AttendanceController {

    @Autowired private AttendanceService service;
    @Autowired private AttendanceRepository attendanceRepo;
    @Autowired private SessionRepository sessionRepo;
    @Autowired private UserRepository userRepo;
    @Autowired private JdbcTemplate jdbc;

    @PostMapping("/checkin")
    public ResponseEntity<?> checkIn(@RequestBody CheckInRequest req,
                                     HttpServletRequest request,
                                     HttpSession httpSession) {

        User student = (User) httpSession.getAttribute("user");
        if (student == null)
            return ResponseEntity.status(401)
                    .body(Map.of("success", false, "message", "กรุณา Login ก่อนเช็คชื่อ"));

        String role = student.getRole() == null ? "" : student.getRole().toLowerCase();
        if (!"student".equals(role))
            return ResponseEntity.status(403)
                    .body(Map.of("success", false, "message", "เฉพาะนักศึกษาเท่านั้น"));

        if (req.getSessionId() == null)
            return ResponseEntity.badRequest()
                    .body(Map.of("success", false, "message", "กรุณาระบุ Session ID"));

        String studentId = student.getUsername();
        String ip        = request.getRemoteAddr();

        Optional<Session> sessionOpt = sessionRepo.findById(req.getSessionId());
        if (sessionOpt.isEmpty())
            return ResponseEntity.badRequest()
                    .body(Map.of("success", false, "message", "ไม่พบ Session นี้"));

        Session sess = sessionOpt.get();
        if (!sess.isActive())
            return ResponseEntity.badRequest()
                    .body(Map.of("success", false, "message", "Session ปิดแล้ว"));

        LocalDateTime now = LocalDateTime.now();

        // ถ้าเกิน 1 ชม. หลัง session หมด → ปฏิเสธ
        if (now.isAfter(sess.getExpiresAt().plusHours(1))) {
            sess.setActive(false);
            sessionRepo.save(sess);
            return ResponseEntity.badRequest()
                    .body(Map.of("success", false, "message", "Session หมดเวลาแล้ว"));
        }
        // ถ้าอยู่ในช่วง 1 ชม. หลัง expiresAt → ให้เช็คได้ (service จะ mark สาย)

        String result = service.checkIn(studentId, req.getSessionId(), ip,
                req.getLatitude(), req.getLongitude());

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
            case "SESSION_EXPIRED" -> ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Session หมดเวลาแล้ว (เกิน 1 ชั่วโมง)"
            ));
            case "SESSION_NOT_FOUND" -> ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "ไม่พบ Session หรือ Session หมดอายุแล้ว"
            ));
            default -> ResponseEntity.badRequest().body(Map.of("success", false, "message", result));
        };
    }

    @GetMapping("/current")
    public ResponseEntity<?> getCurrentSession(HttpSession httpSession) {
        User teacher = (User) httpSession.getAttribute("user");
        if (teacher == null)
            return ResponseEntity.status(401).body(Map.of("success", false, "message", "Not logged in"));

        Optional<Session> activeSession = sessionRepo
                .findFirstByTeacherUsernameAndActiveTrueOrderByStartedAtDesc(teacher.getUsername());

        if (activeSession.isEmpty())
            return ResponseEntity.ok(Map.of("success", true, "message", "No active session", "data", List.of()));

        Session session = activeSession.get();

        if (LocalDateTime.now().isAfter(session.getExpiresAt())) {
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
            userRepo.findByUsername(a.getStudentId())
                    .ifPresent(u -> item.put("fullName", u.getFullName()));
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

    @GetMapping("/stats")
    public ResponseEntity<?> getAttendanceStats(
            @RequestParam(value = "subject", required = false) String subject,
            HttpSession httpSession) {
        User teacher = (User) httpSession.getAttribute("user");
        if (teacher == null)
            return ResponseEntity.status(401).body(Map.of("success", false, "message", "Not logged in"));

        List<Object[]> raw;
        if (subject != null && !subject.isBlank()) {
            raw = attendanceRepo.countByStudentAndStatus(teacher.getUsername(), subject);
        } else {
            raw = attendanceRepo.countByStudentAndStatusForTeacher(teacher.getUsername());
        }

        Map<String, Map<String, Object>> statsMap = new LinkedHashMap<>();
        for (Object[] row : raw) {
            String studentId = (String) row[0];
            String status    = (String) row[1];
            long   count     = ((Number) row[2]).longValue();

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

        statsMap.forEach((sid, entry) ->
                userRepo.findByUsername(sid).ifPresent(u -> entry.put("fullName", u.getFullName()))
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

    @GetMapping("/enrolled")
    public ResponseEntity<?> getEnrolledStudents(
            @RequestParam("subject") String subject,
            HttpSession httpSession) {
        User teacher = (User) httpSession.getAttribute("user");
        if (teacher == null)
            return ResponseEntity.status(401).body(Map.of("success", false, "message", "Not logged in"));

        try {
            List<Map<String, Object>> enrolled = jdbc.queryForList(
                "SELECT se.student_id, s.student_name " +
                "FROM Student_Enrollments se " +
                "JOIN Students s ON se.student_id = s.student_id " +
                "WHERE se.subject_code = ? " +
                "ORDER BY s.student_name",
                subject
            );
            return ResponseEntity.ok(Map.of("success", true, "data", enrolled));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("success", true, "data", List.of()));
        }
    }
    private String formatStartedAt(Object val, java.time.format.DateTimeFormatter fmt) {
        try {
            if (val instanceof java.sql.Timestamp ts) {
                return ts.toLocalDateTime().format(fmt);
            }
            return java.time.LocalDateTime.parse(val.toString()).format(fmt);
        } catch (Exception e) {
            return val.toString();
        }
    }
    @GetMapping("/history")
    public ResponseEntity<?> getHistory(HttpSession httpSession) {
        User teacher = (User) httpSession.getAttribute("user");
        if (teacher == null)
            return ResponseEntity.status(401).body(Map.of("success", false, "message", "Not logged in"));

        List<Object[]> sessions = attendanceRepo.getSessionSummaryByTeacher(teacher.getUsername());
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

        List<Map<String, Object>> result = sessions.stream().map(row -> {
            Map<String, Object> s = new LinkedHashMap<>();
            s.put("sessionId", row[0]);
            s.put("subject",   row[1]);
            s.put("room",      row[2]);
            s.put("startedAt", row[3] != null ? formatStartedAt(row[3], fmt) : "—");
            s.put("active",    row[4]);
            s.put("total",     row[5] != null ? ((Number) row[5]).longValue() : 0L);
            s.put("present",   row[6] != null ? ((Number) row[6]).longValue() : 0L);
            s.put("late",      row[7] != null ? ((Number) row[7]).longValue() : 0L);
            s.put("absent",    row[8] != null ? ((Number) row[8]).longValue() : 0L);
            s.put("leave",     row[9] != null ? ((Number) row[9]).longValue() : 0L);
            return s;
        }).toList();

        return ResponseEntity.ok(Map.of("success", true, "data", result));
    }

    @GetMapping("/history/{sessionId}")
    public ResponseEntity<?> getSessionDetail(
            @PathVariable Long sessionId,
            HttpSession httpSession) {

        User teacher = (User) httpSession.getAttribute("user");
        if (teacher == null)
            return ResponseEntity.status(403).body(Map.of("success", false, "message", "ไม่มีสิทธิ์ดู session นี้"));

        Optional<Session> sessionOpt = sessionRepo.findById(sessionId);
        if (sessionOpt.isEmpty() || !teacher.getUsername().equals(sessionOpt.get().getTeacherUsername()))
            return ResponseEntity.status(403).body(Map.of("success", false, "message", "ไม่มีสิทธิ์ดู session นี้"));

        Session sess = sessionOpt.get();

        List<Attendance> records = attendanceRepo.findBySessionIdOrderByCheckinDateAsc(sessionId);
        Map<String, Attendance> checkedIn = new LinkedHashMap<>();
        for (Attendance a : records) checkedIn.put(a.getStudentId(), a);

        List<Map<String, Object>> enrolled;
        try {
            enrolled = jdbc.queryForList(
                "SELECT se.student_id, s.student_name " +
                "FROM Student_Enrollments se " +
                "JOIN Students s ON se.student_id = s.student_id " +
                "WHERE se.subject_code = ? " +
                "ORDER BY s.student_name",
                sess.getSubject()
            );
        } catch (Exception e) {
            enrolled = new ArrayList<>();
        }

        List<Map<String, Object>> data = new ArrayList<>();
        DateTimeFormatter timeFmt = DateTimeFormatter.ofPattern("HH:mm:ss");

        if (enrolled.isEmpty()) {
            for (Attendance a : records) {
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("studentId",   a.getStudentId());
                item.put("status",      a.getStatus());
                item.put("checkinTime", a.getCheckinDate() != null ? a.getCheckinDate().format(timeFmt) : "—");
                userRepo.findByUsername(a.getStudentId())
                        .ifPresent(u -> item.put("fullName", u.getFullName()));
                if (!item.containsKey("fullName")) item.put("fullName", a.getStudentId());
                data.add(item);
            }
        } else {
            for (Map<String, Object> stu : enrolled) {
                String sid  = (String) stu.get("student_id");
                String name = (String) stu.get("student_name");
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("studentId", sid);
                item.put("fullName",  name != null ? name : sid);
                if (checkedIn.containsKey(sid)) {
                    Attendance a = checkedIn.get(sid);
                    item.put("status",      a.getStatus());
                    item.put("checkinTime", a.getCheckinDate() != null ? a.getCheckinDate().format(timeFmt) : "—");
                } else {
                    item.put("status",      "ขาด");
                    item.put("checkinTime", "—");
                }
                data.add(item);
            }
            for (Attendance a : records) {
                boolean alreadyIn = data.stream().anyMatch(d -> a.getStudentId().equals(d.get("studentId")));
                if (!alreadyIn) {
                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("studentId",   a.getStudentId());
                    item.put("status",      a.getStatus());
                    item.put("checkinTime", a.getCheckinDate() != null ? a.getCheckinDate().format(timeFmt) : "—");
                    userRepo.findByUsername(a.getStudentId())
                            .ifPresent(u -> item.put("fullName", u.getFullName()));
                    if (!item.containsKey("fullName")) item.put("fullName", a.getStudentId());
                    data.add(item);
                }
            }
        }

        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

        return ResponseEntity.ok(Map.of(
                "success",   true,
                "sessionId", sess.getId(),
                "subject",   sess.getSubject(),
                "room",      sess.getRoom(),
                "startedAt", sess.getStartedAt() != null ? sess.getStartedAt().format(fmt) : "—",
                "data",      data
        ));
    }
}
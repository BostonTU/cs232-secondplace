package com.example.controller;

import com.example.entity.Session;
import com.example.entity.User;
import com.example.repository.SessionRepository;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/session")
public class SessionController {

    @Autowired
    private SessionRepository sessionRepository;

    @PostMapping("/start")
    public ResponseEntity<?> startSession(@RequestBody Map<String, Object> body,
                                          HttpSession httpSession) {
        User teacher = (User) httpSession.getAttribute("user");
        if (teacher == null) {
            return ResponseEntity.status(401)
                    .body(Map.of("success", false, "message", "Not logged in"));
        }

        String subject  = (String) body.getOrDefault("subject", "");
        String room     = (String) body.getOrDefault("room", "");
        int    duration = parseInt(body.getOrDefault("duration", 5).toString(), 5);

        if (subject.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("success", false, "message", "กรุณาเลือกวิชา"));
        }

        // ✅ FIX: รับ GPS จาก frontend ถ้ามี ถ้าไม่มี → null (ไม่ fallback hardcode)
        // เพราะถ้า fallback เป็นพิกัด มธ. นักศึกษาจะเช็คชื่อไม่ได้ถ้าอยู่ที่อื่น
        Double lat    = parseDouble(body.get("latitude"));
        Double lng    = parseDouble(body.get("longitude"));
        Double radius = parseDouble(body.get("radiusMeter"));

        // ถ้าส่ง GPS มาต้องครบทั้ง lat, lng, radius
        if (lat != null && lng != null && radius == null) {
            radius = 100.0; // default radius 100 เมตรถ้าไม่ได้ระบุ
        }

        String code = subject + "-" + UUID.randomUUID().toString().substring(0, 7).toUpperCase();

        Session session = new Session();
        session.setSessionCode(code);
        session.setSubject(subject);
        session.setRoom(room.isBlank() ? "—" : room);
        session.setTeacherUsername(teacher.getUsername());
        session.setStartedAt(LocalDateTime.now());
        session.setExpiresAt(LocalDateTime.now().plusMinutes(duration));
        session.setActive(true);
        // ✅ ถ้าไม่มี GPS → ปล่อย null → AttendanceService จะข้ามการเช็ค GPS
        session.setLatitude(lat);
        session.setLongitude(lng);
        session.setRadiusMeter(radius);

        sessionRepository.save(session);

        return ResponseEntity.ok(Map.of(
                "success",     true,
                "sessionCode", code,
                "sessionId",   session.getId(),
                "subject",     subject,
                "room",        session.getRoom(),
                "expiresAt",   session.getExpiresAt().toString(),
                "hasGps",      lat != null
        ));
    }

    @PostMapping("/end")
    public ResponseEntity<?> endSession(@RequestBody Map<String, Object> body,
                                        HttpSession httpSession) {
        User teacher = (User) httpSession.getAttribute("user");
        if (teacher == null) {
            return ResponseEntity.status(401)
                    .body(Map.of("success", false, "message", "Not logged in"));
        }

        String code = (String) body.get("sessionCode");
        if (code == null || code.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("success", false, "message", "sessionCode is required"));
        }

        sessionRepository.findBySessionCodeAndActiveTrue(code).ifPresent(s -> {
            s.setActive(false);
            sessionRepository.save(s);
        });

        return ResponseEntity.ok(Map.of("success", true, "message", "Session ปิดแล้ว"));
    }

    @GetMapping("/verify/{sessionCode}")
    public ResponseEntity<?> verifySession(@PathVariable String sessionCode) {
        return sessionRepository.findBySessionCodeAndActiveTrue(sessionCode)
                .map(s -> {
                    if (LocalDateTime.now().isAfter(s.getExpiresAt())) {
                        s.setActive(false);
                        sessionRepository.save(s);
                        return ResponseEntity.badRequest()
                                .body(Map.of("success", false, "message", "Session หมดอายุแล้ว"));
                    }
                    return ResponseEntity.ok(Map.of(
                            "success",   true,
                            "sessionId", s.getId(),
                            "subject",   s.getSubject(),
                            "room",      s.getRoom(),
                            "hasGps",    s.getLatitude() != null
                    ));
                })
                .orElse(ResponseEntity.badRequest()
                        .body(Map.of("success", false, "message", "ไม่พบ Session หรือหมดอายุแล้ว")));
    }

    // ✅ helper — return null ถ้า parse ไม่ได้หรือเป็น null
    private Double parseDouble(Object val) {
        if (val == null) return null;
        try {
            double d = Double.parseDouble(val.toString());
            // 0.0 ถือว่าไม่มีพิกัดจริง (browser fallback)
            return d == 0.0 ? null : d;
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private int parseInt(String val, int fallback) {
        try { return Integer.parseInt(val); }
        catch (NumberFormatException e) { return fallback; }
    }
}
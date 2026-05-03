package com.example.controller;

import com.example.entity.User;
import com.example.repository.StudentRepository;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/subjects")
public class SubjectController {

    @Autowired
    private JdbcTemplate jdbc;

    // ── วิชาทั้งหมด (สำหรับ dropdown ทั่วไป) ───────────────────────────────
    @GetMapping
    public ResponseEntity<?> getAllSubjects() {
        try {
            List<Map<String, Object>> subjects = jdbc.queryForList(
                "SELECT subject_code, subject_name FROM Subjects ORDER BY subject_code"
            );
            return ResponseEntity.ok(Map.of("success", true, "data", subjects));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    // ── วิชาที่นักศึกษา enroll อยู่ (สำหรับ dropdown ใบลานักศึกษา) ─────────
    @GetMapping("/my")
    public ResponseEntity<?> getMySubjects(HttpSession httpSession) {
        User user = (User) httpSession.getAttribute("user");
        if (user == null) {
            return ResponseEntity.status(401)
                    .body(Map.of("success", false, "message", "Not logged in"));
        }

        try {
            List<Map<String, Object>> subjects = jdbc.queryForList(
                "SELECT s.subject_code, s.subject_name " +
                "FROM Subjects s " +
                "JOIN Student_Enrollments se ON s.subject_code = se.subject_code " +
                "WHERE se.student_id = ? " +
                "ORDER BY s.subject_code",
                user.getUsername()
            );

            // ถ้ายังไม่มีข้อมูล enrollment → ดึงทุกวิชาแทน
            if (subjects.isEmpty()) {
                subjects = jdbc.queryForList(
                    "SELECT subject_code, subject_name FROM Subjects ORDER BY subject_code"
                );
            }

            return ResponseEntity.ok(Map.of("success", true, "data", subjects));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    // ── วิชาที่อาจารย์สอน (สำหรับ dropdown QR และ analytics) ───────────────
    @GetMapping("/teaching")
    public ResponseEntity<?> getTeachingSubjects(HttpSession httpSession) {
        User user = (User) httpSession.getAttribute("user");
        if (user == null) {
            return ResponseEntity.status(401)
                    .body(Map.of("success", false, "message", "Not logged in"));
        }

        try {
            List<Map<String, Object>> subjects = jdbc.queryForList(
                "SELECT s.subject_code, s.subject_name " +
                "FROM Subjects s " +
                "JOIN Teacher_Subjects ts ON s.subject_code = ts.subject_code " +
                "WHERE ts.teacher_id = ? " +
                "ORDER BY s.subject_code",
                user.getUsername()
            );

            // ถ้ายังไม่มีข้อมูล → ดึงทุกวิชาแทน
            if (subjects.isEmpty()) {
                subjects = jdbc.queryForList(
                    "SELECT subject_code, subject_name FROM Subjects ORDER BY subject_code"
                );
            }

            return ResponseEntity.ok(Map.of("success", true, "data", subjects));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("success", false, "message", e.getMessage()));
        }
    }
}
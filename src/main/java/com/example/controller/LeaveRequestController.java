package com.example.controller;

import com.example.dto.LeaveRequestDTO;
import com.example.entity.LeaveRequest;
import com.example.entity.Session;
import com.example.entity.User;
import com.example.repository.SessionRepository;
import com.example.service.LeaveRequestService;
import com.example.service.S3Service;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
public class LeaveRequestController {

    @Autowired
    private LeaveRequestService service;

    @Autowired
    private S3Service s3Service;

    @Autowired
    private SessionRepository sessionRepository;

    // ── นักศึกษาดูใบลาของตัวเอง ────────────────────────────────────────────
    @GetMapping("/api/teacher/leave")
    public ResponseEntity<?> getLeaves(@RequestParam String studentId) {
        List<LeaveRequest> leaves = service.getByStudent(studentId);
        return ResponseEntity.ok(toDTO(leaves));
    }

    // ── อาจารย์ดูใบลาทั้งหมด ───────────────────────────────────────────────
    @GetMapping("/api/teacher/leave/all")
    public ResponseEntity<?> getAllLeaves(HttpSession httpSession) {
        User teacher = (User) httpSession.getAttribute("user");
        if (teacher == null)
            return ResponseEntity.status(401)
                    .body(Map.of("success", false, "message", "Not logged in"));

        List<LeaveRequest> leaves = service.getAll();
        return ResponseEntity.ok(Map.of("success", true, "data", toDTO(leaves)));
    }

    // ── อาจารย์ดู sessions ของวิชา+วันที่ เพื่อให้เลือกตอนอนุมัติ ──────────
    @GetMapping("/api/teacher/leave/{id}/sessions")
    public ResponseEntity<?> getSessionsForLeave(
            @PathVariable Long id,
            HttpSession httpSession) {

        User teacher = (User) httpSession.getAttribute("user");
        if (teacher == null)
            return ResponseEntity.status(401)
                    .body(Map.of("success", false, "message", "Not logged in"));

        LeaveRequest leave = service.getAll().stream()
                .filter(l -> l.getId().equals(id))
                .findFirst()
                .orElse(null);

        if (leave == null)
            return ResponseEntity.badRequest()
                    .body(Map.of("success", false, "message", "ไม่พบใบลา"));

        // หา sessions ของวิชานั้นในวันที่ลา
        List<Session> sessions = sessionRepository
                .findBySubjectAndLeaveDate(leave.getSubjectCode(), leave.getLeaveDate());

        List<Map<String, Object>> result = sessions.stream().map(s -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("sessionId",   s.getId());
            m.put("sessionCode", s.getSessionCode());
            m.put("subject",     s.getSubject());
            m.put("room",        s.getRoom());
            m.put("startedAt",   s.getStartedAt() != null ? s.getStartedAt().toString() : null);
            m.put("active",      s.isActive());
            return m;
        }).toList();

        return ResponseEntity.ok(Map.of("success", true, "data", result,
                "leaveDate", leave.getLeaveDate().toString(),
                "subject",   leave.getSubjectCode()));
    }

    // ── อาจารย์อนุมัติ/ปฏิเสธ ─────────────────────────────────────────────
    @PutMapping({"/api/teacher/leave/{id}/status", "/api/leave/{id}/status"})
    public ResponseEntity<?> updateStatus(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body,
            HttpSession httpSession
    ) {
        User teacher = (User) httpSession.getAttribute("user");
        if (teacher == null)
            return ResponseEntity.status(401)
                    .body(Map.of("success", false, "message", "Not logged in"));

        String status = (String) body.get("status");
        if (!List.of("approved", "rejected").contains(status))
            return ResponseEntity.badRequest()
                    .body(Map.of("success", false, "message", "Invalid status"));

        // sessionId อาจจะไม่ส่งมา (optional)
        Long sessionId = null;
        Object rawSessionId = body.get("sessionId");
        if (rawSessionId != null) {
            try { sessionId = Long.parseLong(rawSessionId.toString()); }
            catch (NumberFormatException ignored) {}
        }

        try {
            LeaveRequest updated = service.updateStatus(id, status, sessionId);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "อัปเดตสถานะแล้ว",
                    "id",      updated.getId(),
                    "status",  updated.getStatus()
            ));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    private List<LeaveRequestDTO> toDTO(List<LeaveRequest> leaves) {
        return leaves.stream().map(l -> {
            LeaveRequestDTO dto = new LeaveRequestDTO();
            dto.setId(l.getId());
            dto.setStudentId(l.getStudentId());
            dto.setStudentName(l.getStudentName());
            dto.setSubject(l.getSubjectCode());
            dto.setLeaveDate(l.getLeaveDate());
            dto.setType(l.getLeaveType());
            dto.setLeaveReason(l.getLeaveReason());
            try {
                dto.setDocumentUrl(s3Service.presignedUrl(l.getDocumentUrl()));
            } catch (Exception e) {
                dto.setDocumentUrl(null);
            }
            dto.setStatus(l.getStatus());
            dto.setSubmittedAt(l.getSubmittedAt());
            dto.setHasFile(l.getHasFile() != null && l.getHasFile());
            return dto;
        }).toList();
    }
}
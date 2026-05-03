package com.example.controller;

import com.example.dto.LeaveRequestDTO;
import com.example.entity.LeaveRequest;
import com.example.entity.User;
import com.example.service.LeaveRequestService;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
public class LeaveRequestController {

    @Autowired
    private LeaveRequestService service;

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

    // ── อาจารย์อนุมัติ/ปฏิเสธ ─────────────────────────────────────────────
    // ✅ FIX: map ทั้ง 2 path เพราะ teacher-leave.js เรียก /api/leave/{id}/status
    //         แต่ path จริงคือ /api/teacher/leave/{id}/status
    @PutMapping({"/api/teacher/leave/{id}/status", "/api/leave/{id}/status"})
    public ResponseEntity<?> updateStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            HttpSession httpSession
    ) {
        User teacher = (User) httpSession.getAttribute("user");
        if (teacher == null)
            return ResponseEntity.status(401)
                    .body(Map.of("success", false, "message", "Not logged in"));

        String status = body.get("status");
        if (!List.of("approved", "rejected").contains(status))
            return ResponseEntity.badRequest()
                    .body(Map.of("success", false, "message", "Invalid status"));

        try {
            LeaveRequest updated = service.updateStatus(id, status);
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
            dto.setDocumentUrl(l.getDocumentUrl());
            dto.setStatus(l.getStatus());
            dto.setSubmittedAt(l.getSubmittedAt());
            dto.setHasFile(l.getHasFile() != null && l.getHasFile());
            return dto;
        }).toList();
    }
}
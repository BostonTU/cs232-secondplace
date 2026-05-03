package com.example.controller;

import com.example.dto.LeaveRequestDTO;
import com.example.entity.LeaveRequest;
import com.example.service.LeaveRequestService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/student/leave")
public class StudentLeaveRequestController {

    @Autowired
    private LeaveRequestService service;

    // ✅ Submit Leave
    @PostMapping(consumes = "multipart/form-data")
    public ResponseEntity<?> submitLeave(
            @RequestParam String studentId,
            @RequestParam String studentName,
            @RequestParam String subject,
            @RequestParam String leaveDate,
            @RequestParam String type,
            @RequestParam String leaveReason,
            @RequestParam(required = false) MultipartFile file
    ) {

        try {
            String fileUrl = null;

            if (file != null && !file.isEmpty()) {
                String filename = UUID.randomUUID() + "_" + file.getOriginalFilename();
                Path path = Paths.get("uploads/" + filename);
                Files.createDirectories(path.getParent());
                Files.write(path, file.getBytes());
                fileUrl = filename;
            }

            LeaveRequestDTO dto = new LeaveRequestDTO();
            dto.setStudentId(studentId);
            dto.setStudentName(studentName);
            dto.setSubject(subject);
            dto.setLeaveDate(LocalDate.parse(leaveDate));
            dto.setType(type);
            dto.setLeaveReason(leaveReason);
            dto.setDocumentUrl(fileUrl);

            LeaveRequest saved = service.submit(dto);

            // ✅ FIX: เพิ่ม success: true ใน response ให้ frontend ตรวจสอบได้
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "ส่งใบลาเรียบร้อย",
                    "id", saved.getId(),
                    "file", fileUrl != null ? fileUrl : ""
            ));

        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @GetMapping
    public ResponseEntity<?> getLeaves(@RequestParam String studentId) {

        List<LeaveRequest> leaves = service.getByStudent(studentId);

        List<LeaveRequestDTO> result = leaves.stream().map(l -> {
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

            return dto;
        }).toList();

        return ResponseEntity.ok(result);
    }
}
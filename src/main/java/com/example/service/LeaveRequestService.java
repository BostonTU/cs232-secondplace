package com.example.service;

import com.example.dto.LeaveRequestDTO;
import com.example.entity.LeaveRequest;
import com.example.repository.LeaveRequestRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class LeaveRequestService {

    @Autowired
    private LeaveRequestRepository repo;

    public LeaveRequest submit(LeaveRequestDTO dto) {

        LeaveRequest leave = new LeaveRequest();

        leave.setStudentId(dto.getStudentId());
        leave.setSubjectCode(dto.getSubject());   
        leave.setLeaveDate(dto.getLeaveDate());
        leave.setLeaveType(dto.getType());        
        leave.setLeaveReason(dto.getLeaveReason());
        leave.setDocumentUrl(dto.getDocumentUrl());
        leave.setStudentName(dto.getStudentName());
        leave.setHasFile(dto.getDocumentUrl() != null && !dto.getDocumentUrl().isEmpty());

        leave.setStatus("pending");
        leave.setSubmittedAt(LocalDateTime.now());

        return repo.save(leave);
    }

    public List<LeaveRequest> getByStudent(String studentId) {
        return repo.findByStudentIdOrderBySubmittedAtDesc(studentId);
    }
    
        public List<LeaveRequest> getAll() {
            return repo.findAllByOrderBySubmittedAtDesc();
        }

        public LeaveRequest updateStatus(Long id, String status) {
            LeaveRequest leave = repo.findById(id)
                .orElseThrow(() -> new RuntimeException("ไม่พบใบลา id=" + id));
            leave.setStatus(status);
            return repo.save(leave);
        }
    }

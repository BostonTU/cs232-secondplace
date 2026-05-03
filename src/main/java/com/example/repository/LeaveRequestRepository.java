package com.example.repository;

import com.example.entity.LeaveRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LeaveRequestRepository extends JpaRepository<LeaveRequest, Long> {
    List<LeaveRequest> findByStudentIdOrderBySubmittedAtDesc(String studentId);
    List<LeaveRequest> findAllByOrderBySubmittedAtDesc();
}
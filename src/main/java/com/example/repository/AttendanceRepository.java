package com.example.repository;

import com.example.entity.Attendance;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AttendanceRepository extends JpaRepository<Attendance, Long> {

	Optional<Attendance> findByStudentIdAndSessionId(String studentId, Long sessionId);

}
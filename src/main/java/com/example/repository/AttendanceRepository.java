package com.example.repository;

import com.example.entity.Attendance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface AttendanceRepository extends JpaRepository<Attendance, Long> {

    boolean existsByStudentIdAndSessionId(String studentId, Long sessionId);

    List<Attendance> findByStudentIdOrderByCheckinDateDesc(String studentId);

    long countByStudentIdAndStatus(String studentId, String status);

    List<Attendance> findBySessionId(Long sessionId);

    @Query("SELECT a.studentId, a.status, COUNT(a) FROM Attendance a GROUP BY a.studentId, a.status")
    List<Object[]> countByStudentAndStatus();
}
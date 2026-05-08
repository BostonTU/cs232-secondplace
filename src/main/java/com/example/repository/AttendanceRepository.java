package com.example.repository;

import com.example.entity.Attendance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface AttendanceRepository extends JpaRepository<Attendance, Long> {

    boolean existsByStudentIdAndSessionId(String studentId, Long sessionId);

    Optional<Attendance> findByStudentIdAndSessionId(String studentId, Long sessionId);

    List<Attendance> findByStudentIdOrderByCheckinDateDesc(String studentId);

    List<Attendance> findBySessionId(Long sessionId);

    List<Attendance> findBySessionIdOrderByCheckinDateAsc(Long sessionId);

    boolean existsBySessionIdAndStudentId(Long sessionId, String studentId);

    Optional<Attendance> findBySessionIdAndStudentId(Long sessionId, String studentId);

    // สถิติรวมทุกวิชาของอาจารย์ (ไม่ filter วิชา)
    @Query("SELECT a.studentId, a.status, COUNT(a) FROM Attendance a " +
           "JOIN Session s ON a.sessionId = s.id " +
           "WHERE s.teacherUsername = :teacherUsername " +
           "GROUP BY a.studentId, a.status")
    List<Object[]> countByStudentAndStatusForTeacher(
            @Param("teacherUsername") String teacherUsername);

    // ─── FIX: เดิม query นี้ขาด GROUP BY ทำให้ return แค่ 1 row และข้อมูลผิด ───
    // สถิติกรอง 1 วิชา
    @Query("SELECT a.studentId, a.status, COUNT(a) FROM Attendance a " +
           "JOIN Session s ON a.sessionId = s.id " +
           "WHERE s.teacherUsername = :teacherUsername " +
           "AND s.subject = :subject " +
           "GROUP BY a.studentId, a.status")
    List<Object[]> countByStudentAndStatus(
            @Param("teacherUsername") String teacherUsername,
            @Param("subject") String subject);

    @Query(value =
            "SELECT s.id, s.subject, s.room, s.started_at, s.active, " +
            "COUNT(a.id) as total, " +
            "SUM(CASE WHEN a.status = N'มา'  THEN 1 ELSE 0 END) as cnt_present, " +
            "SUM(CASE WHEN a.status = N'สาย' THEN 1 ELSE 0 END) as cnt_late, " +
            "SUM(CASE WHEN a.status = N'ขาด' THEN 1 ELSE 0 END) as cnt_absent, " +
            "SUM(CASE WHEN a.status = N'ลา'  THEN 1 ELSE 0 END) as cnt_leave " +
            "FROM sessions s LEFT JOIN Attendance a ON a.session_id = s.id " +
            "WHERE s.teacher_username = :teacherUsername " +
            "GROUP BY s.id, s.subject, s.room, s.started_at, s.active " +
            "ORDER BY s.started_at DESC",
            nativeQuery = true)
    List<Object[]> getSessionSummaryByTeacher(@Param("teacherUsername") String teacherUsername);
    
    @Query("SELECT COUNT(a) FROM Attendance a " +
           "WHERE a.studentId = :studentId " +
           "AND a.status = :status")
    long countByStudentIdAndStatus(
            @Param("studentId") String studentId,
            @Param("status") String status);
}
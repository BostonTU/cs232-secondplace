package com.example.repository;

import com.example.entity.Session;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface SessionRepository extends JpaRepository<Session, Long> {

    Optional<Session> findBySessionCodeAndActiveTrue(String sessionCode);

    Optional<Session> findBySessionCode(String sessionCode);

    // ดึง session ที่ active อยู่ของอาจารย์คนนั้น
    Optional<Session> findFirstByTeacherUsernameAndActiveTrueOrderByStartedAtDesc(String teacherUsername);

    // ดึงทุก session ของอาจารย์ (เรียงล่าสุดก่อน)
    List<Session> findByTeacherUsernameOrderByStartedAtDesc(String teacherUsername);

    /**
     * หา sessions ของวิชา subject ที่ started_at ตรงกับ leaveDate (วันเดียวกัน)
     * ใช้สำหรับ apply ใบลาเข้า attendance
     */
    @Query("SELECT s FROM Session s WHERE s.subject = :subject " +
           "AND CAST(s.startedAt AS date) = :leaveDate")
    List<Session> findBySubjectAndLeaveDate(
            @Param("subject") String subject,
            @Param("leaveDate") LocalDate leaveDate);
}
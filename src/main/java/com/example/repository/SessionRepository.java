package com.example.repository;

import com.example.entity.Session;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;


public interface SessionRepository extends JpaRepository<Session, Long> {
    Optional<Session> findBySessionCodeAndActiveTrue(String sessionCode);
    Optional<Session> findBySessionCode(String sessionCode);
    
    // ดึง session ที่ active อยู่ของอาจารย์คนนั้น
    Optional<Session> findFirstByTeacherUsernameAndActiveTrueOrderByStartedAtDesc(String teacherUsername);

    // ดึงทุก session ของอาจารย์ (เรียงล่าสุดก่อน)
    List<Session> findByTeacherUsernameOrderByStartedAtDesc(String teacherUsername);
}

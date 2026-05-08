package com.example.service;

import com.example.dto.LeaveRequestDTO;
import com.example.entity.Attendance;
import com.example.entity.LeaveRequest;
import com.example.entity.Session;
import com.example.repository.AttendanceRepository;
import com.example.repository.LeaveRequestRepository;
import com.example.repository.SessionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.scheduling.annotation.Scheduled;
import java.time.LocalDate;

@Service
public class LeaveRequestService {

    @Autowired
    private LeaveRequestRepository repo;

    @Autowired
    private AttendanceRepository attendanceRepo;

    @Autowired
    private SessionRepository sessionRepo;

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
    @Scheduled(cron = "0 0 1 * * *")
    @Transactional
    public void expirePendingLeaves() {
        LocalDate cutoff = LocalDate.now().minusDays(7);
        List<LeaveRequest> expired = repo.findAll().stream()
            .filter(l -> "pending".equals(l.getStatus())
                      && l.getLeaveDate() != null
                      && l.getLeaveDate().isBefore(cutoff))
            .toList();

        for (LeaveRequest l : expired) {
            l.setStatus("rejected");
            repo.save(l);
        }
    }
    /**
     * อนุมัติ/ปฏิเสธใบลา
     *
     * เมื่ออนุมัติ (approved):
     *   1. หา session ของวิชานั้น ในวันที่ลา (หรือ sessionId ที่ระบุมา)
     *   2. ถ้าเด็กเคยเช็คชื่อแล้ว → เปลี่ยน status เป็น "ลา"
     *   3. ถ้ายังไม่เคยเช็คชื่อ (ขาด/ไม่มี record) → สร้าง attendance record ใหม่ status = "ลา"
     *
     * @param id         LeaveRequest id
     * @param status     "approved" หรือ "rejected"
     * @param sessionId  (optional) ระบุ session ที่ต้องการแก้ ถ้า null จะหาอัตโนมัติจากวันที่+วิชา
     */
    @Transactional
    public LeaveRequest updateStatus(Long id, String status, Long sessionId) {
        LeaveRequest leave = repo.findById(id)
            .orElseThrow(() -> new RuntimeException("ไม่พบใบลา id=" + id));
        leave.setStatus(status);
        repo.save(leave);

        if ("approved".equals(status)) {
            applyLeaveToAttendance(leave, sessionId);
        }

        return leave;
    }

    // overload เดิมเพื่อ backward compat (ถ้ายังมีที่เรียกแบบไม่ส่ง sessionId)
    @Transactional
    public LeaveRequest updateStatus(Long id, String status) {
        return updateStatus(id, status, null);
    }

    // ─── private helper ──────────────────────────────────────────────────────

    private void applyLeaveToAttendance(LeaveRequest leave, Long targetSessionId) {
        String studentId  = leave.getStudentId();
        String subject    = leave.getSubjectCode();
        LocalDate leaveDate = leave.getLeaveDate();

        List<Session> sessions;

        if (targetSessionId != null) {
            // อาจารย์เลือก session มาเอง
            sessions = sessionRepo.findById(targetSessionId)
                    .map(List::of)
                    .orElse(List.of());
        } else {
            // หา session ทุกอันของวิชานั้นที่ started_at ตรงกับวันที่ลา
            sessions = sessionRepo.findBySubjectAndLeaveDate(subject, leaveDate);
        }

        for (Session session : sessions) {
            Optional<Attendance> existing =
                    attendanceRepo.findByStudentIdAndSessionId(studentId, session.getId());

            if (existing.isPresent()) {
                // มี record อยู่แล้ว → เปลี่ยนเป็น "ลา"
                Attendance att = existing.get();
                att.setStatus("ลา");
                attendanceRepo.save(att);
             // หลังแก้ — ใส่เวลาอนุมัติแทน null
            } else {
                // ไม่เคยเช็คชื่อ (ขาดเลย) → สร้าง record ใหม่ status = "ลา"
                Attendance att = new Attendance();
                att.setStudentId(studentId);
                att.setSessionId(session.getId());
                att.setStatus("ลา");
                att.setCheckinDate(LocalDateTime.now()); // ใช้เวลาที่อาจารย์อนุมัติ (ป้องกัน NOT NULL)
                att.setFaceVerified(false);
                attendanceRepo.save(att);
            }
        }
    }
}
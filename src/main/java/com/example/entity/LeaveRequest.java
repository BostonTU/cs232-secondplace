package com.example.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "Leave_Requests")
public class LeaveRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "student_id", nullable = false, length = 20)
    private String studentId;

    @Column(name = "student_name", length = 100)
    private String studentName;

    @Column(name = "subject", length = 20)
    private String subjectCode;

    @Column(name = "leave_date", nullable = false)
    private LocalDate leaveDate;

    @Column(name = "type", length = 20)
    private String leaveType;

    @Column(name = "leave_reason", columnDefinition = "nvarchar(max)")
    private String leaveReason;

    @Column(name = "document_url", length = 255)
    private String documentUrl;

    @Column(name = "has_file")
    private Boolean hasFile = false;

    @Column(name = "status", length = 20)
    private String status = "pending";

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    // ✅ FIX: ลบ @ManyToOne ออก เพราะ join column ซ้ำกับ student_id ข้างบน
    // ทำให้ Hibernate สร้าง FK conflict และ insert ล้มเหลว
    // ถ้าต้องการดึงชื่อ student ให้ query ผ่าน StudentRepository แทน

    @PrePersist
    public void prePersist() {
        if (this.submittedAt == null) {
            this.submittedAt = LocalDateTime.now();
        }
    }

    public Long getId() { return id; }

    public String getStudentId() { return studentId; }
    public void setStudentId(String studentId) { this.studentId = studentId; }

    public String getStudentName() { return studentName; }
    public void setStudentName(String studentName) { this.studentName = studentName; }

    public String getSubjectCode() { return subjectCode; }
    public void setSubjectCode(String subjectCode) { this.subjectCode = subjectCode; }

    public LocalDate getLeaveDate() { return leaveDate; }
    public void setLeaveDate(LocalDate leaveDate) { this.leaveDate = leaveDate; }

    public String getLeaveType() { return leaveType; }
    public void setLeaveType(String leaveType) { this.leaveType = leaveType; }

    public String getLeaveReason() { return leaveReason; }
    public void setLeaveReason(String leaveReason) { this.leaveReason = leaveReason; }

    public String getDocumentUrl() { return documentUrl; }
    public void setDocumentUrl(String documentUrl) { this.documentUrl = documentUrl; }

    public Boolean getHasFile() { return hasFile; }
    public void setHasFile(Boolean hasFile) { this.hasFile = hasFile; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getSubmittedAt() { return submittedAt; }
    public void setSubmittedAt(LocalDateTime submittedAt) { this.submittedAt = submittedAt; }
}
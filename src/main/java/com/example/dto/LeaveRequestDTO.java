package com.example.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

public class LeaveRequestDTO {

    private Long id;
    private String studentId;
    private String studentName;
    private String subject;
    private LocalDate leaveDate;
    private String type;
    private String leaveReason;
    private String documentUrl;
    private Boolean hasFile;
    private String status;
    private LocalDateTime submittedAt;
    private LocalDateTime reviewedAt;
    private String reviewerNote;

    // getters
    public Long getId() { return id; }
    public String getStudentId() { return studentId; }
    public String getStudentName() { return studentName; }
    public String getSubject() { return subject; }
    public LocalDate getLeaveDate() { return leaveDate; }
    public String getType() { return type; }
    public String getLeaveReason() { return leaveReason; }
    public String getDocumentUrl() { return documentUrl; }
    public Boolean getHasFile() { return hasFile; }
    public String getStatus() { return status; }
    public LocalDateTime getSubmittedAt() { return submittedAt; }
    public LocalDateTime getReviewedAt() { return reviewedAt; }
    public String getReviewerNote() { return reviewerNote; }

    // setters
    public void setId(Long id) { this.id = id; }
    public void setStudentId(String studentId) { this.studentId = studentId; }
    public void setStudentName(String studentName) { this.studentName = studentName; }
    public void setSubject(String subject) { this.subject = subject; }
    public void setLeaveDate(LocalDate leaveDate) { this.leaveDate = leaveDate; }
    public void setType(String type) { this.type = type; }
    public void setLeaveReason(String leaveReason) { this.leaveReason = leaveReason; }
    public void setDocumentUrl(String documentUrl) { this.documentUrl = documentUrl; }
    public void setHasFile(Boolean hasFile) { this.hasFile = hasFile; }
    public void setStatus(String status) { this.status = status; }
    public void setSubmittedAt(LocalDateTime submittedAt) { this.submittedAt = submittedAt; }
    public void setReviewedAt(LocalDateTime reviewedAt) { this.reviewedAt = reviewedAt; }
    public void setReviewerNote(String reviewerNote) { this.reviewerNote = reviewerNote; }
}
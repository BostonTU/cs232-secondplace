package com.example.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "Attendance",
       uniqueConstraints = @UniqueConstraint(columnNames = {"student_id", "session_id"}))
public class Attendance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "student_id", nullable = false, length = 20)
    private String studentId;

    @Column(name = "session_id", nullable = false)
    private Long sessionId;

    @Column(name = "check_in_date")
    private LocalDateTime checkinDate;

    @Column(name = "status", length = 10)
    private String status;

    @Column(name = "latitude")
    private Double latitude;

    @Column(name = "longitude")
    private Double longitude;

    @Column(name = "ip_address", length = 50)
    private String ipAddress;

    @Column(name = "photo_url", length = 255)
    private String photoUrl;

    @Column(name = "face_verified")
    private Boolean faceVerified = false;

    @Column(name = "face_similarity")
    private Double faceSimilarity;

    public Long getId() { return id; }

    public String getStudentId() { return studentId; }
    public void setStudentId(String studentId) { this.studentId = studentId; }

    public Long getSessionId() { return sessionId; }
    public void setSessionId(Long sessionId) { this.sessionId = sessionId; }

    public LocalDateTime getCheckinDate() { return checkinDate; }
    public void setCheckinDate(LocalDateTime checkinDate) { this.checkinDate = checkinDate; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }

    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }

    public String getIpAddress() { return ipAddress; }
    public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }

    public String getPhotoUrl() { return photoUrl; }
    public void setPhotoUrl(String photoUrl) { this.photoUrl = photoUrl; }

    public Boolean getFaceVerified() { return faceVerified; }
    public void setFaceVerified(Boolean faceVerified) { this.faceVerified = faceVerified; }

    public Double getFaceSimilarity() { return faceSimilarity; }
    public void setFaceSimilarity(Double faceSimilarity) { this.faceSimilarity = faceSimilarity; }
}
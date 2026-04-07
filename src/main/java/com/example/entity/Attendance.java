package com.example.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "Attendance", uniqueConstraints = @UniqueConstraint(columnNames = { "student_id", "session_id" }))
public class Attendance {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;
	
    @Column(name = "student_id")
	private String studentId;
    
	@Column(name = "class_id")
	private Long sessionId;
	
	@Column(name = "check_in_date")
	private LocalDateTime checkinDate;
	private String ipAddress;

	private Double latitude;
	private Double longitude;

	private String status;

	// getters setters
	public Long getId() {
		return id;
	}

	public String getStudentId() {
		return studentId;
	}

	public void setStudentId(String string) {
		this.studentId = string;
	}

	public Long getSessionId() {
		return sessionId;
	}

	public void setSessionId(Long sessionId) {
		this.sessionId = sessionId;
	}

	public LocalDateTime getCheckinDate() {
		return checkinDate;
	}

	public void setCheckinDate(LocalDateTime checkinDate) {
		this.checkinDate = checkinDate;
	}

	public String getIpAddress() {
		return ipAddress;
	}

	public void setIpAddress(String ipAddress) {
		this.ipAddress = ipAddress;
	}

	public Double getLatitude() {
		return latitude;
	}

	public void setLatitude(Double latitude) {
		this.latitude = latitude;
	}

	public Double getLongitude() {
		return longitude;
	}

	public void setLongitude(Double longitude) {
		this.longitude = longitude;
	}

	public String getStatus() {
		return status;
	}

	public void setStatus(String status) {
		this.status = status;
	}
}
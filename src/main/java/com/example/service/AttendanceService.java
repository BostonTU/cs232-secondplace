package com.example.service;

import com.example.entity.Attendance;
import com.example.repository.AttendanceRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class AttendanceService {

	@Autowired
	private AttendanceRepository repo;

	public String checkIn(String studentId, Long sessionId, String ip, Double lat, Double lng) {

		if (repo.findByStudentIdAndSessionId(studentId, sessionId).isPresent()) {
			return "Already checked in";
		}

		Attendance a = new Attendance();
		a.setStudentId(String.valueOf(studentId));
		a.setSessionId(sessionId);
		a.setCheckinDate(LocalDateTime.now());
		a.setIpAddress(ip);
		a.setLatitude(lat);
		a.setLongitude(lng);
		a.setStatus("มา");

		repo.save(a);

		return "Check-in success";
	}
}
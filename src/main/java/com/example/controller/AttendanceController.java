package com.example.controller;

import com.example.dto.CheckInRequest;
import com.example.service.AttendanceService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/attendance")
public class AttendanceController {

	@Autowired
	private AttendanceService service;

	@PostMapping("/checkin")
	public ResponseEntity<?> checkIn(@RequestBody CheckInRequest req, HttpServletRequest request) {

		String ip = request.getRemoteAddr();

		String result = service.checkIn(req.getStudentId(), req.getSessionId(), ip, req.getLatitude(),
				req.getLongitude());

		return ResponseEntity.ok(result);
	}
}
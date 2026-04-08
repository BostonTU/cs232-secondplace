package com.example.demo.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.example.demo.model.Attendance;
import com.example.demo.repository.AttendanceRepository;

@Service
public class CheckinService {

    @Autowired
    private AttendanceRepository attendanceRepository;

    public Attendance checkin(String studentId, String sessionCode) {

        Attendance attendance = new Attendance();

        attendance.setStudentId(studentId);
        attendance.setSessionCode(sessionCode);

        return attendanceRepository.save(attendance);
    }

}
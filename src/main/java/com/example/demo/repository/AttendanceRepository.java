package com.example.demo.repository;

import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Repository;

import com.example.demo.model.Attendance;

@Repository
public class AttendanceRepository {

    private List<Attendance> attendanceList = new ArrayList<>();

    public Attendance save(Attendance attendance) {

        attendanceList.add(attendance);
        return attendance;

    }

    public List<Attendance> findAll() {

        return attendanceList;

    }

}
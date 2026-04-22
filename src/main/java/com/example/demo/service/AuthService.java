package com.example.demo.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.example.demo.model.Student;
import com.example.demo.repository.StudentRepository;

@Service
public class AuthService {

    @Autowired
    private StudentRepository studentRepository;

    public Student login(String studentId, String password) {

        // ตัวอย่าง logic ง่ายๆ
        // ตอนนี้ยังไม่เช็ค password จริง
        Student student = new Student();
        student.setStudentId(studentId);
        student.setName("Demo Student");

        return student;
    }

}

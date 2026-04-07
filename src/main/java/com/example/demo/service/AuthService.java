package com.example.demo.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.example.demo.model.Student;
import com.example.demo.repository.StudentRepository;

@Service
public class AuthService {

    @Autowired
    StudentRepository studentRepository;

    public Student login(String studentId,String password){

        Student student = studentRepository.findByStudentId(studentId);

        if(student != null && student.getPassword().equals(password)){
            return student;
        }

        return null;
    }

}

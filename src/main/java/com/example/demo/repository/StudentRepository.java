package com.example.demo.repository;

import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Repository;

import com.example.demo.model.Student;

@Repository
public class StudentRepository {

    private List<Student> students = new ArrayList<>();

    public Student save(Student student) {

        students.add(student);
        return student;

    }

    public List<Student> findAll() {

        return students;

    }

}

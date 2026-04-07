package com.example.demo.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
public class Attendance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;

    private String studentId;
    private String sessionCode;
    private LocalDateTime checkinTime;

    public Attendance(){
        this.checkinTime = LocalDateTime.now();
    }

    public void setStudentId(String studentId){
        this.studentId = studentId;
    }

    public void setSessionCode(String sessionCode){
        this.sessionCode = sessionCode;
    }

    public String getStudentId(){
        return studentId;
    }

    public String getSessionCode(){
        return sessionCode;
    }
}
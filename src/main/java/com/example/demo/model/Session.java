package com.example.demo.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
public class Session {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;

    private String sessionCode;

    private LocalDateTime createdAt;

    public Session(){
        this.createdAt = LocalDateTime.now();
    }

}

package com.example.demo.controller;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class LeaveController {

    @PostMapping("/leave")
    public String requestLeave(
            @RequestParam String studentId,
            @RequestParam String reason) {

        return "Leave request submitted by " + studentId + " reason: " + reason;
    }

}

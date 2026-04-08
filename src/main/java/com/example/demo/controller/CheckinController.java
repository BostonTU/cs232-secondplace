package com.example.demo.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import com.example.demo.model.Attendance;
import com.example.demo.service.CheckinService;

@RestController
@RequestMapping("/checkin")
public class CheckinController {

    @Autowired
    private CheckinService checkinService;

    @PostMapping
    public Attendance checkin(@RequestParam String studentId,
                              @RequestParam String sessionCode) {

        return checkinService.checkin(studentId, sessionCode);
    }

}

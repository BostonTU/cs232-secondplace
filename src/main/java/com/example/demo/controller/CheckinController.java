package com.example.demo.controller;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class CheckinController {

    @PostMapping("/checkin")
    public String checkin(){

        return "checkin success";

    }

}

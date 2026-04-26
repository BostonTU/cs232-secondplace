package com.example.demo.controller;

import com.example.demo.model.GpsLocation;
import com.example.demo.service.GpsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/gps")
public class GpsController {

    @Autowired
    private GpsService gpsService;

    @PostMapping("/check-location")
    public ResponseEntity<String> verifyLocation(@RequestBody GpsLocation location) {
        boolean isCloseEnough = gpsService.isWithinRange(location.getLatitude(), location.getLongitude());

        if (isCloseEnough) {
            return ResponseEntity.ok("อยู่ในระยะที่เช็กชื่อได้");
        } else {
            return ResponseEntity.status(403).body("คุณอยู่ไกลจากห้องเรียนเกินไป");
        }
    }
}

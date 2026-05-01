package com.example.service;

import org.springframework.stereotype.Service;

@Service
public class GpsService {

    // พิกัดห้องเรียนตัวอย่าง (เปลี่ยนเป็นพิกัดจริงของคุณ)
    private final double TARGET_LAT = 13.7563; 
    private final double TARGET_LNG = 100.5018;
    private final double MAX_DISTANCE_METERS = 50.0; // อนุญาตให้ห่างได้ไม่เกิน 50 เมตร

    public boolean isWithinRange(double userLat, double userLng) {
        double earthRadius = 6371000; // รัศมีโลกเป็นเมตร
        double dLat = Math.toRadians(userLat - TARGET_LAT);
        double dLng = Math.toRadians(userLng - TARGET_LNG);
        
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                   Math.cos(Math.toRadians(TARGET_LAT)) * Math.cos(Math.toRadians(userLat)) *
                   Math.sin(dLng / 2) * Math.sin(dLng / 2);
        
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        double distance = earthRadius * c;

        return distance <= MAX_DISTANCE_METERS;
    }
}

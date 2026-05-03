package com.example.service;

import com.example.entity.Attendance;
import com.example.entity.Session;
import com.example.repository.AttendanceRepository;
import com.example.repository.SessionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class AttendanceService {

    @Autowired
    private AttendanceRepository repo;

    @Autowired
    private SessionRepository sessionRepo;

    public String checkIn(String studentId, Long sessionId, String ip, Double lat, Double lng) {

        if (repo.existsByStudentIdAndSessionId(studentId, sessionId)) {
            return "Already checked in";
        }

        Optional<Session> sessionOpt = sessionRepo.findById(sessionId);
        if (sessionOpt.isEmpty() || !sessionOpt.get().isActive()) {
            return "SESSION_NOT_FOUND";
        }

        Session session = sessionOpt.get();

        // ✅ FIX: ตรวจ GPS เฉพาะเมื่อ:
        //   1. frontend ส่ง lat/lng มาจริง (ไม่ใช่ null)
        //   2. lat/lng ไม่ใช่ 0,0 (fallback เก่า)
        //   3. session มีพิกัดและ radius ตั้งไว้
        boolean hasFrontendGps = lat != null && lng != null
                && !(lat == 0.0 && lng == 0.0);

        boolean sessionHasGps = session.getLatitude()  != null
                && session.getLongitude() != null
                && session.getRadiusMeter() != null;

        if (hasFrontendGps && sessionHasGps) {
            double distance = haversine(lat, lng, session.getLatitude(), session.getLongitude());
            if (distance > session.getRadiusMeter()) {
                return "OUT_OF_RANGE";
            }
        }

        // สาย = เกิน 15 นาทีหลัง session เริ่ม
        String status = "มา";
        if (session.getStartedAt() != null
                && LocalDateTime.now().isAfter(session.getStartedAt().plusMinutes(15))) {
            status = "สาย";
        }

        Attendance a = new Attendance();
        a.setStudentId(studentId);
        a.setSessionId(sessionId);
        a.setCheckinDate(LocalDateTime.now());
        a.setIpAddress(ip);
        a.setLatitude(lat);
        a.setLongitude(lng);
        a.setStatus(status);
        a.setFaceVerified(false);

        repo.save(a);
        return "Success";
    }

    private double haversine(double lat1, double lng1, double lat2, double lng2) {
        final double R = 6371000;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
}
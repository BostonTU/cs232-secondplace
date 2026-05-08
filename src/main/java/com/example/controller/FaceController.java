package com.example.controller;

import com.example.entity.Student;
import com.example.entity.User;
import com.example.repository.StudentRepository;
import com.example.service.RekognitionService;
import com.example.service.S3Service;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Base64;
import java.util.Map;

@RestController
@RequestMapping("/api/face")
public class FaceController {

    @Autowired
    private RekognitionService rekognitionService;

    @Autowired
    private S3Service s3Service;

    @Autowired
    private StudentRepository studentRepository;

    @Value("${aws.s3.bucket}")
    private String bucket;

    // ─────────────────────────────────────────────
    // ลงทะเบียน / อัปเดตรูปใบหน้า
    // ─────────────────────────────────────────────
    @PostMapping("/register")
    public ResponseEntity<?> registerFace(
            @RequestBody Map<String, String> body,
            HttpSession session) {

        User user = (User) session.getAttribute("user");

        if (user == null) {
            return ResponseEntity.status(401).body(
                    Map.of(
                            "success", false,
                            "message", "กรุณา Login ก่อน"
                    )
            );
        }

        String base64 = body.get("image");

        if (base64 == null || base64.isBlank()) {
            return ResponseEntity.badRequest().body(
                    Map.of(
                            "success", false,
                            "message", "ไม่มีรูปภาพ"
                    )
            );
        }

        try {

            // decode base64
            String raw = base64.contains(",")
                    ? base64.split(",")[1]
                    : base64;

            byte[] imageBytes = Base64.getDecoder().decode(raw);

            // หา student
            Student student = studentRepository
                    .findById(user.getUsername())
                    .orElse(null);

            if (student == null) {
                return ResponseEntity.badRequest().body(
                        Map.of(
                                "success", false,
                                "message", "ไม่พบข้อมูลนักศึกษา"
                        )
                );
            }

            // ====================================================
            // ลบรูปเก่าใน S3
            // ====================================================

            String oldKey = student.getFacePhotoKey();

            System.out.println("OLD KEY = " + oldKey);

            if (oldKey != null && !oldKey.isBlank()) {

                System.out.println("DELETE FILE = " + oldKey);

                s3Service.deleteFile(oldKey);

                System.out.println("DELETE SUCCESS");
            }

            // ====================================================
            // upload รูปใหม่
            // ====================================================

            String newKey = s3Service.uploadBytes(
                    imageBytes,
                    "face-register",
                    user.getUsername() + ".jpg",
                    "image/jpeg"
            );

            System.out.println("NEW KEY = " + newKey);

            // ====================================================
            // update db
            // ====================================================

            student.setFacePhotoKey(newKey);

            studentRepository.save(student);

            return ResponseEntity.ok(
                    Map.of(
                            "success", true,
                            "message", "ลงทะเบียนใบหน้าสำเร็จ",
                            "photoKey", newKey
                    )
            );

        } catch (Exception e) {

            e.printStackTrace();

            return ResponseEntity.internalServerError().body(
                    Map.of(
                            "success", false,
                            "message", e.getMessage()
                    )
            );
        }
    }

    // ─────────────────────────────────────────────
    // เช็คสถานะลงทะเบียนใบหน้า
    // ─────────────────────────────────────────────
    @GetMapping("/status")
    public ResponseEntity<?> faceStatus(HttpSession session) {

        User user = (User) session.getAttribute("user");

        if (user == null) {
            return ResponseEntity.status(401)
                    .body(Map.of("success", false));
        }

        boolean registered = studentRepository
                .findById(user.getUsername())
                .map(s -> s.getFacePhotoKey() != null
                        && !s.getFacePhotoKey().isBlank())
                .orElse(false);

        return ResponseEntity.ok(
                Map.of(
                        "success", true,
                        "registered", registered
                )
        );
    }

    // ─────────────────────────────────────────────
    // Verify Face
    // ─────────────────────────────────────────────
    @PostMapping("/verify")
    public ResponseEntity<?> verifyFace(
            @RequestBody Map<String, String> body,
            HttpSession session) {

        User user = (User) session.getAttribute("user");

        if (user == null) {
            return ResponseEntity.status(401).body(
                    Map.of(
                            "success", false,
                            "message", "กรุณา Login ก่อน"
                    )
            );
        }

        String base64 = body.get("image");

        if (base64 == null || base64.isBlank()) {
            return ResponseEntity.badRequest().body(
                    Map.of(
                            "success", false,
                            "message", "ไม่มีรูปภาพ"
                    )
            );
        }

        try {

            String s3Key = studentRepository
                    .findById(user.getUsername())
                    .map(Student::getFacePhotoKey)
                    .orElse(null);

            if (s3Key == null || s3Key.isBlank()) {

                return ResponseEntity.ok(
                        Map.of(
                                "success", false,
                                "faceMatch", false,
                                "message", "ยังไม่มีรูปใบหน้าในระบบ กรุณาลงทะเบียนก่อน"
                        )
                );
            }

            String raw = base64.contains(",")
                    ? base64.split(",")[1]
                    : base64;

            byte[] imageBytes = Base64.getDecoder().decode(raw);

            // compare face
            float similarity = rekognitionService.compareFaces(
                    imageBytes,
                    bucket,
                    s3Key
            );

            // upload log รูป checkin
            String checkInPhotoKey = s3Service.uploadBytes(
                    imageBytes,
                    "face-checkin",
                    user.getUsername() + "_" + System.currentTimeMillis() + ".jpg",
                    "image/jpeg"
            );

            boolean isMatch = similarity >= 80;

            return ResponseEntity.ok(
                    Map.of(
                            "success", true,
                            "faceMatch", isMatch,
                            "similarity", similarity,
                            "photoKey", checkInPhotoKey,
                            "message", isMatch
                                    ? "ยืนยันตัวตนสำเร็จ"
                                    : "ใบหน้าไม่ตรง กรุณาลองใหม่"
                    )
            );

        } catch (Exception e) {

            e.printStackTrace();

            return ResponseEntity.internalServerError().body(
                    Map.of(
                            "success", false,
                            "message", e.getMessage()
                    )
            );
        }
    }
}
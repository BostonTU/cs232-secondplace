package com.example.controller;

import com.example.entity.User;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @GetMapping("/current")
    public ResponseEntity<?> getCurrentUser(HttpSession session) {
        User currentUser = (User) session.getAttribute("user");

        if (currentUser != null) {
            // ✅ FIX: return เฉพาะ field ที่จำเป็น ไม่ return password ออกไป
            return ResponseEntity.ok(Map.of(
                "id",       currentUser.getId(),
                "username", currentUser.getUsername(),
                "fullName", currentUser.getFullName(),
                "email",    currentUser.getEmail() != null ? currentUser.getEmail() : "",
                "role",     currentUser.getRole()
            ));
        } else {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
    }
}
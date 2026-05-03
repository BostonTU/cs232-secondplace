package com.example.controller;

import com.example.dto.LoginRequest;
import com.example.dto.TUApiResponse;
import com.example.entity.Student;
import com.example.entity.Teacher;
import com.example.entity.User;
import com.example.repository.StudentRepository;
import com.example.repository.TeacherRepository;
import com.example.repository.UserRepository;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
public class LoginController {

    private final UserRepository userRepository;
    private final RestTemplate restTemplate;

    @Value("${tu.api.url:https://restapi.tu.ac.th/api/v1/auth/Ad/verify2}")
    private String tuApiUrl;

    @Value("${tu.api.key}")
    private String applicationKey;

    @Autowired
    public LoginController(UserRepository userRepository, RestTemplate restTemplate) {
        this.userRepository = userRepository;
        this.restTemplate = restTemplate;
    }

    @PostMapping("/api/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest loginRequest, HttpSession session) {
        System.out.println("Login attempt - username: " + loginRequest.getUsername());

        // ตรวจสอบ Local User ก่อน (admin / test accounts)
        Optional<User> localUser = userRepository.findByUsernameOrEmail(loginRequest.getUsername());
        if (localUser.isPresent() && localUser.get().getPassword() != null) {
            User user = localUser.get();
            if (user.getPassword().equals(loginRequest.getPassword())) {
                session.setAttribute("user", user);
                return ResponseEntity.ok(buildLoginResponse(user));
            }
        }

        // TU API
        try {
            TUApiResponse tuResponse = verifyWithTUApi(loginRequest.getUsername(), loginRequest.getPassword());

            if (tuResponse != null && tuResponse.isStatus()) {
                User user = saveOrUpdateUser(tuResponse);
                session.setAttribute("user", user);
                return ResponseEntity.ok(buildLoginResponse(user));
            } else {
                return ResponseEntity.status(401)
                        .body(Map.of("success", false, "message", "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"));
            }

        } catch (HttpClientErrorException e) {
            System.err.println("TU API Error: " + e.getStatusCode() + " - " + e.getMessage());
            return ResponseEntity.status(401)
                    .body(Map.of("success", false, "message", "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"));
        } catch (Exception e) {
            System.err.println("Login error: " + e.getMessage());
            return ResponseEntity.status(500)
                    .body(Map.of("success", false, "message", "เกิดข้อผิดพลาดที่เซิร์ฟเวอร์"));
        }
    }

    @GetMapping("/api/profile")
    public ResponseEntity<?> getProfile(HttpSession session) {
        User user = (User) session.getAttribute("user");
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("success", false, "message", "Not logged in"));
        }
        return ResponseEntity.ok(Map.of(
                "username", user.getUsername(),
                "fullName", user.getFullName(),
                "email",    user.getEmail() != null ? user.getEmail() : "",
                "role",     user.getRole()
        ));
    }

    @PostMapping("/api/logout")
    public ResponseEntity<?> logout(HttpSession session) {
        session.invalidate();
        return ResponseEntity.ok(Map.of("success", true, "message", "Logged out"));
    }

    @GetMapping("/logout")
    public ResponseEntity<?> logoutGet(HttpSession session) {
        session.invalidate();
        return ResponseEntity.ok(Map.of("success", true, "message", "Logged out"));
    }

    @PostMapping("/api/webhook")
    public ResponseEntity<?> webhook(@RequestBody Map<String, Object> payload) {
        System.out.println("Webhook received: " + payload);
        return ResponseEntity.ok(Map.of("status", "success", "message", "Webhook received"));
    }

    @GetMapping("/api/webhook")
    public ResponseEntity<?> webhookGet() {
        return ResponseEntity.ok(Map.of("status", "success", "message", "Webhook endpoint is ready"));
    }

    // ── Private helpers ────────────────────────────────────────────

    private Map<String, Object> buildLoginResponse(User user) {
        Map<String, Object> res = new HashMap<>();
        res.put("success",  true);
        res.put("message",  "Login successful");
        res.put("role",     user.getRole());
        res.put("username", user.getUsername());
        res.put("fullName", user.getFullName());
        res.put("email",    user.getEmail() != null ? user.getEmail() : "");
        return res;
    }

    private TUApiResponse verifyWithTUApi(String username, String password) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Application-Key", applicationKey);

        Map<String, String> requestBody = new HashMap<>();
        requestBody.put("UserName", username);
        requestBody.put("PassWord", password);

        HttpEntity<Map<String, String>> entity = new HttpEntity<>(requestBody, headers);
        System.out.println("Calling TU API: " + tuApiUrl);

        ResponseEntity<TUApiResponse> response = restTemplate.exchange(
                tuApiUrl, HttpMethod.POST, entity, TUApiResponse.class);

        System.out.println("TU API Response: " + response.getBody());
        return response.getBody();
    }

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private TeacherRepository teacherRepository;

    private User saveOrUpdateUser(TUApiResponse tuResponse) {
        Optional<User> existingUser = userRepository.findByUsername(tuResponse.getUsername());
        User user = existingUser.orElseGet(User::new);

        user.setUsername(tuResponse.getUsername());
        // เอาชื่อภาษาไทยถ้ามี ถ้าไม่มีเอาภาษาอังกฤษ
        String name = (tuResponse.getDisplayname_th() != null && !tuResponse.getDisplayname_th().isBlank())
                ? tuResponse.getDisplayname_th()
                : tuResponse.getDisplayname_en();
        user.setFullName(name);
        user.setEmail(tuResponse.getEmail());

        String role = determineRole(tuResponse.getType());
        user.setRole(role);

        User saved = userRepository.save(user);

        // auto สร้าง Students record
        if ("Student".equals(role)) {
            if (!studentRepository.existsById(saved.getUsername())) {
                Student student = new Student();
                student.setStudentId(saved.getUsername());
                student.setStudentName(saved.getFullName());
                student.setEmail(saved.getEmail());
                studentRepository.save(student);
            } else {
                studentRepository.findById(saved.getUsername()).ifPresent(s -> {
                    s.setStudentName(saved.getFullName());
                    s.setEmail(saved.getEmail());
                    studentRepository.save(s);
                });
            }
        }

        // auto สร้าง Teachers record
        if ("Staff".equals(role)) {
            if (!teacherRepository.existsById(saved.getUsername())) {
                Teacher teacher = new Teacher();
                teacher.setTeacherId(saved.getUsername());
                teacher.setFullName(saved.getFullName());
                teacher.setEmail(saved.getEmail());
                // ✅ FIX: null-safe ป้องกัน NPE ถ้า TU API ไม่ส่ง department มา
                teacher.setDepartment(tuResponse.getDepartment() != null ? tuResponse.getDepartment() : "");
                teacherRepository.save(teacher);
            } else {
                teacherRepository.findById(saved.getUsername()).ifPresent(t -> {
                    t.setFullName(saved.getFullName());
                    t.setEmail(saved.getEmail());
                    teacherRepository.save(t);
                });
            }
        }

        return saved;
    }

    private String determineRole(String type) {
        if (type == null || type.isBlank()) return "Student";
        return switch (type.toLowerCase().trim()) {
            case "student"                    -> "Student";
            // ✅ FIX: เพิ่ม "lecturer", "instructor" เผื่อ TU API return มาหลาย format
            case "teacher", "employee", "staff", "lecturer", "instructor" -> "Staff";
            default -> "Student";
        };
    }
}
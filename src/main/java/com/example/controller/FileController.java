package com.example.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.net.MalformedURLException;
import java.nio.file.*;

@RestController
public class FileController {

    private static final Path UPLOAD_DIR = Paths.get("/app/uploads").toAbsolutePath().normalize();

    // GET /uploads/{filename}  — ให้อาจารย์เปิดไฟล์/รูปภาพจากใบลา
    @GetMapping("/uploads/{filename:.+}")
    public ResponseEntity<Resource> serveFile(@PathVariable String filename,
                                              HttpServletRequest request) {
        try {
            Path filePath = UPLOAD_DIR.resolve(filename).normalize();

            // ป้องกัน path traversal attack — เปรียบเทียบ absolute path ที่ normalize แล้วทั้งคู่
            if (!filePath.startsWith(UPLOAD_DIR)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            Resource resource = new UrlResource(filePath.toUri());
            if (!resource.exists() || !resource.isReadable()) {
                return ResponseEntity.notFound().build();
            }

            // ตรวจ content type อัตโนมัติจากนามสกุลไฟล์
            String contentType = null;
            try {
                contentType = request.getServletContext()
                        .getMimeType(resource.getFile().getAbsolutePath());
            } catch (Exception ignored) {}

            if (contentType == null) {
                contentType = MediaType.APPLICATION_OCTET_STREAM_VALUE;
            }

            // รูปภาพ/PDF → inline (เปิดในเบราว์เซอร์)
            // ไฟล์อื่น → attachment (ดาวน์โหลด)
            boolean isInline = contentType.startsWith("image/") || contentType.equals("application/pdf");
            ContentDisposition cd = isInline
                    ? ContentDisposition.inline().filename(filename).build()
                    : ContentDisposition.attachment().filename(filename).build();

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(HttpHeaders.CONTENT_DISPOSITION, cd.toString())
                    .body(resource);

        } catch (MalformedURLException e) {
            return ResponseEntity.badRequest().build();
        }
    }
}
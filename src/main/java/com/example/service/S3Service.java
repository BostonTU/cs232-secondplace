package com.example.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.auth.credentials.AwsSessionCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

import java.io.IOException;
import java.time.Duration;
import java.util.UUID;

@Service
public class S3Service {

    @Value("${aws.s3.bucket}")
    private String bucket;

    @Value("${aws.region}")
    private String region;

    @Value("${aws.accessKey}")
    private String accessKey;

    @Value("${aws.secretKey}")
    private String secretKey;

    @Value("${aws.sessionToken:}")
    private String sessionToken;

    private StaticCredentialsProvider getCredentials() {
        AwsSessionCredentials creds = AwsSessionCredentials.create(accessKey, secretKey, sessionToken);
        return StaticCredentialsProvider.create(creds);
    }

    private S3Client getS3() {
        return S3Client.builder()
                .region(Region.of(region))
                .credentialsProvider(getCredentials())
                .build();
    }

    // อัพโหลด MultipartFile (ใบลา)
    public String uploadFile(MultipartFile file, String folder) throws IOException {
        String safe = file.getOriginalFilename() != null
                ? file.getOriginalFilename().replaceAll("[^a-zA-Z0-9._-]", "_") : "file";
        String key = folder + "/" + UUID.randomUUID() + "_" + safe;

        getS3().putObject(
            PutObjectRequest.builder()
                .bucket(bucket).key(key)
                .contentType(file.getContentType())
                .build(),
            RequestBody.fromBytes(file.getBytes())
        );
        return key;
    }

    // อัพโหลด byte[] (รูปหน้าจาก base64)
    public String uploadBytes(byte[] data, String folder, String filename, String contentType) {
        String key = folder + "/" + UUID.randomUUID() + "_" + filename;
        getS3().putObject(
            PutObjectRequest.builder()
                .bucket(bucket).key(key).contentType(contentType).build(),
            RequestBody.fromBytes(data)
        );
        return key;
    }

    // สร้าง URL ชั่วคราว 1 ชั่วโมง สำหรับให้อาจารย์เปิดดูไฟล์
    public String presignedUrl(String s3Key) {
        if (s3Key == null || s3Key.isBlank()) return null;
        try (S3Presigner p = S3Presigner.builder()
                .region(Region.of(region))
                .credentialsProvider(getCredentials())
                .build()) {
            return p.presignGetObject(
                GetObjectPresignRequest.builder()
                    .signatureDuration(Duration.ofHours(1))
                    .getObjectRequest(r -> r.bucket(bucket).key(s3Key))
                    .build()
            ).url().toString();
        }
    }

    // ลบไฟล์ (ใช้ตอน update รูปหน้า)
    public void deleteFile(String s3Key) {
        if (s3Key == null || s3Key.isBlank()) return;
        getS3().deleteObject(
            DeleteObjectRequest.builder().bucket(bucket).key(s3Key).build()
        );
    }
}
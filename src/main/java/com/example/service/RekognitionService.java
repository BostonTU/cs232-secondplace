package com.example.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.auth.credentials.AwsSessionCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.SdkBytes;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.rekognition.RekognitionClient;
import software.amazon.awssdk.services.rekognition.model.*;

@Service
public class RekognitionService {

    @Value("${aws.region}")
    private String region;

    @Value("${aws.accessKey}")
    private String accessKey;

    @Value("${aws.secretKey}")
    private String secretKey;

    @Value("${aws.sessionToken:}")
    private String sessionToken;

    private RekognitionClient getClient() {
        AwsSessionCredentials creds = AwsSessionCredentials.create(accessKey, secretKey, sessionToken);
        return RekognitionClient.builder()
                .region(Region.of(region))
                .credentialsProvider(StaticCredentialsProvider.create(creds))
                .build();
    }

    public float compareFaces(byte[] sourceBytes, String s3Bucket, String s3Key) {
        try {
            CompareFacesResponse response = getClient().compareFaces(
                    CompareFacesRequest.builder()
                            .sourceImage(Image.builder()
                                    .bytes(SdkBytes.fromByteArray(sourceBytes))
                                    .build())
                            .targetImage(Image.builder()
                                    .s3Object(S3Object.builder()
                                            .bucket(s3Bucket)
                                            .name(s3Key)
                                            .build())
                                    .build())
                            .similarityThreshold(80F)
                            .build()
            );

            if (response.faceMatches().isEmpty()) return -1;
            return response.faceMatches().get(0).similarity();

        } catch (InvalidParameterException e) {
            return -1;
        }
    }
}
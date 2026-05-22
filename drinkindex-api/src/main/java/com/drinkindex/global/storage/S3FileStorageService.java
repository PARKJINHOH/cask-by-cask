package com.drinkindex.global.storage;

import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

// 추후 S3 연동 시 활성화. software.amazon.awssdk:s3 의존성 추가 후 구현.
@Service
@Profile({"dev", "prod"})
public class S3FileStorageService implements FileStorageService {

    @Override
    public String upload(MultipartFile file, String savedFileName, String subPath) {
        throw new UnsupportedOperationException("S3 설정 필요");
    }

    @Override
    public ImageUploadResult uploadImage(
            MultipartFile file,
            String originalSavedFileName,
            String subPath,
            String detectedMimeType
    ) {
        throw new UnsupportedOperationException("S3 설정 필요");
    }

    @Override
    public void delete(String savedFileName, String subPath) {
        throw new UnsupportedOperationException("S3 설정 필요");
    }
}

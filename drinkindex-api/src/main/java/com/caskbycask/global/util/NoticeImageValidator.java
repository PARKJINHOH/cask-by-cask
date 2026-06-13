package com.caskbycask.global.util;

import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.UUID;

// [보안] 이미지 업로드 보안 검증 — 4단계 순서 준수
// 1단계: 파일 크기 (최대 10MB)
// 2단계: 확장자 화이트리스트 검증
// 3단계: Magic Bytes 검사 (확장자 스푸핑 차단)
// 4단계: 파일명 UUID 랜덤화 (원본명은 저장 경로에 사용 안 함)
@Component
public class NoticeImageValidator {

    private static final long MAX_FILE_SIZE = 10L * 1024 * 1024; // 10MB

    // Magic Bytes 상수
    private static final byte[] MAGIC_JPEG = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF};
    private static final byte[] MAGIC_PNG  = {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A};
    private static final byte[] MAGIC_GIF  = {0x47, 0x49, 0x46, 0x38}; // "GIF8" — GIF87a / GIF89a 공통
    private static final byte[] MAGIC_RIFF = {0x52, 0x49, 0x46, 0x46}; // WEBP header 1/2: "RIFF"
    private static final byte[] MAGIC_WEBP = {0x57, 0x45, 0x42, 0x50}; // WEBP header 2/2: "WEBP" (offset 8)

    /**
     * 파일 유효성 검사 후 검증된 MIME 타입 반환.
     * 순서: 크기 → 확장자 → Magic Bytes
     */
    public String validate(MultipartFile file) {
        // 1단계: 파일 크기
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new CustomException(ErrorCode.NOTICE_IMAGE_SIZE_EXCEEDED);
        }

        // 2단계: 확장자 화이트리스트
        String extension = extractExtension(file.getOriginalFilename());
        try {
            NoticeImageAllowedExtension.valueOf(extension.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new CustomException(ErrorCode.NOTICE_INVALID_IMAGE_FORMAT);
        }

        // 3단계: Magic Bytes 검사 → 검증된 MIME 타입 반환
        return detectMimeType(file);
    }

    /**
     * UUID 기반 저장 파일명 생성. 확장자는 소문자로 정규화.
     * 4단계: 파일명 랜덤화 — 원본명은 DB에만 보존, 경로에는 미사용.
     */
    public String generateSavedFileName(String originalFileName) {
        String extension = extractExtension(originalFileName);
        return UUID.randomUUID() + "." + extension.toLowerCase();
    }

    private String detectMimeType(MultipartFile file) {
        byte[] header = new byte[12];
        try (InputStream is = file.getInputStream()) {
            int read = is.read(header, 0, 12);
            if (read < 3) {
                throw new CustomException(ErrorCode.NOTICE_INVALID_IMAGE_MAGIC_BYTES);
            }
        } catch (IOException e) {
            throw new CustomException(ErrorCode.NOTICE_INVALID_IMAGE_MAGIC_BYTES);
        }

        if (startsWith(header, MAGIC_JPEG)) return "image/jpeg";
        if (startsWith(header, MAGIC_PNG))  return "image/png";
        if (startsWith(header, MAGIC_GIF))  return "image/gif";
        if (isWebp(header))                 return "image/webp";

        throw new CustomException(ErrorCode.NOTICE_INVALID_IMAGE_MAGIC_BYTES);
    }

    private boolean startsWith(byte[] header, byte[] magic) {
        if (header.length < magic.length) return false;
        for (int i = 0; i < magic.length; i++) {
            if (header[i] != magic[i]) return false;
        }
        return true;
    }

    // WEBP: bytes 0~3 = "RIFF", bytes 8~11 = "WEBP"
    private boolean isWebp(byte[] header) {
        if (header.length < 12) return false;
        if (!startsWith(header, MAGIC_RIFF)) return false;
        for (int i = 0; i < MAGIC_WEBP.length; i++) {
            if (header[8 + i] != MAGIC_WEBP[i]) return false;
        }
        return true;
    }

    private String extractExtension(String fileName) {
        if (fileName == null || !fileName.contains(".")) {
            throw new CustomException(ErrorCode.NOTICE_INVALID_IMAGE_FORMAT);
        }
        return fileName.substring(fileName.lastIndexOf('.') + 1);
    }
}

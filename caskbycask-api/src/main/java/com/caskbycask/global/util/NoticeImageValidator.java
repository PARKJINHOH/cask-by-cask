package com.caskbycask.global.util;

import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.UUID;

/**
 * 업로드 이미지의 크기, 확장자와 실제 형식을 순서대로 검증한다.
 */
@Component
public class NoticeImageValidator {

    private static final long MAX_FILE_SIZE = 10L * 1024 * 1024;

    private static final byte[] MAGIC_JPEG = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF};
    private static final byte[] MAGIC_PNG = {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A};
    private static final byte[] MAGIC_GIF = {0x47, 0x49, 0x46, 0x38};
    private static final byte[] MAGIC_RIFF = {0x52, 0x49, 0x46, 0x46};
    private static final byte[] MAGIC_WEBP = {0x57, 0x45, 0x42, 0x50};

    /**
     * 파일을 검증하고, 실제 바이트에서 판별한 MIME 타입을 반환한다.
     */
    public String validate(MultipartFile file) {
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new CustomException(ErrorCode.NOTICE_IMAGE_SIZE_EXCEEDED);
        }

        String extension = extractExtension(file.getOriginalFilename());
        try {
            NoticeImageAllowedExtension.valueOf(extension.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new CustomException(ErrorCode.NOTICE_INVALID_IMAGE_FORMAT);
        }

        String mimeType = detectMimeType(file);
        if (!extensionMatchesMime(extension, mimeType)) {
            throw new CustomException(ErrorCode.NOTICE_INVALID_IMAGE_MAGIC_BYTES);
        }

        return mimeType;
    }

    /**
     * 원본 파일명을 경로에 노출하지 않도록 UUID 기반 저장명을 생성한다.
     */
    public String generateSavedFileName(String originalFileName) {
        String extension = extractExtension(originalFileName);
        return UUID.randomUUID() + "." + extension.toLowerCase();
    }

    private String detectMimeType(MultipartFile file) {
        byte[] header = new byte[12];
        try (InputStream input = file.getInputStream()) {
            // InputStream.read(...)는 데이터가 남아 있어도 일부만 반환할 수 있다.
            // PNG/WebP의 8~12바이트 헤더를 안정적으로 채우기 위해 readNBytes를 사용한다.
            int read = input.readNBytes(header, 0, header.length);
            if (read < 3) {
                throw new CustomException(ErrorCode.NOTICE_INVALID_IMAGE_MAGIC_BYTES);
            }
        } catch (IOException e) {
            throw new CustomException(ErrorCode.NOTICE_INVALID_IMAGE_MAGIC_BYTES);
        }

        if (startsWith(header, MAGIC_JPEG)) return "image/jpeg";
        if (startsWith(header, MAGIC_PNG)) return "image/png";
        if (startsWith(header, MAGIC_GIF)) return "image/gif";
        if (isWebp(header)) return "image/webp";

        throw new CustomException(ErrorCode.NOTICE_INVALID_IMAGE_MAGIC_BYTES);
    }

    private boolean startsWith(byte[] header, byte[] magic) {
        if (header.length < magic.length) return false;
        for (int i = 0; i < magic.length; i++) {
            if (header[i] != magic[i]) return false;
        }
        return true;
    }

    private boolean isWebp(byte[] header) {
        if (header.length < 12 || !startsWith(header, MAGIC_RIFF)) return false;
        for (int i = 0; i < MAGIC_WEBP.length; i++) {
            if (header[8 + i] != MAGIC_WEBP[i]) return false;
        }
        return true;
    }

    private boolean extensionMatchesMime(String extension, String mimeType) {
        return switch (extension.toLowerCase()) {
            case "jpg", "jpeg" -> "image/jpeg".equals(mimeType);
            case "png" -> "image/png".equals(mimeType);
            case "gif" -> "image/gif".equals(mimeType);
            case "webp" -> "image/webp".equals(mimeType);
            default -> false;
        };
    }

    private String extractExtension(String fileName) {
        if (fileName == null || !fileName.contains(".")) {
            throw new CustomException(ErrorCode.NOTICE_INVALID_IMAGE_FORMAT);
        }
        return fileName.substring(fileName.lastIndexOf('.') + 1);
    }
}

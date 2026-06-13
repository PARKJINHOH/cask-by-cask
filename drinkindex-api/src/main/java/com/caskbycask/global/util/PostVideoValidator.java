package com.caskbycask.global.util;

import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.Set;
import java.util.UUID;

// [보안] 동영상 업로드 검증 — 4단계
// 1단계: 파일 크기 (최대 50MB)
// 2단계: 확장자 화이트리스트 (mp4, webm)
// 3단계: Magic Bytes 검사 (확장자 스푸핑 차단)
// 4단계: 파일명 UUID 랜덤화
@Component
public class PostVideoValidator {

    private static final long MAX_SIZE = 50L * 1024 * 1024;
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("mp4", "webm");

    // MP4: ISO Base Media File Format — bytes[4..7] = "ftyp" (0x66 74 79 70)
    private static final byte[] MAGIC_MP4_FTYP = {0x66, 0x74, 0x79, 0x70};
    // WebM: EBML 헤더 — bytes[0..3] = 0x1A 45 DF A3
    private static final byte[] MAGIC_WEBM = {0x1A, 0x45, (byte) 0xDF, (byte) 0xA3};

    public String validate(MultipartFile file) {
        if (file.getSize() > MAX_SIZE) {
            throw new CustomException(ErrorCode.POST_VIDEO_SIZE_EXCEEDED);
        }
        String ext = extractExtension(file.getOriginalFilename());
        if (!ALLOWED_EXTENSIONS.contains(ext.toLowerCase())) {
            throw new CustomException(ErrorCode.POST_VIDEO_INVALID_FORMAT);
        }
        return detectMimeType(file);
    }

    public String generateSavedFileName(String originalFileName) {
        String ext = extractExtension(originalFileName).toLowerCase();
        return UUID.randomUUID() + "." + ext;
    }

    private String detectMimeType(MultipartFile file) {
        byte[] header = new byte[12];
        try (InputStream is = file.getInputStream()) {
            int read = is.read(header, 0, 12);
            if (read < 8) throw new CustomException(ErrorCode.POST_VIDEO_INVALID_FORMAT);
        } catch (IOException e) {
            throw new CustomException(ErrorCode.POST_VIDEO_INVALID_FORMAT);
        }

        // WebM: EBML magic at offset 0
        if (startsWith(header, 0, MAGIC_WEBM)) return "video/webm";

        // MP4: ftyp box type at offset 4
        if (startsWith(header, 4, MAGIC_MP4_FTYP)) return "video/mp4";

        throw new CustomException(ErrorCode.POST_VIDEO_INVALID_FORMAT);
    }

    private boolean startsWith(byte[] buf, int offset, byte[] magic) {
        if (buf.length < offset + magic.length) return false;
        for (int i = 0; i < magic.length; i++) {
            if (buf[offset + i] != magic[i]) return false;
        }
        return true;
    }

    private String extractExtension(String fileName) {
        if (fileName == null || !fileName.contains(".")) {
            throw new CustomException(ErrorCode.POST_VIDEO_INVALID_FORMAT);
        }
        return fileName.substring(fileName.lastIndexOf('.') + 1);
    }
}

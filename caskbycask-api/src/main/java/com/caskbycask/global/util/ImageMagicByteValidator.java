package com.caskbycask.global.util;

import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;

/**
 * 이미지 Magic Bytes 검증 유틸 (확장자 스푸핑 차단).
 *
 * NoticeImageValidator 는 공지/팝업/배너 전용 에러코드·크기 제한에 결합돼 있어,
 * 도메인별 에러코드를 쓰는 문의(inquiry)·피드백(feedback) 등 비로그인 업로드 채널에서는
 * 이 유틸로 헤더만 검사하고 에러코드는 호출측이 던진다.
 *
 * 지원 포맷: JPEG / PNG / GIF / WEBP.
 */
public final class ImageMagicByteValidator {

    private static final byte[] MAGIC_JPEG = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF};
    private static final byte[] MAGIC_PNG  = {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A};
    private static final byte[] MAGIC_GIF  = {0x47, 0x49, 0x46, 0x38};       // "GIF8"
    private static final byte[] MAGIC_RIFF = {0x52, 0x49, 0x46, 0x46};       // "RIFF"
    private static final byte[] MAGIC_WEBP = {0x57, 0x45, 0x42, 0x50};       // "WEBP" (offset 8)

    private ImageMagicByteValidator() {
    }

    /** 헤더가 지원 이미지 포맷의 Magic Bytes 와 일치하면 true. 읽기 실패 시 false. */
    public static boolean isSupportedImage(MultipartFile file) {
        byte[] header = new byte[12];
        try (InputStream is = file.getInputStream()) {
            int read = is.read(header, 0, 12);
            if (read < 3) {
                return false;
            }
        } catch (IOException e) {
            return false;
        }
        return startsWith(header, MAGIC_JPEG)
                || startsWith(header, MAGIC_PNG)
                || startsWith(header, MAGIC_GIF)
                || isWebp(header);
    }

    private static boolean startsWith(byte[] header, byte[] magic) {
        if (header.length < magic.length) return false;
        for (int i = 0; i < magic.length; i++) {
            if (header[i] != magic[i]) return false;
        }
        return true;
    }

    // WEBP: bytes 0~3 = "RIFF", bytes 8~11 = "WEBP"
    private static boolean isWebp(byte[] header) {
        if (header.length < 12) return false;
        if (!startsWith(header, MAGIC_RIFF)) return false;
        for (int i = 0; i < MAGIC_WEBP.length; i++) {
            if (header[8 + i] != MAGIC_WEBP[i]) return false;
        }
        return true;
    }
}

package com.caskbycask.global.util;

import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import java.io.ByteArrayInputStream;
import java.io.FilterInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;

class NoticeImageValidatorTest {

    private final NoticeImageValidator validator = new NoticeImageValidator();

    private static final byte[] PNG_BYTES = {
            (byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
            0, 0, 0, 13, 'I', 'H', 'D', 'R',
            0, 0, 0, 1, 0, 0, 0, 1
    };

    private static final byte[] JPEG_BYTES = {
            (byte) 0xFF, (byte) 0xD8, (byte) 0xFF,
            0, 0, 0, 0, 0, 0, 0, 0, 0
    };

    @Test
    void acceptsFileWhoseExtensionDisagreesWithItsContent() {
        // 카톡·메신저를 거치며 이름만 바뀐 파일 — 내용이 PNG 면 PNG 로 받는다.
        MockMultipartFile file = new MockMultipartFile("file", "renamed.jpg", "image/jpeg", PNG_BYTES);

        NoticeImageValidator.ValidatedImage validated = validator.inspect(file);

        assertThat(validated.mimeType()).isEqualTo("image/png");
        assertThat(validated.savedFileName()).endsWith(".png");
    }

    @Test
    void acceptsFileWithoutAnyExtension() {
        MockMultipartFile file = new MockMultipartFile("file", "screenshot", null, PNG_BYTES);

        assertThat(validator.inspect(file).mimeType()).isEqualTo("image/png");
    }

    @Test
    void acceptsUnfamiliarExtensionWhenContentIsAnImage() {
        MockMultipartFile file = new MockMultipartFile("file", "photo.jfif", "image/jpeg", JPEG_BYTES);

        NoticeImageValidator.ValidatedImage validated = validator.inspect(file);

        assertThat(validated.mimeType()).isEqualTo("image/jpeg");
        assertThat(validated.savedFileName()).endsWith(".jpg");
    }

    @Test
    void acceptsSupportedHeaderEvenWhenInputStreamReturnsOneBytePerRead() {
        MockMultipartFile file = new MockMultipartFile("file", "photo.jpg", "image/jpeg", JPEG_BYTES) {
            @Override
            public InputStream getInputStream() {
                return new FilterInputStream(new ByteArrayInputStream(JPEG_BYTES)) {
                    @Override
                    public int read(byte[] bytes, int offset, int length) throws IOException {
                        return super.read(bytes, offset, Math.min(length, 1));
                    }
                };
            }
        };

        assertThat(validator.inspect(file).mimeType()).isEqualTo("image/jpeg");
    }

    @Test
    void acceptsBmp() {
        byte[] bmp = new byte[14];
        bmp[0] = 0x42; // 'B'
        bmp[1] = 0x4D; // 'M'
        bmp[2] = 14;   // 파일 크기 (예약 4바이트 6~9 는 0 그대로)

        MockMultipartFile file = new MockMultipartFile("file", "paint.bmp", "image/bmp", bmp);

        assertThat(validator.inspect(file).mimeType()).isEqualTo("image/bmp");
    }

    @Test
    void acceptsAvif() {
        byte[] avif = new byte[16];
        System.arraycopy(new byte[]{0, 0, 0, 0x20, 'f', 't', 'y', 'p', 'a', 'v', 'i', 'f'}, 0, avif, 0, 12);

        MockMultipartFile file = new MockMultipartFile("file", "photo.avif", "image/avif", avif);

        assertThat(validator.inspect(file).mimeType()).isEqualTo("image/avif");
    }

    @Test
    void rejectsHeicWithItsOwnReason() {
        byte[] heic = new byte[16];
        System.arraycopy(new byte[]{0, 0, 0, 0x20, 'f', 't', 'y', 'p', 'h', 'e', 'i', 'c'}, 0, heic, 0, 12);

        assertThat(errorCodeOf(new MockMultipartFile("file", "IMG_0001.HEIC", null, heic)))
                .isEqualTo(ErrorCode.NOTICE_IMAGE_HEIC_UNSUPPORTED);
    }

    @Test
    void rejectsSvgWithItsOwnReason() {
        byte[] svg = "<svg xmlns=\"http://www.w3.org/2000/svg\"><script/></svg>".getBytes(StandardCharsets.UTF_8);

        assertThat(errorCodeOf(new MockMultipartFile("file", "logo.png", "image/png", svg)))
                .isEqualTo(ErrorCode.NOTICE_IMAGE_SVG_UNSUPPORTED);
    }

    @Test
    void rejectsNonImageContentEvenWithImageExtension() {
        byte[] zip = {0x50, 0x4B, 0x03, 0x04, 0, 0, 0, 0, 0, 0, 0, 0};

        assertThat(errorCodeOf(new MockMultipartFile("file", "archive.png", "image/png", zip)))
                .isEqualTo(ErrorCode.NOTICE_INVALID_IMAGE_FORMAT);
    }

    @Test
    void rejectsEmptyFile() {
        assertThat(errorCodeOf(new MockMultipartFile("file", "empty.png", "image/png", new byte[0])))
                .isEqualTo(ErrorCode.NOTICE_IMAGE_EMPTY);
    }

    @Test
    void rejectsOversizedFile() {
        byte[] tooBig = new byte[10 * 1024 * 1024 + 1];
        System.arraycopy(JPEG_BYTES, 0, tooBig, 0, JPEG_BYTES.length);

        assertThat(errorCodeOf(new MockMultipartFile("file", "huge.jpg", "image/jpeg", tooBig)))
                .isEqualTo(ErrorCode.NOTICE_IMAGE_SIZE_EXCEEDED);
    }

    private ErrorCode errorCodeOf(MockMultipartFile file) {
        Throwable thrown = catchThrowable(() -> validator.inspect(file));
        assertThat(thrown).isInstanceOf(CustomException.class);
        return ((CustomException) thrown).getErrorCode();
    }
}

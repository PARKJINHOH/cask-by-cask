package com.caskbycask.global.util;

import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import java.io.ByteArrayInputStream;
import java.io.FilterInputStream;
import java.io.IOException;
import java.io.InputStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class NoticeImageValidatorTest {

    private final NoticeImageValidator validator = new NoticeImageValidator();

    @Test
    void rejectsWhitelistedExtensionWhenActualFormatDoesNotMatch() {
        byte[] oneByOnePng = {
                (byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
                0, 0, 0, 13, 'I', 'H', 'D', 'R',
                0, 0, 0, 1, 0, 0, 0, 1
        };
        MockMultipartFile file = new MockMultipartFile("file", "spoofed.jpg", "image/jpeg", oneByOnePng);

        assertThatThrownBy(() -> validator.validate(file))
                .isInstanceOf(CustomException.class)
                .satisfies(error -> assertThat(((CustomException) error).getErrorCode())
                        .isEqualTo(ErrorCode.NOTICE_INVALID_IMAGE_MAGIC_BYTES));
    }

    @Test
    void acceptsSupportedHeaderEvenWhenInputStreamReturnsOneBytePerRead() {
        byte[] jpegHeader = {
                (byte) 0xFF, (byte) 0xD8, (byte) 0xFF,
                0, 0, 0, 0, 0, 0, 0, 0, 0
        };
        MockMultipartFile file = new MockMultipartFile("file", "photo.jpg", "image/jpeg", jpegHeader) {
            @Override
            public InputStream getInputStream() {
                return new FilterInputStream(new ByteArrayInputStream(jpegHeader)) {
                    @Override
                    public int read(byte[] bytes, int offset, int length) throws IOException {
                        return super.read(bytes, offset, Math.min(length, 1));
                    }
                };
            }
        };

        assertThat(validator.validate(file)).isEqualTo("image/jpeg");
    }
}

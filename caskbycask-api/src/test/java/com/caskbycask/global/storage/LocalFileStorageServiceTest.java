package com.caskbycask.global.storage;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class LocalFileStorageServiceTest {

    @Mock
    private WebpConversionService webpConversionService;

    @TempDir
    Path tempDir;

    @Test
    void losslessModeIsUsedForWebpConversion() throws Exception {
        byte[] sourceBytes = {1, 2, 3};
        byte[] convertedBytes = {4, 5, 6};
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "banner.png",
                "image/png",
                sourceBytes
        );

        given(webpConversionService.isConvertibleMime("image/png")).willReturn(true);
        given(webpConversionService.toWebp(any(byte[].class), eq(WebpConversionMode.LOSSLESS)))
                .willReturn(convertedBytes);

        LocalFileStorageService service = new LocalFileStorageService(
                tempDir.toString(),
                webpConversionService
        );

        ImageUploadResult result = service.uploadImage(
                file,
                "banner-id.png",
                "banners/202607",
                "image/png",
                WebpConversionMode.LOSSLESS
        );

        assertThat(result.savedFileName()).isEqualTo("banner-id.webp");
        assertThat(Files.readAllBytes(tempDir.resolve("banners/202607/banner-id.webp")))
                .isEqualTo(convertedBytes);
        verify(webpConversionService).toWebp(sourceBytes, WebpConversionMode.LOSSLESS);
    }

    @Test
    void forceReencodeOverwritesWebpInputAtTheSameUuidPath() throws Exception {
        byte[] sourceBytes = {1, 2, 3};
        byte[] convertedBytes = {4, 5, 6};
        MockMultipartFile file = new MockMultipartFile(
                "file", "proof.webp", "image/webp", sourceBytes);
        given(webpConversionService.toWebp(
                any(byte[].class), eq(WebpConversionMode.LOSSY)))
                .willReturn(convertedBytes);
        LocalFileStorageService service = new LocalFileStorageService(
                tempDir.toString(), webpConversionService);

        ImageUploadResult result = service.uploadImage(
                file,
                "123e4567-e89b-12d3-a456-426614174000.webp",
                "reviews/202607",
                "image/webp",
                WebpConversionMode.LOSSY,
                true);

        assertThat(result.mimeType()).isEqualTo("image/webp");
        assertThat(Files.readAllBytes(tempDir.resolve(
                "reviews/202607/123e4567-e89b-12d3-a456-426614174000.webp")))
                .isEqualTo(convertedBytes);
        verify(webpConversionService).toWebp(
                sourceBytes, WebpConversionMode.LOSSY);
    }
}

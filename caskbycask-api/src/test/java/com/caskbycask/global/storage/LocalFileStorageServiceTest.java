package com.caskbycask.global.storage;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
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

    @Test
    void responsiveUploadWritesMainImageAndWidthSuffixedVariants() throws Exception {
        byte[] sourceBytes = {1, 2, 3};
        byte[] mainBytes = {4, 5, 6};
        MockMultipartFile file = new MockMultipartFile(
                "file", "photo.jpg", "image/jpeg", sourceBytes);

        given(webpConversionService.toWebp(any(byte[].class), eq(WebpConversionMode.LOSSY), eq(2560)))
                .willReturn(mainBytes);
        given(webpConversionService.toWebpVariants(
                any(byte[].class), eq(WebpConversionMode.LOSSY), eq(List.of(640, 1280))))
                .willReturn(Map.of(640, new byte[]{7}, 1280, new byte[]{8}));

        LocalFileStorageService service = new LocalFileStorageService(
                tempDir.toString(), webpConversionService);

        ImageUploadResult result = service.uploadResponsiveImage(
                file,
                "photo-id.jpg",
                "posts/202607",
                "image/jpeg",
                WebpConversionMode.LOSSY,
                new ResponsiveImageSpec(2560, List.of(640, 1280)));

        assertThat(result.savedFileName()).isEqualTo("photo-id.webp");
        Path dir = tempDir.resolve("posts/202607");
        assertThat(Files.readAllBytes(dir.resolve("photo-id.webp"))).isEqualTo(mainBytes);
        // 프론트 srcset 이 요청하는 이름과 정확히 같아야 한다 (photoImageVariants.ts).
        assertThat(Files.readAllBytes(dir.resolve("photo-id_w640.webp"))).isEqualTo(new byte[]{7});
        assertThat(Files.readAllBytes(dir.resolve("photo-id_w1280.webp"))).isEqualTo(new byte[]{8});
    }

    @Test
    void variantFailureStillPublishesTheMainImage() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "photo.jpg", "image/jpeg", new byte[]{1, 2, 3});

        given(webpConversionService.toWebp(any(byte[].class), eq(WebpConversionMode.LOSSY), eq(2560)))
                .willReturn(new byte[]{4, 5, 6});
        given(webpConversionService.toWebpVariants(any(byte[].class), any(), any()))
                .willThrow(new IOException("cwebp 실패"));

        LocalFileStorageService service = new LocalFileStorageService(
                tempDir.toString(), webpConversionService);

        ImageUploadResult result = service.uploadResponsiveImage(
                file, "photo-id.jpg", "posts/202607", "image/jpeg",
                WebpConversionMode.LOSSY, new ResponsiveImageSpec(2560, List.of(640)));

        // 축소본이 없어도 업로드는 성공해야 한다 — 서빙이 본 이미지로 폴백한다.
        assertThat(result.savedFileName()).isEqualTo("photo-id.webp");
        assertThat(Files.exists(tempDir.resolve("posts/202607/photo-id_w640.webp"))).isFalse();
    }

    @Test
    void responsiveUploadLeavesAnimatedGifUntouched() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "loop.gif", "image/gif", new byte[]{0x47, 0x49, 0x46, 0x38});

        LocalFileStorageService service = new LocalFileStorageService(
                tempDir.toString(), webpConversionService);

        ImageUploadResult result = service.uploadResponsiveImage(
                file, "loop-id.gif", "posts/202607", "image/gif",
                WebpConversionMode.LOSSY, new ResponsiveImageSpec(2560, List.of(640, 1280)));

        // GIF 를 WebP 로 재인코딩하면 애니메이션이 죽는다 — 원본 그대로 서빙해야 한다.
        assertThat(result.savedFileName()).isEqualTo("loop-id.gif");
        assertThat(result.mimeType()).isEqualTo("image/gif");
        assertThat(Files.exists(tempDir.resolve("posts/202607/loop-id_w640.webp"))).isFalse();
        verify(webpConversionService, never()).toWebp(any(byte[].class), any(), any());
        verify(webpConversionService, never()).toWebpVariants(any(byte[].class), any(), any());
    }

    @Test
    void deleteRemovesOriginalAndResponsiveVariants() throws Exception {
        Path dir = tempDir.resolve("posts/202607");
        Files.createDirectories(dir);
        Files.write(dir.resolve("photo-id.webp"), new byte[]{1});
        Files.write(dir.resolve("photo-id.jpg"), new byte[]{2});   // 보관용 원본
        Files.write(dir.resolve("photo-id_w640.webp"), new byte[]{3});
        Files.write(dir.resolve("photo-id_w1280.webp"), new byte[]{4});
        Files.write(dir.resolve("other-id.webp"), new byte[]{5});  // 남의 파일

        LocalFileStorageService service = new LocalFileStorageService(
                tempDir.toString(), webpConversionService);

        service.delete("photo-id.webp", "posts/202607");

        // glob 이 "photo-id.*" 면 언더스코어가 붙는 축소본이 디스크에 남는다.
        assertThat(Files.exists(dir.resolve("photo-id.webp"))).isFalse();
        assertThat(Files.exists(dir.resolve("photo-id.jpg"))).isFalse();
        assertThat(Files.exists(dir.resolve("photo-id_w640.webp"))).isFalse();
        assertThat(Files.exists(dir.resolve("photo-id_w1280.webp"))).isFalse();
        assertThat(Files.exists(dir.resolve("other-id.webp"))).isTrue();
    }
}

package com.drinkindex.domain.spirit.service;

import com.drinkindex.domain.spirit.dto.SpiritImageResponse;
import com.drinkindex.domain.spirit.entity.Spirit;
import com.drinkindex.domain.spirit.entity.SpiritImage;
import com.drinkindex.domain.spirit.entity.enums.SpiritCategory;
import com.drinkindex.domain.spirit.repository.SpiritImageRepository;
import com.drinkindex.domain.spirit.repository.SpiritRepository;
import com.drinkindex.global.exception.CustomException;
import com.drinkindex.global.exception.ErrorCode;
import com.drinkindex.global.storage.WebpConversionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.file.Path;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class SpiritImageServiceTest {

    @Mock
    private SpiritRepository spiritRepository;

    @Mock
    private SpiritImageRepository spiritImageRepository;

    @Mock
    private WebpConversionService webpConversionService;

    @InjectMocks
    private SpiritImageService spiritImageService;

    @TempDir
    Path tempDir;

    private Spirit spirit;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(spiritImageService, "uploadPath", tempDir.toString());

        spirit = Spirit.builder()
                .nameKo("테스트 위스키")
                .nameEn("Test Whisky")
                .category(SpiritCategory.WHISKY)
                .build();
        ReflectionTestUtils.setField(spirit, "id", 1L);
    }

    @Test
    @DisplayName("JPG 파일 업로드 성공")
    void uploadImage_jpg_success() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "test.jpg", "image/jpeg", new byte[1024]);

        given(spiritRepository.findById(1L)).willReturn(Optional.of(spirit));
        given(spiritImageRepository.findBySpiritId(1L)).willReturn(List.of());
        given(spiritImageRepository.save(any())).willAnswer(inv -> {
            SpiritImage img = inv.getArgument(0);
            ReflectionTestUtils.setField(img, "id", 10L);
            return img;
        });

        SpiritImageResponse result = spiritImageService.uploadImage(1L, file);

        assertThat(result.imageUrl()).contains("/uploads/spirits/1/");
        assertThat(result.isPrimary()).isTrue();
        verify(spiritImageRepository).save(any(SpiritImage.class));
    }

    @Test
    @DisplayName("PNG 파일 업로드 성공")
    void uploadImage_png_success() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "test.png", "image/png", new byte[512]);

        given(spiritRepository.findById(1L)).willReturn(Optional.of(spirit));
        given(spiritImageRepository.findBySpiritId(1L)).willReturn(List.of());
        given(spiritImageRepository.save(any())).willAnswer(inv -> {
            SpiritImage img = inv.getArgument(0);
            ReflectionTestUtils.setField(img, "id", 11L);
            return img;
        });

        SpiritImageResponse result = spiritImageService.uploadImage(1L, file);

        assertThat(result.imageUrl()).endsWith(".png");
    }

    @Test
    @DisplayName("허용되지 않는 파일 형식 - GIF")
    void uploadImage_gif_throwsException() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "test.gif", "image/gif", new byte[512]);

        given(spiritRepository.findById(1L)).willReturn(Optional.of(spirit));

        assertThatThrownBy(() -> spiritImageService.uploadImage(1L, file))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INVALID_IMAGE_FORMAT);
    }

    @Test
    @DisplayName("Content-Type 없는 파일")
    void uploadImage_noContentType_throwsException() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "test.jpg", null, new byte[512]);

        given(spiritRepository.findById(1L)).willReturn(Optional.of(spirit));

        assertThatThrownBy(() -> spiritImageService.uploadImage(1L, file))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INVALID_IMAGE_FORMAT);
    }

    @Test
    @DisplayName("10MB 초과 파일 - 크기 초과 예외")
    void uploadImage_tooLarge_throwsException() {
        byte[] largeContent = new byte[11 * 1024 * 1024]; // 11MB
        MockMultipartFile file = new MockMultipartFile(
                "file", "big.jpg", "image/jpeg", largeContent);

        given(spiritRepository.findById(1L)).willReturn(Optional.of(spirit));

        assertThatThrownBy(() -> spiritImageService.uploadImage(1L, file))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.IMAGE_SIZE_EXCEEDED);
    }

    @Test
    @DisplayName("존재하지 않는 Spirit ID - 예외")
    void uploadImage_spiritNotFound_throwsException() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "test.jpg", "image/jpeg", new byte[512]);

        given(spiritRepository.findById(99L)).willReturn(Optional.empty());

        assertThatThrownBy(() -> spiritImageService.uploadImage(99L, file))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.SPIRIT_NOT_FOUND);
    }

    @Test
    @DisplayName("이미지 삭제")
    void deleteImage_success() {
        SpiritImage image = SpiritImage.builder()
                .spirit(spirit)
                .imageUrl("/uploads/spirits/1/test.jpg")
                .isPrimary(false)
                .sortOrder(0)
                .build();
        ReflectionTestUtils.setField(image, "id", 10L);

        given(spiritImageRepository.findByIdAndSpiritId(10L, 1L)).willReturn(Optional.of(image));

        spiritImageService.deleteImage(1L, 10L);

        verify(spiritImageRepository).delete(image);
    }

    @Test
    @DisplayName("이미지 삭제 - 이미지 없음 예외")
    void deleteImage_notFound_throwsException() {
        given(spiritImageRepository.findByIdAndSpiritId(99L, 1L)).willReturn(Optional.empty());

        assertThatThrownBy(() -> spiritImageService.deleteImage(1L, 99L))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.SPIRIT_IMAGE_NOT_FOUND);
    }

    @Test
    @DisplayName("대표 이미지 설정 - 기존 대표 이미지 해제 후 새 이미지 설정")
    void setPrimaryImage_success() {
        SpiritImage oldPrimary = SpiritImage.builder()
                .spirit(spirit)
                .imageUrl("/uploads/spirits/1/old.jpg")
                .isPrimary(true)
                .sortOrder(0)
                .build();
        ReflectionTestUtils.setField(oldPrimary, "id", 10L);

        SpiritImage newPrimary = SpiritImage.builder()
                .spirit(spirit)
                .imageUrl("/uploads/spirits/1/new.jpg")
                .isPrimary(false)
                .sortOrder(1)
                .build();
        ReflectionTestUtils.setField(newPrimary, "id", 11L);

        given(spiritRepository.existsById(1L)).willReturn(true);
        given(spiritImageRepository.findByIdAndSpiritId(11L, 1L)).willReturn(Optional.of(newPrimary));
        given(spiritImageRepository.findBySpiritIdAndIsPrimaryTrue(1L)).willReturn(Optional.of(oldPrimary));

        SpiritImageResponse result = spiritImageService.setPrimaryImage(1L, 11L);

        assertThat(oldPrimary.getIsPrimary()).isFalse();
        assertThat(newPrimary.getIsPrimary()).isTrue();
        assertThat(result.id()).isEqualTo(11L);
    }
}

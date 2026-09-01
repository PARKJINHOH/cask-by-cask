package com.caskbycask.domain.spirit.service;

import com.caskbycask.domain.community.service.NotificationService;
import com.caskbycask.domain.producer.repository.ProducerRepository;
import com.caskbycask.domain.score.service.ScoreService;
import com.caskbycask.domain.spirit.dto.SpiritImageResponse;
import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.spirit.entity.SpiritImage;
import com.caskbycask.domain.spirit.entity.SpiritImageVariant;
import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import com.caskbycask.domain.spirit.entity.enums.SpiritStatus;
import com.caskbycask.domain.spirit.entity.enums.VariantType;
import com.caskbycask.domain.spirit.repository.SpiritImageRepository;
import com.caskbycask.domain.spirit.repository.SpiritImageVariantRepository;
import com.caskbycask.domain.spirit.repository.SpiritRegisterRequestRepository;
import com.caskbycask.domain.spirit.repository.SpiritRepository;
import com.caskbycask.domain.spirit.repository.SpiritVariantLinkRepository;
import com.caskbycask.domain.translation.service.TranslationCacheInvalidator;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.domain.user.entity.enums.Role;
import com.caskbycask.domain.user.repository.UserRepository;
import com.caskbycask.global.email.EmailSender;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import com.caskbycask.global.util.BadWordFilter;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

/**
 * 이미지 ↔ 에디션 지정 교체 API.
 *
 * <p>같은 라벨 디자인을 쓰는 배치들이 같은 파일을 중복 업로드하지 않도록,
 * 이미지 1장에 여러 에디션을 붙이는 것이 이 기능의 목적이다.
 */
@ExtendWith(MockitoExtension.class)
class SpiritImageVariantAssignTest {

    private static final Long ADMIN_ID = 100L;

    @Mock private SpiritRepository spiritRepository;
    @Mock private SpiritImageRepository spiritImageRepository;
    @Mock private SpiritImageVariantRepository spiritImageVariantRepository;
    @Mock private SpiritVariantLinkRepository variantLinkRepository;
    @Mock private SpiritRegisterRequestRepository registerRequestRepository;
    @Mock private ProducerRepository producerRepository;
    @Mock private UserRepository userRepository;
    @Mock private ObjectMapper objectMapper;
    @Mock private SpiritDetailService spiritDetailService;
    @Mock private SpiritImageService spiritImageService;
    @Mock private ScoreService scoreService;
    @Mock private NotificationService notificationService;
    @Mock private BadWordFilter badWordFilter;
    @Mock private SpiritSearchService spiritSearchService;
    @Mock private EmailSender emailSender;
    @Mock private TranslationCacheInvalidator translationCacheInvalidator;

    @InjectMocks private SpiritService spiritService;

    @Captor private ArgumentCaptor<List<SpiritImageVariant>> savedCaptor;

    @Test
    @DisplayName("에디션 여러 개를 한 이미지에 지정한다")
    void assignsSeveralEditionsToOneImage() {
        Spirit master = whisky(1L);
        Spirit editionA = edition(2L, master, "배치 11", "Batch 11", 0);
        Spirit editionB = edition(3L, master, "배치 12", "Batch 12", 1);
        SpiritImage image = image(10L, master);

        givenGroup(master, image, editionA, editionB);
        givenStoredAssignments(SpiritImageVariant.of(10L, 2L), SpiritImageVariant.of(10L, 3L));

        SpiritImageResponse response = spiritService.assignSpiritImageVariantsForManager(
                1L, 10L, List.of(2L, 3L), ADMIN_ID);

        verify(spiritImageVariantRepository).deleteBySpiritImageId(10L);
        verify(spiritImageVariantRepository).saveAll(savedCaptor.capture());
        assertThat(savedCaptor.getValue())
                .extracting(SpiritImageVariant::getSpiritId)
                .containsExactly(2L, 3L);
        assertThat(response.variants())
                .extracting(SpiritImageResponse.VariantRef::spiritId)
                .containsExactly(2L, 3L);
    }

    @Test
    @DisplayName("빈 목록이면 전체 해제 — 삽입 없이 링크만 지운다")
    void emptyListClearsAssignments() {
        Spirit master = whisky(1L);
        Spirit editionA = edition(2L, master, "배치 11", "Batch 11", 0);
        SpiritImage image = image(10L, master);

        givenGroup(master, image, editionA);

        SpiritImageResponse response = spiritService.assignSpiritImageVariantsForManager(
                1L, 10L, List.of(), ADMIN_ID);

        verify(spiritImageVariantRepository).deleteBySpiritImageId(10L);
        verify(spiritImageVariantRepository, never()).saveAll(any());
        assertThat(response.variants()).isEmpty();
    }

    @Test
    @DisplayName("null 이 와도 전체 해제로 다룬다")
    void nullListIsTreatedAsClear() {
        Spirit master = whisky(1L);
        SpiritImage image = image(10L, master);

        givenGroup(master, image);

        spiritService.assignSpiritImageVariantsForManager(1L, 10L, null, ADMIN_ID);

        verify(spiritImageVariantRepository).deleteBySpiritImageId(10L);
        verify(spiritImageVariantRepository, never()).saveAll(any());
    }

    @Test
    @DisplayName("같은 에디션이 중복으로 와도 한 번만 저장한다")
    void duplicateVariantIdsAreCollapsed() {
        Spirit master = whisky(1L);
        Spirit editionA = edition(2L, master, "배치 11", "Batch 11", 0);
        SpiritImage image = image(10L, master);

        givenGroup(master, image, editionA);

        spiritService.assignSpiritImageVariantsForManager(1L, 10L, List.of(2L, 2L, 2L), ADMIN_ID);

        verify(spiritImageVariantRepository).saveAll(savedCaptor.capture());
        assertThat(savedCaptor.getValue()).hasSize(1);
    }

    @Test
    @DisplayName("다른 그룹의 에디션 ID 는 거부한다")
    void rejectsVariantFromAnotherGroup() {
        Spirit master = whisky(1L);
        Spirit editionA = edition(2L, master, "배치 11", "Batch 11", 0);
        SpiritImage image = image(10L, master);

        givenGroup(master, image, editionA);

        assertThatThrownBy(() -> spiritService.assignSpiritImageVariantsForManager(
                1L, 10L, List.of(2L, 999L), ADMIN_ID))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INVALID_INPUT);

        verify(spiritImageVariantRepository, never()).deleteBySpiritImageId(any());
        verify(spiritImageVariantRepository, never()).saveAll(any());
    }

    @Test
    @DisplayName("그 주류의 이미지가 아니면 거부한다")
    void rejectsImageOfAnotherSpirit() {
        Spirit master = whisky(1L);
        givenManager();
        given(spiritRepository.findById(1L)).willReturn(Optional.of(master));
        given(spiritImageRepository.findByIdAndSpiritId(999L, 1L)).willReturn(Optional.empty());
        // 이미지 소유 검증에서 먼저 걸리므로 에디션 목록은 조회되지 않는다.

        assertThatThrownBy(() -> spiritService.assignSpiritImageVariantsForManager(
                1L, 999L, List.of(), ADMIN_ID))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.SPIRIT_IMAGE_NOT_FOUND);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private void givenGroup(Spirit master, SpiritImage image, Spirit... editions) {
        givenManager();
        given(spiritRepository.findById(master.getId())).willReturn(Optional.of(master));
        given(spiritImageRepository.findByIdAndSpiritId(image.getId(), master.getId()))
                .willReturn(Optional.of(image));
        given(spiritRepository.findByParentId(master.getId())).willReturn(List.of(editions));
        // 응답을 만들 때 다시 읽는 지정 목록 — 저장 직후 상태를 흉내 낸다.
        lenient().when(spiritImageVariantRepository.findBySpiritImageIdIn(any()))
                .thenReturn(List.of());
    }

    /** 저장 직후 다시 읽는 지정 목록 — 응답의 variants 가 여기서 나온다. */
    private void givenStoredAssignments(SpiritImageVariant... links) {
        lenient().when(spiritImageVariantRepository.findBySpiritImageIdIn(any()))
                .thenReturn(List.of(links));
    }

    private void givenManager() {
        User admin = User.builder()
                .email("admin@example.com").nickname("admin").role(Role.ADMIN)
                .build();
        ReflectionTestUtils.setField(admin, "id", ADMIN_ID);
        given(userRepository.getByIdOrThrow(ADMIN_ID)).willReturn(admin);
    }

    private Spirit whisky(Long id) {
        Spirit spirit = Spirit.builder()
                .nameKo("아드벡 우가달").nameEn("Ardbeg Uigeadail")
                .category(SpiritCategory.WHISKY)
                .status(SpiritStatus.ACTIVE)
                .build();
        ReflectionTestUtils.setField(spirit, "id", id);
        return spirit;
    }

    private Spirit edition(Long id, Spirit master, String value, String valueEn, int displayOrder) {
        Spirit spirit = whisky(id);
        ReflectionTestUtils.setField(spirit, "parent", master);
        ReflectionTestUtils.setField(spirit, "variantType", VariantType.BATCH);
        ReflectionTestUtils.setField(spirit, "variantValue", value);
        ReflectionTestUtils.setField(spirit, "variantValueEn", valueEn);
        ReflectionTestUtils.setField(spirit, "displayOrder", displayOrder);
        return spirit;
    }

    private SpiritImage image(Long id, Spirit owner) {
        SpiritImage image = SpiritImage.builder()
                .spirit(owner).imageUrl("/m.webp").isPrimary(true).sortOrder(0).build();
        ReflectionTestUtils.setField(image, "id", id);
        return image;
    }
}

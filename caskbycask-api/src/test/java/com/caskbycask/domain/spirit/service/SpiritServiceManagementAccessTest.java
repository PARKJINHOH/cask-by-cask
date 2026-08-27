package com.caskbycask.domain.spirit.service;

import com.caskbycask.domain.community.service.NotificationService;
import com.caskbycask.domain.producer.entity.Producer;
import com.caskbycask.domain.producer.repository.ProducerRepository;
import com.caskbycask.domain.score.service.ScoreService;
import com.caskbycask.domain.spirit.dto.SpiritSearchCondition;
import com.caskbycask.domain.spirit.dto.SpiritVariantResponse;
import com.caskbycask.domain.spirit.dto.UpdateSpiritRequest;
import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import com.caskbycask.domain.spirit.repository.SpiritImageRepository;
import com.caskbycask.domain.spirit.repository.SpiritRegisterRequestRepository;
import com.caskbycask.domain.spirit.repository.SpiritRepository;
import com.caskbycask.domain.spirit.repository.SpiritVariantLinkRepository;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.domain.user.entity.enums.Role;
import com.caskbycask.domain.user.repository.UserRepository;
import com.caskbycask.domain.translation.service.TranslationCacheInvalidator;
import com.caskbycask.global.email.EmailSender;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import com.caskbycask.global.util.BadWordFilter;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Set;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(MockitoExtension.class)
class SpiritServiceManagementAccessTest {

    @Mock private SpiritRepository spiritRepository;
    @Mock private SpiritImageRepository spiritImageRepository;
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

    private Producer assignedProducer;
    private Producer otherProducer;

    @BeforeEach
    void setUp() {
        assignedProducer = producer(10L, "Assigned");
        otherProducer = producer(20L, "Other");
    }

    @Test
    void partnerListIsAlwaysScopedToAssignedProducer() {
        User partner = producerManager(1L, Role.PARTNER, assignedProducer, true);
        given(userRepository.getByIdOrThrow(1L)).willReturn(partner);
        PageRequest pageable = PageRequest.of(0, 20);
        given(spiritRepository.searchForAdmin(any(SpiritSearchCondition.class), any()))
                .willReturn(Page.empty(pageable));

        spiritService.searchSpiritsForManager(condition(null), pageable, 1L);

        ArgumentCaptor<SpiritSearchCondition> captor = ArgumentCaptor.forClass(SpiritSearchCondition.class);
        verify(spiritRepository).searchForAdmin(captor.capture(), any());
        assertThat(captor.getValue().producerId()).isEqualTo(assignedProducer.getId());
    }

    @Test
    void partnerCannotRequestAnotherProducerInListFilter() {
        User partner = producerManager(1L, Role.PARTNER, assignedProducer, true);
        given(userRepository.getByIdOrThrow(1L)).willReturn(partner);

        assertThatThrownBy(() -> spiritService.searchSpiritsForManager(
                condition(otherProducer.getId()), PageRequest.of(0, 20), 1L))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.SPIRIT_ACCESS_DENIED);
    }

    @Test
    void partnerCanAccessOnlyItsAssignedProducer() {
        User partner = producerManager(2L, Role.PARTNER, assignedProducer, true);
        Spirit assignedSpirit = spirit(100L, assignedProducer);
        Spirit otherSpirit = spirit(200L, otherProducer);
        given(userRepository.getByIdOrThrow(2L)).willReturn(partner);
        given(spiritRepository.findById(100L)).willReturn(java.util.Optional.of(assignedSpirit));
        given(spiritRepository.findById(200L)).willReturn(java.util.Optional.of(otherSpirit));

        assertThatCode(() -> spiritService.assertSpiritManagementAccess(100L, 2L))
                .doesNotThrowAnyException();
        assertThatThrownBy(() -> spiritService.assertSpiritManagementAccess(200L, 2L))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.SPIRIT_ACCESS_DENIED);
    }

    @Test
    void producerRoleWithoutSpiritMenuIsDenied() {
        User partner = producerManager(3L, Role.PARTNER, assignedProducer, false);
        given(userRepository.getByIdOrThrow(3L)).willReturn(partner);

        assertThatThrownBy(() -> spiritService.assertSpiritManagementAccess(100L, 3L))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.SPIRIT_ACCESS_DENIED);
    }

    @Test
    void importerIsDeniedBecauseNoOwnershipModelExists() {
        User importer = producerManager(4L, Role.IMPORTER, null, true);
        given(userRepository.getByIdOrThrow(4L)).willReturn(importer);

        assertThatThrownBy(() -> spiritService.assertSpiritManagementAccess(100L, 4L))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.SPIRIT_ACCESS_DENIED);
    }

    @Test
    void partnerCannotLinkSpiritOwnedByAnotherProducer() {
        User partner = producerManager(5L, Role.PARTNER, assignedProducer, true);
        given(userRepository.getByIdOrThrow(5L)).willReturn(partner);
        given(spiritRepository.findById(100L)).willReturn(java.util.Optional.of(spirit(100L, assignedProducer)));
        given(spiritRepository.findById(200L)).willReturn(java.util.Optional.of(spirit(200L, otherProducer)));

        assertThatThrownBy(() -> spiritService.addVariantLink(100L, 200L, 5L))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.SPIRIT_ACCESS_DENIED);
        verifyNoInteractions(variantLinkRepository);
    }

    @Test
    void adminIsNotProducerScoped() {
        User admin = producerManager(6L, Role.ADMIN, null, false);
        given(userRepository.getByIdOrThrow(6L)).willReturn(admin);
        given(spiritRepository.findById(200L)).willReturn(java.util.Optional.of(spirit(200L, otherProducer)));

        assertThatCode(() -> spiritService.assertSpiritManagementAccess(200L, 6L))
                .doesNotThrowAnyException();
    }

    @Test
    @SuppressWarnings({"rawtypes", "unchecked"})
    void partnerDetailExcludesVariantsOwnedByAnotherProducer() {
        User partner = producerManager(7L, Role.PARTNER, assignedProducer, true);
        Spirit master = spirit(100L, assignedProducer);
        Spirit assignedVariant = spirit(101L, assignedProducer);
        Spirit otherVariant = spirit(201L, otherProducer);
        given(userRepository.getByIdOrThrow(7L)).willReturn(partner);
        given(spiritRepository.findByIdWithAllDetails(100L, null))
                .willReturn(java.util.Optional.of(master));
        given(spiritRepository.findByParentId(100L))
                .willReturn(List.of(assignedVariant, otherVariant));
        given(spiritImageRepository.findBySpiritIdOrderBySortOrderAscIdAsc(100L))
                .willReturn(List.of());
        given(spiritImageRepository.findBySpiritIdInAndIsPrimaryTrue(anyList()))
                .willReturn(List.of());

        spiritService.getSpiritDetailForManager(100L, 7L);

        ArgumentCaptor<List> variantsCaptor = ArgumentCaptor.forClass(List.class);
        verify(spiritDetailService).buildFullDetailResponse(eq(master), anyList(), variantsCaptor.capture());
        assertThat((List<SpiritVariantResponse>) variantsCaptor.getValue())
                .extracting(SpiritVariantResponse::id)
                .containsExactly(101L);
    }

    @Test
    void partnerCannotUpdateMasterContainingAnotherProducersChild() {
        User partner = producerManager(8L, Role.PARTNER, assignedProducer, true);
        Spirit master = spirit(100L, assignedProducer);
        Spirit otherVariant = spirit(201L, otherProducer);
        given(userRepository.getByIdOrThrow(8L)).willReturn(partner);
        given(spiritRepository.findById(100L)).willReturn(java.util.Optional.of(master));
        given(spiritRepository.findByParentId(100L)).willReturn(List.of(otherVariant));

        assertThatThrownBy(() -> spiritService.updateSpirit(100L, emptyUpdateRequest(), 8L))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.SPIRIT_ACCESS_DENIED);
        verifyNoInteractions(spiritDetailService);
    }

    @Test
    void imageMutationChecksOwnershipInsideManagementService() {
        User partner = producerManager(9L, Role.PARTNER, assignedProducer, true);
        given(userRepository.getByIdOrThrow(9L)).willReturn(partner);
        given(spiritRepository.findById(200L))
                .willReturn(java.util.Optional.of(spirit(200L, otherProducer)));

        assertThatThrownBy(() -> spiritService.uploadSpiritImageForManager(
                200L, mock(org.springframework.web.multipart.MultipartFile.class), 9L))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.SPIRIT_ACCESS_DENIED);
        verifyNoInteractions(spiritImageService);
    }

    @Test
    void hidingSpiritInvalidatesItsPermanentTranslationCache() {
        Spirit spirit = spirit(300L, assignedProducer);
        given(spiritRepository.findById(300L)).willReturn(java.util.Optional.of(spirit));

        spiritService.deleteSpirit(300L);

        verify(translationCacheInvalidator).invalidateSpirit(300L);
    }

    private SpiritSearchCondition condition(Long producerId) {
        return new SpiritSearchCondition(
                null, null, null, null, null, null, null, producerId,
                null, null, null, null, null, null, null, null, null, null);
    }

    private UpdateSpiritRequest emptyUpdateRequest() {
        return new UpdateSpiritRequest(
                null, null, null, null, null, null, null, null, null,
                null, null, null, null, null, null, null, null, null,
                null, null, null, null, null, null, null, null);
    }

    private Producer producer(Long id, String name) {
        Producer producer = Producer.builder()
                .nameKo(name)
                .nameEn(name)
                .country("KR")
                .build();
        ReflectionTestUtils.setField(producer, "id", id);
        return producer;
    }

    private Spirit spirit(Long id, Producer producer) {
        Spirit spirit = Spirit.builder()
                .nameKo("Spirit " + id)
                .nameEn("Spirit " + id)
                .category(SpiritCategory.WHISKY)
                .producer(producer)
                .build();
        ReflectionTestUtils.setField(spirit, "id", id);
        return spirit;
    }

    private User producerManager(Long id, Role role, Producer producer, boolean allowSpiritMenu) {
        User user = User.builder()
                .email("manager" + id + "@example.com")
                .nickname("manager" + id)
                .role(role)
                .producer(producer)
                .allowedMenus(allowSpiritMenu ? Set.of("/admin/spirits") : Set.of())
                .build();
        ReflectionTestUtils.setField(user, "id", id);
        return user;
    }
}

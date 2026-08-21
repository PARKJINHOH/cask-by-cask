package com.caskbycask.domain.spirit.service;

import com.caskbycask.domain.community.service.NotificationService;
import com.caskbycask.domain.producer.repository.ProducerRepository;
import com.caskbycask.domain.score.service.ScoreService;
import com.caskbycask.domain.spirit.dto.CreateVariantRequest;
import com.caskbycask.domain.spirit.dto.UpdateSpiritRequest;
import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import com.caskbycask.domain.spirit.entity.enums.SpiritStatus;
import com.caskbycask.domain.spirit.entity.enums.VariantType;
import com.caskbycask.domain.spirit.repository.SpiritImageRepository;
import com.caskbycask.domain.spirit.repository.SpiritRegisterRequestRepository;
import com.caskbycask.domain.spirit.repository.SpiritRepository;
import com.caskbycask.domain.spirit.repository.SpiritVariantLinkRepository;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.domain.user.entity.enums.Role;
import com.caskbycask.domain.user.repository.UserRepository;
import com.caskbycask.global.email.EmailSender;
import com.caskbycask.global.util.BadWordFilter;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.quality.Strictness;
import org.mockito.junit.jupiter.MockitoSettings;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class SpiritServiceVariantUpdateTest {

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
    @Spy private WineRegionService wineRegionService = new WineRegionService();

    @InjectMocks private SpiritService spiritService;

    @BeforeEach
    void setUp() {
        User admin = User.builder().role(Role.ADMIN).build();
        ReflectionTestUtils.setField(admin, "id", 1L);
        given(userRepository.getByIdOrThrow(1L)).willReturn(admin);
    }

    @Test
    @DisplayName("에디션 이름을 바꿔도 ID로 같은 행을 수정해 기존 리뷰 연결을 보존한다")
    void updateVariantName_preservesExistingVariantIdentity() {
        Spirit master = spirit(10L, null, null);
        Spirit variant = spirit(20L, master, "기존 배치명");
        given(spiritRepository.findById(10L)).willReturn(Optional.of(master));
        given(spiritRepository.findByParentId(10L)).willReturn(List.of(variant));
        given(spiritImageRepository.findBySpiritIdOrderBySortOrderAscIdAsc(10L)).willReturn(List.of());

        spiritService.updateSpirit(10L, updateRequest(new CreateVariantRequest(
                20L,
                VariantType.BATCH,
                "변경된 배치명",
                "Renamed Batch",
                "배치",
                "Batch",
                new BigDecimal("46.0"),
                null,
                null,
                700,
                null,
                null,
                null,
                null,
                null,
                null
        )), 1L);

        assertThat(variant.getId()).isEqualTo(20L);
        assertThat(variant.getParent()).isSameAs(master);
        assertThat(variant.getStatus()).isEqualTo(SpiritStatus.ACTIVE);
        assertThat(variant.getVariantValue()).isEqualTo("변경된 배치명");
        assertThat(variant.getVariantValueEn()).isEqualTo("Renamed Batch");
        verify(spiritRepository, never()).save(any(Spirit.class));
    }

    private Spirit spirit(Long id, Spirit parent, String variantValue) {
        Spirit spirit = Spirit.builder()
                .nameKo("테스트 위스키")
                .nameEn("Test Whisky")
                .category(SpiritCategory.WHISKY)
                .country("스코틀랜드")
                .region("스페이사이드")
                .status(SpiritStatus.ACTIVE)
                .parent(parent)
                .variantType(VariantType.BATCH)
                .variantValue(variantValue)
                .seriesIdentifier("배치")
                .seriesIdentifierEn("Batch")
                .build();
        ReflectionTestUtils.setField(spirit, "id", id);
        return spirit;
    }

    private UpdateSpiritRequest updateRequest(CreateVariantRequest variant) {
        return new UpdateSpiritRequest(
                null, null, null, null, null, null, null, null, null, null,
                null, null, null, null, null,
                true, List.of(variant), VariantType.BATCH, null, null, "배치", "Batch",
                null, null, null, null
        );
    }
}

package com.caskbycask.domain.spirit.service;

import com.caskbycask.domain.community.service.NotificationService;
import com.caskbycask.domain.producer.repository.ProducerRepository;
import com.caskbycask.domain.score.service.ScoreService;
import com.caskbycask.domain.spirit.dto.SpiritVariantResponse;
import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import com.caskbycask.domain.spirit.entity.enums.SpiritStatus;
import com.caskbycask.domain.spirit.entity.enums.VariantType;
import com.caskbycask.domain.spirit.repository.SpiritImageRepository;
import com.caskbycask.domain.spirit.repository.SpiritRegisterRequestRepository;
import com.caskbycask.domain.spirit.repository.SpiritRepository;
import com.caskbycask.domain.spirit.repository.SpiritVariantLinkRepository;
import com.caskbycask.domain.user.repository.UserRepository;
import com.caskbycask.global.email.EmailSender;
import com.caskbycask.global.util.BadWordFilter;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class SpiritServiceVariantResolutionTest {

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

    @InjectMocks private SpiritService spiritService;

    @Test
    @DisplayName("동일 이름의 독립 주류는 하위 에디션으로 자동 연결하지 않는다")
    void sameNameRootSpiritsAreNotAutoVariants() {
        Spirit regular = spirit(1L, "레드 브레스트 12년", "Redbreast 12", SpiritStatus.ACTIVE);
        Spirit caskStrength = spirit(2L, "레드 브레스트 12년", "Redbreast 12", SpiritStatus.ACTIVE);
        ReflectionTestUtils.setField(caskStrength, "seriesIdentifier", "캐스크 스트렝스");
        ReflectionTestUtils.setField(caskStrength, "variantType", VariantType.BATCH);

        given(spiritRepository.findByIdAndStatus(1L, SpiritStatus.ACTIVE))
                .willReturn(Optional.of(regular));
        given(spiritRepository.findByParentId(1L)).willReturn(List.of());
        given(variantLinkRepository.findAllInvolving(1L)).willReturn(List.of());
        lenient().when(spiritRepository.findActiveVariantsByName(anyLong(), anyString(), anyString()))
                .thenReturn(List.of(caskStrength));

        List<SpiritVariantResponse> variants = spiritService.getSpiritVariants(1L);

        assertThat(variants).isEmpty();
        verify(spiritRepository, never()).findActiveVariantsByName(anyLong(), anyString(), anyString());
    }

    @Test
    @DisplayName("parent_id로 연결된 하위 에디션은 기존처럼 반환한다")
    void parentVariantsRemainAvailable() {
        Spirit master = spirit(1L, "레드 브레스트 12년", "Redbreast 12", SpiritStatus.ACTIVE);
        Spirit variant = spirit(2L, "레드 브레스트 12년", "Redbreast 12", SpiritStatus.ACTIVE);
        ReflectionTestUtils.setField(variant, "parent", master);
        ReflectionTestUtils.setField(variant, "seriesIdentifier", "캐스크 스트렝스");
        ReflectionTestUtils.setField(variant, "variantType", VariantType.BATCH);
        ReflectionTestUtils.setField(variant, "variantValue", "Batch 1");

        given(spiritRepository.findByIdAndStatus(1L, SpiritStatus.ACTIVE))
                .willReturn(Optional.of(master));
        given(spiritRepository.findByParentId(1L)).willReturn(List.of(variant));
        given(spiritImageRepository.findBySpiritIdInAndIsPrimaryTrue(anyList()))
                .willReturn(List.of());

        List<SpiritVariantResponse> variants = spiritService.getSpiritVariants(1L);

        assertThat(variants).extracting(SpiritVariantResponse::id).containsExactly(2L);
        assertThat(variants.get(0).seriesIdentifier()).isEqualTo("캐스크 스트렝스");
        verify(variantLinkRepository, never()).findAllInvolving(anyLong());
        verify(spiritRepository, never()).findActiveVariantsByName(anyLong(), anyString(), anyString());
    }

    private Spirit spirit(Long id, String nameKo, String nameEn, SpiritStatus status) {
        Spirit spirit = Spirit.builder()
                .nameKo(nameKo)
                .nameEn(nameEn)
                .category(SpiritCategory.WHISKY)
                .status(status)
                .build();
        ReflectionTestUtils.setField(spirit, "id", id);
        return spirit;
    }
}

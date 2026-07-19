package com.caskbycask.domain.seo.service;

import com.caskbycask.domain.seo.dto.SpiritSeoResponse;
import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import com.caskbycask.domain.spirit.entity.enums.SpiritStatus;
import com.caskbycask.domain.spirit.entity.enums.VariantType;
import com.caskbycask.domain.spirit.repository.SpiritImageRepository;
import com.caskbycask.domain.spirit.repository.SpiritRepository;
import com.caskbycask.global.exception.CustomException;
import org.junit.jupiter.api.BeforeEach;
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
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SpiritSeoServiceTest {

    @Mock
    private SpiritRepository spiritRepository;

    @Mock
    private SpiritImageRepository spiritImageRepository;

    @InjectMocks
    private SpiritSeoService spiritSeoService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(spiritSeoService, "siteUrl", "https://www.caskbycask.net");
    }

    @Test
    @DisplayName("split parent 요청은 첫 ACTIVE variant를 canonical로 반환한다")
    void parent_resolves_to_default_variant_canonical() {
        Spirit parent = Spirit.builder()
                .nameKo("더 글렌드로낙")
                .nameEn("The Glendronach")
                .category(SpiritCategory.WHISKY)
                .status(SpiritStatus.ACTIVE)
                .build();
        ReflectionTestUtils.setField(parent, "id", 1L);

        Spirit child = Spirit.builder()
                .nameKo("더 글렌드로낙")
                .nameEn("The Glendronach")
                .category(SpiritCategory.WHISKY)
                .status(SpiritStatus.ACTIVE)
                .parent(parent)
                .variantType(VariantType.BATCH)
                .seriesIdentifier("올로로소 12년 1L")
                .seriesIdentifierEn("Oloroso 12 Year Old 1L")
                .variantValue("스페셜 릴리즈")
                .variantValueEn("Special Release")
                .build();
        ReflectionTestUtils.setField(child, "id", 2L);

        when(spiritRepository.findByIdWithAllDetails(1L, SpiritStatus.ACTIVE)).thenReturn(Optional.of(parent));
        when(spiritRepository.findByParentId(1L)).thenReturn(List.of(child));
        when(spiritRepository.findByIdWithAllDetails(2L, SpiritStatus.ACTIVE)).thenReturn(Optional.of(child));
        when(spiritImageRepository.findBySpiritIdAndIsPrimaryTrue(2L)).thenReturn(Optional.empty());
        when(spiritImageRepository.findBySpiritIdOrderBySortOrderAscIdAsc(2L)).thenReturn(List.of());
        when(spiritImageRepository.findBySpiritIdAndIsPrimaryTrue(1L)).thenReturn(Optional.empty());
        when(spiritImageRepository.findBySpiritIdOrderBySortOrderAscIdAsc(1L)).thenReturn(List.of());

        SpiritSeoResponse response = spiritSeoService.getSpiritSeo(1L);

        assertThat(response.canonicalId()).isEqualTo(2L);
        assertThat(response.canonicalPathKo())
                .isEqualTo("/ko/spirits/2-더-글렌드로낙-올로로소-12년-1l-스페셜-릴리즈");
        assertThat(response.canonicalPathEn())
                .isEqualTo("/en/spirits/2-the-glendronach-oloroso-12-year-old-1l-special-release");
    }

    @Test
    @DisplayName("존재하지 않는 주류는 예외를 던진다")
    void missing_spirit_throws() {
        when(spiritRepository.findByIdWithAllDetails(999L, SpiritStatus.ACTIVE)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> spiritSeoService.getSpiritSeo(999L))
                .isInstanceOf(CustomException.class);
    }
}

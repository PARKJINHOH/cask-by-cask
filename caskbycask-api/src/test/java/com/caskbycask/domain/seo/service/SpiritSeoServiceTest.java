package com.caskbycask.domain.seo.service;

import com.caskbycask.domain.deal.entity.DealPost;
import com.caskbycask.domain.deal.entity.enums.DealStatus;
import com.caskbycask.domain.deal.repository.DealPostRepository;
import com.caskbycask.domain.pricetracker.entity.PriceReport;
import com.caskbycask.domain.pricetracker.entity.enums.PriceCurrency;
import com.caskbycask.domain.pricetracker.entity.enums.PriceReportStatus;
import com.caskbycask.domain.pricetracker.repository.PriceReportRepository;
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

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SpiritSeoServiceTest {

    @Mock
    private SpiritRepository spiritRepository;

    @Mock
    private SpiritImageRepository spiritImageRepository;

    @Mock
    private PriceReportRepository priceReportRepository;

    @Mock
    private DealPostRepository dealPostRepository;

    @InjectMocks
    private SpiritSeoService spiritSeoService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(spiritSeoService, "siteUrl", "https://www.caskbycask.net");
        lenient().when(priceReportRepository.findRecentApprovedForSeo(anyCollection(), any(), any()))
                .thenReturn(List.of());
        lenient().when(dealPostRepository.findRecentVisibleForSeo(anyCollection(), any(), any()))
                .thenReturn(List.of());
    }

    @Test
    @DisplayName("split parent 요청은 정규 주류 자신을 canonical로 반환하고 에디션을 연결한다")
    void parent_keeps_self_canonical_and_links_editions() {
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
        when(spiritImageRepository.findBySpiritIdAndIsPrimaryTrue(1L)).thenReturn(Optional.empty());
        when(spiritImageRepository.findBySpiritIdOrderBySortOrderAscIdAsc(1L)).thenReturn(List.of());

        SpiritSeoResponse response = spiritSeoService.getSpiritSeo(1L);

        assertThat(response.canonicalId()).isEqualTo(1L);
        assertThat(response.canonicalPathKo())
                .isEqualTo("/ko/spirits/1-더-글렌드로낙");
        assertThat(response.canonicalPathEn())
                .isEqualTo("/en/spirits/1-the-glendronach");
        assertThat(response.relationType()).isEqualTo("MASTER");
        assertThat(response.parent()).isNull();
        assertThat(response.editions()).extracting(SpiritSeoResponse.RelatedSpirit::id).containsExactly(2L);
        assertThat(response.recentPrice()).isNull();
        assertThat(response.recentHotDeal()).isNull();
    }

    @Test
    @DisplayName("에디션 요청은 자신을 canonical로 유지하고 정규 주류와 형제 에디션을 연결한다")
    void edition_keeps_self_canonical_and_links_family() {
        Spirit parent = Spirit.builder()
                .nameKo("탐두")
                .nameEn("Tamdhu")
                .category(SpiritCategory.WHISKY)
                .status(SpiritStatus.ACTIVE)
                .variantType(VariantType.NONE)
                .build();
        ReflectionTestUtils.setField(parent, "id", 295L);

        Spirit edition = edition(parent, 296L, "2025년 에디션", "2025 Edition");
        Spirit sibling = edition(parent, 309L, "2026년 말띠 에디션", "Year of the Horse 2026");

        when(spiritRepository.findByIdWithAllDetails(296L, SpiritStatus.ACTIVE))
                .thenReturn(Optional.of(edition));
        when(spiritRepository.findByParentId(295L)).thenReturn(List.of(edition, sibling));
        when(spiritImageRepository.findBySpiritIdAndIsPrimaryTrue(296L)).thenReturn(Optional.empty());
        when(spiritImageRepository.findBySpiritIdOrderBySortOrderAscIdAsc(296L)).thenReturn(List.of());
        when(spiritImageRepository.findBySpiritIdAndIsPrimaryTrue(295L)).thenReturn(Optional.empty());
        when(spiritImageRepository.findBySpiritIdOrderBySortOrderAscIdAsc(295L)).thenReturn(List.of());

        SpiritSeoResponse response = spiritSeoService.getSpiritSeo(296L);

        assertThat(response.canonicalId()).isEqualTo(296L);
        assertThat(response.canonicalPathKo()).isEqualTo("/ko/spirits/296-탐두-2025년-에디션");
        assertThat(response.relationType()).isEqualTo("EDITION");
        assertThat(response.parent().id()).isEqualTo(295L);
        assertThat(response.editions()).extracting(SpiritSeoResponse.RelatedSpirit::id)
                .containsExactly(296L, 309L);
    }

    @Test
    @DisplayName("승인된 최근 가격과 공개 핫딜은 판매 Offer가 아닌 확인 정보로 반환한다")
    void exposes_recent_confirmed_price_information() {
        Spirit spirit = Spirit.builder()
                .nameKo("테스트 위스키")
                .nameEn("Test Whisky")
                .category(SpiritCategory.WHISKY)
                .status(SpiritStatus.ACTIVE)
                .build();
        ReflectionTestUtils.setField(spirit, "id", 10L);

        PriceReport price = PriceReport.builder()
                .spirit(spirit)
                .status(PriceReportStatus.APPROVED)
                .currency(PriceCurrency.KRW)
                .actualPrice(new BigDecimal("129000"))
                .purchasedAt(LocalDate.of(2026, 7, 20))
                .suggestedStoreName("확인 매장")
                .build();
        DealPost hotDeal = DealPost.builder()
                .spirit(spirit)
                .status(DealStatus.APPROVED)
                .isVisible(true)
                .dealPrice(99000)
                .currency("KRW")
                .seller("핫딜 판매처")
                .sourceSite("NAVER_CAFE")
                .sourceUrl("https://example.com/deal")
                .crawledAt(LocalDateTime.of(2026, 7, 21, 9, 30))
                .build();

        when(spiritRepository.findByIdWithAllDetails(10L, SpiritStatus.ACTIVE)).thenReturn(Optional.of(spirit));
        when(spiritRepository.findByParentId(10L)).thenReturn(List.of());
        when(spiritImageRepository.findBySpiritIdAndIsPrimaryTrue(10L)).thenReturn(Optional.empty());
        when(spiritImageRepository.findBySpiritIdOrderBySortOrderAscIdAsc(10L)).thenReturn(List.of());
        when(priceReportRepository.findRecentApprovedForSeo(anyCollection(), any(), any()))
                .thenReturn(List.of(price));
        when(dealPostRepository.findRecentVisibleForSeo(anyCollection(), any(), any()))
                .thenReturn(List.of(hotDeal));

        SpiritSeoResponse response = spiritSeoService.getSpiritSeo(10L);

        assertThat(response.recentPrice().amount()).isEqualByComparingTo("129000");
        assertThat(response.recentPrice().sourceName()).isEqualTo("확인 매장");
        assertThat(response.recentPrice().observedDate()).isEqualTo(LocalDate.of(2026, 7, 20));
        assertThat(response.recentHotDeal().amount()).isEqualByComparingTo("99000");
        assertThat(response.recentHotDeal().sourceUrl()).isEqualTo("https://example.com/deal");
    }

    @Test
    @DisplayName("존재하지 않는 주류는 예외를 던진다")
    void missing_spirit_throws() {
        when(spiritRepository.findByIdWithAllDetails(999L, SpiritStatus.ACTIVE)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> spiritSeoService.getSpiritSeo(999L))
                .isInstanceOf(CustomException.class);
    }

    private Spirit edition(Spirit parent, Long id, String seriesKo, String seriesEn) {
        Spirit edition = Spirit.builder()
                .nameKo(parent.getNameKo())
                .nameEn(parent.getNameEn())
                .category(parent.getCategory())
                .status(SpiritStatus.ACTIVE)
                .parent(parent)
                .variantType(VariantType.RELEASE_YEAR)
                .seriesIdentifier(seriesKo)
                .seriesIdentifierEn(seriesEn)
                .build();
        ReflectionTestUtils.setField(edition, "id", id);
        return edition;
    }
}

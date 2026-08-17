package com.caskbycask.domain.seo.service;

import com.caskbycask.domain.seo.event.IndexingEvent;
import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.spirit.entity.SpiritWineDetail;
import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import com.caskbycask.domain.spirit.entity.enums.VariantType;
import com.caskbycask.domain.spirit.entity.enums.WineVintageStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentCaptor.forClass;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class SpiritIndexingEventPublisherTest {

    private final ApplicationEventPublisher applicationEventPublisher = mock(ApplicationEventPublisher.class);
    private final SpiritIndexingEventPublisher publisher = new SpiritIndexingEventPublisher(applicationEventPublisher);

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(publisher, "siteUrl", "https://www.caskbycask.net/");
    }

    @Test
    @DisplayName("정규 주류와 에디션의 KO/EN self-canonical을 IndexNow 이벤트로 발행한다")
    void publishes_final_multilingual_canonical_urls() {
        Spirit master = spirit(295L, VariantType.NONE, null, null);
        Spirit edition = spirit(296L, VariantType.RELEASE_YEAR,
                "2026년 말띠 에디션", "Year of the Horse 2026");

        publisher.publish(List.of(master, edition));

        var captor = forClass(IndexingEvent.class);
        verify(applicationEventPublisher).publishEvent(captor.capture());
        assertThat(captor.getValue().urls()).containsExactly(
                "https://www.caskbycask.net/ko/spirits/295-탐두",
                "https://www.caskbycask.net/en/spirits/295-tamdhu",
                "https://www.caskbycask.net/ko/spirits/296-탐두-2026년-말띠-에디션",
                "https://www.caskbycask.net/en/spirits/296-tamdhu-year-of-the-horse-2026"
        );
    }

    @Test
    @DisplayName("와인의 연도 또는 NV가 포함된 canonical을 IndexNow 이벤트로 발행한다")
    void publishes_wine_vintage_canonical_urls() {
        Spirit wine = Spirit.builder()
                .nameKo("모엣 샹동")
                .nameEn("Moet Chandon")
                .category(SpiritCategory.WINE)
                .variantType(VariantType.NONE)
                .build();
        ReflectionTestUtils.setField(wine, "id", 297L);
        wine.attachWineDetail(SpiritWineDetail.builder()
                .spirit(wine)
                .vintageStatus(WineVintageStatus.NON_VINTAGE)
                .build());

        publisher.publish(wine);

        var captor = forClass(IndexingEvent.class);
        verify(applicationEventPublisher).publishEvent(captor.capture());
        assertThat(captor.getValue().urls()).containsExactly(
                "https://www.caskbycask.net/ko/spirits/297-모엣-샹동-nv",
                "https://www.caskbycask.net/en/spirits/297-moet-chandon-nv"
        );
    }

    private Spirit spirit(Long id, VariantType variantType, String seriesKo, String seriesEn) {
        Spirit spirit = Spirit.builder()
                .nameKo("탐두")
                .nameEn("Tamdhu")
                .category(SpiritCategory.WHISKY)
                .variantType(variantType)
                .seriesIdentifier(seriesKo)
                .seriesIdentifierEn(seriesEn)
                .build();
        ReflectionTestUtils.setField(spirit, "id", id);
        return spirit;
    }
}

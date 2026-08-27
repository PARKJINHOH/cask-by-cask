package com.caskbycask.domain.seo.service;

import com.caskbycask.domain.seo.event.IndexingEvent;
import com.caskbycask.domain.spirit.entity.enums.SpiritStatus;
import com.caskbycask.domain.spirit.repository.SpiritRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentCaptor.forClass;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 생산자 색인 통지의 <b>대상 판정</b>을 못 박는다.
 * <p>
 * 활성 주류가 없는 생산자는 sitemap 에서도 빠진다({@code SitemapService.PRODUCER_HAS_ACTIVE_SPIRIT}).
 * 두 조건이 어긋나면 sitemap 에서 일부러 뺀 빈 페이지를 IndexNow 로는 크롤해 달라고 조르게 된다.
 * 통지는 외부 검색엔진으로 나가는 단방향 동작이라 보낸 뒤에 되돌릴 방법이 없다.
 */
class ProducerIndexingEventPublisherTest {

    private final ApplicationEventPublisher applicationEventPublisher = mock(ApplicationEventPublisher.class);
    private final SpiritRepository spiritRepository = mock(SpiritRepository.class);
    private final ProducerIndexingEventPublisher publisher =
            new ProducerIndexingEventPublisher(applicationEventPublisher, spiritRepository);

    @BeforeEach
    void setUp() {
        // 끝 슬래시가 있어도 주소가 겹치지 않아야 한다.
        ReflectionTestUtils.setField(publisher, "siteUrl", "https://www.caskbycask.net/");
    }

    @Test
    @DisplayName("활성 주류가 있는 생산자는 ko/en 두 주소로 통지한다")
    void publishesBothLocalesForProducerWithActiveSpirit() {
        when(spiritRepository.existsByProducerIdAndStatus(7L, SpiritStatus.ACTIVE)).thenReturn(true);

        publisher.publish(7L);

        var captor = forClass(IndexingEvent.class);
        verify(applicationEventPublisher).publishEvent(captor.capture());
        assertThat(captor.getValue().kind()).isEqualTo("producer");
        assertThat(captor.getValue().urls()).containsExactly(
                "https://www.caskbycask.net/ko/producers/7",
                "https://www.caskbycask.net/en/producers/7");
    }

    @Test
    @DisplayName("활성 주류가 없는 생산자는 통지하지 않는다 — sitemap 조건과 같아야 한다")
    void skipsProducerWithoutActiveSpirit() {
        when(spiritRepository.existsByProducerIdAndStatus(8L, SpiritStatus.ACTIVE)).thenReturn(false);

        publisher.publish(8L);

        verify(applicationEventPublisher, never()).publishEvent(any(IndexingEvent.class));
    }

    @Test
    @DisplayName("판정은 ACTIVE 상태로만 한다")
    void checksActiveStatusOnly() {
        when(spiritRepository.existsByProducerIdAndStatus(any(), any())).thenReturn(true);

        publisher.publish(9L);

        verify(spiritRepository).existsByProducerIdAndStatus(eq(9L), eq(SpiritStatus.ACTIVE));
    }

    @Test
    @DisplayName("id 가 없으면 조회조차 하지 않는다")
    void skipsNullId() {
        publisher.publish(null);

        verify(spiritRepository, never()).existsByProducerIdAndStatus(any(), any());
        verify(applicationEventPublisher, never()).publishEvent(any(IndexingEvent.class));
    }
}

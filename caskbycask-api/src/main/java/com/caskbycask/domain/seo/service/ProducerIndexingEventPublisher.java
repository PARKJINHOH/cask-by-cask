package com.caskbycask.domain.seo.service;

import com.caskbycask.domain.seo.event.IndexingEvent;
import com.caskbycask.domain.spirit.entity.enums.SpiritStatus;
import com.caskbycask.domain.spirit.repository.SpiritRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * 생산자 상세의 색인 통지.
 * <p>
 * 생산자 페이지는 sitemap 의 {@code lastmod} 가 {@code Producer.updatedAt} 에서 오는데, 이 값은
 * 데이터가 바뀔 때만 움직인다. 렌더링만 바뀐 배포(예: 2026-08 SSR 폴백 복구)에서는 lastmod 가
 * 그대로라 검색엔진에 "다시 와 보라"고 알릴 신호가 없었다. 이 발행자가 그 공백을 메운다.
 * <p>
 * 특히 이 사이트 유입의 대부분이 네이버이고 IndexNow 엔드포인트에 네이버 서치어드바이저가
 * 들어 있으므로, 생산자 통지는 구글보다 네이버 쪽 실익이 크다.
 * <p>
 * 주류 shard 와 달리 생산자 경로는 slug 없이 언어 접두사만 다르므로({@code /{lang}/producers/{id}})
 * ko/en 두 주소를 함께 보낸다 — sitemap 의 {@code appendMultilingualUrl} 과 같은 형태다.
 */
@Component
@RequiredArgsConstructor
public class ProducerIndexingEventPublisher {

    private final ApplicationEventPublisher eventPublisher;
    private final SpiritRepository spiritRepository;

    @Value("${seo.site-url:https://www.caskbycask.net}")
    private String siteUrl;

    public void publish(Long producerId) {
        if (producerId == null) return;
        if (!isIndexable(producerId)) return;
        String base = normalizedSiteUrl() + "/%s/producers/" + producerId;
        eventPublisher.publishEvent(new IndexingEvent(
                "producer",
                List.of(String.format(base, "ko"), String.format(base, "en"))));
    }

    /**
     * 색인 통지 대상인가.
     * <p>
     * 활성 주류가 하나도 없는 생산자는 sitemap 에서도 빠진다 — 목록이 비어 있는 페이지를
     * 색인 대상으로 제출하지 않기 위해서다. 두 곳의 조건이 어긋나면 안 된다.
     */
    private boolean isIndexable(Long producerId) {
        return spiritRepository.existsByProducerIdAndStatus(producerId, SpiritStatus.ACTIVE);
    }

    private String normalizedSiteUrl() {
        return siteUrl.endsWith("/") ? siteUrl.substring(0, siteUrl.length() - 1) : siteUrl;
    }
}

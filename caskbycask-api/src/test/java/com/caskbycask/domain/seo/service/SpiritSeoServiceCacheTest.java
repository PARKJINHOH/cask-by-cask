package com.caskbycask.domain.seo.service;

import com.caskbycask.domain.deal.repository.DealPostRepository;
import com.caskbycask.domain.pricetracker.repository.PriceReportRepository;
import com.caskbycask.domain.seo.dto.SpiritSeoResponse;
import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import com.caskbycask.domain.spirit.entity.enums.SpiritStatus;
import com.caskbycask.domain.spirit.repository.SpiritImageRepository;
import com.caskbycask.domain.spirit.repository.SpiritRepository;
import com.caskbycask.global.config.CacheConfig;
import com.caskbycask.global.exception.CustomException;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.cache.CacheManager;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 주류 SEO 조회 캐시 동작 검증.
 *
 * 이 엔드포인트는 주류 페이지 요청의 임계 경로에 있다(Next.js proxy 의 canonical 판정 + 클라이언트 조회).
 * 한 번 조회에 5~6개 쿼리가 나가므로 반복 조회가 DB 로 내려가지 않아야 한다.
 * 반대로, 비활성 주류의 404 전환은 즉시 반영되어야 하므로 예외는 캐시되지 않아야 한다.
 */
class SpiritSeoServiceCacheTest {

    private static final long SPIRIT_ID = 244L;

    private Spirit activeSpirit() {
        Spirit spirit = Spirit.builder()
                .nameKo("카발란 솔리스트 PX 셰리")
                .nameEn("Kavalan Solist PX Sherry")
                .category(SpiritCategory.WHISKY)
                .status(SpiritStatus.ACTIVE)
                .build();
        ReflectionTestUtils.setField(spirit, "id", SPIRIT_ID);
        return spirit;
    }

    private ApplicationContextRunner runnerWith(SpiritRepository spiritRepository) {
        SpiritImageRepository imageRepository = mock(SpiritImageRepository.class);
        PriceReportRepository priceReportRepository = mock(PriceReportRepository.class);
        DealPostRepository dealPostRepository = mock(DealPostRepository.class);
        when(imageRepository.findBySpiritIdAndIsPrimaryTrue(SPIRIT_ID)).thenReturn(Optional.empty());
        when(imageRepository.findBySpiritIdOrderBySortOrderAscIdAsc(SPIRIT_ID)).thenReturn(List.of());
        when(priceReportRepository.findRecentApprovedForSeo(anyCollection(), any(), any()))
                .thenReturn(List.of());
        when(dealPostRepository.findRecentVisibleForSeo(anyCollection(), any(), any()))
                .thenReturn(List.of());

        return new ApplicationContextRunner()
                .withUserConfiguration(CacheConfig.class)
                .withBean(SpiritRepository.class, () -> spiritRepository)
                .withBean(SpiritImageRepository.class, () -> imageRepository)
                .withBean(PriceReportRepository.class, () -> priceReportRepository)
                .withBean(DealPostRepository.class, () -> dealPostRepository)
                .withBean(SpiritSeoService.class);
    }

    @Test
    void repeatedLookupsHitCacheInsteadOfDatabase() {
        SpiritRepository spiritRepository = mock(SpiritRepository.class);
        when(spiritRepository.findByIdWithAllDetails(SPIRIT_ID, SpiritStatus.ACTIVE))
                .thenReturn(Optional.of(activeSpirit()));
        when(spiritRepository.findByParentId(SPIRIT_ID)).thenReturn(List.of());

        runnerWith(spiritRepository).run(context -> {
            assertThat(context).hasNotFailed();
            SpiritSeoService service = context.getBean(SpiritSeoService.class);

            SpiritSeoResponse first = service.getSpiritSeo(SPIRIT_ID);
            SpiritSeoResponse second = service.getSpiritSeo(SPIRIT_ID);
            SpiritSeoResponse third = service.getSpiritSeo(SPIRIT_ID);

            assertThat(first.canonicalPathKo()).isEqualTo(second.canonicalPathKo());
            assertThat(second).isSameAs(third);
            // 세 번 호출해도 DB 조회는 한 번이어야 한다.
            verify(spiritRepository, times(1))
                    .findByIdWithAllDetails(SPIRIT_ID, SpiritStatus.ACTIVE);

            assertThat(context.getBean(CacheManager.class)
                    .getCache(SpiritSeoService.SEO_CACHE_NAME)
                    .get(SPIRIT_ID)).isNotNull();
        });
    }

    @Test
    void missingSpiritIsNotCachedSoDeactivationTakesEffectImmediately() {
        SpiritRepository spiritRepository = mock(SpiritRepository.class);
        when(spiritRepository.findByIdWithAllDetails(SPIRIT_ID, SpiritStatus.ACTIVE))
                .thenReturn(Optional.empty());

        runnerWith(spiritRepository).run(context -> {
            SpiritSeoService service = context.getBean(SpiritSeoService.class);

            assertThatThrownBy(() -> service.getSpiritSeo(SPIRIT_ID))
                    .isInstanceOf(CustomException.class);
            assertThatThrownBy(() -> service.getSpiritSeo(SPIRIT_ID))
                    .isInstanceOf(CustomException.class);

            // 예외는 캐시되지 않으므로 매번 DB 를 다시 확인한다.
            verify(spiritRepository, times(2))
                    .findByIdWithAllDetails(SPIRIT_ID, SpiritStatus.ACTIVE);
            assertThat(context.getBean(CacheManager.class)
                    .getCache(SpiritSeoService.SEO_CACHE_NAME)
                    .get(SPIRIT_ID)).isNull();
        });
    }

    @Test
    void differentSpiritsAreCachedSeparately() {
        long otherId = 245L;
        Spirit other = Spirit.builder()
                .nameKo("글렌알라키 15년")
                .nameEn("GlenAllachie 15")
                .category(SpiritCategory.WHISKY)
                .status(SpiritStatus.ACTIVE)
                .build();
        ReflectionTestUtils.setField(other, "id", otherId);

        SpiritRepository spiritRepository = mock(SpiritRepository.class);
        when(spiritRepository.findByIdWithAllDetails(SPIRIT_ID, SpiritStatus.ACTIVE))
                .thenReturn(Optional.of(activeSpirit()));
        when(spiritRepository.findByIdWithAllDetails(otherId, SpiritStatus.ACTIVE))
                .thenReturn(Optional.of(other));
        when(spiritRepository.findByParentId(any())).thenReturn(List.of());

        SpiritImageRepository imageRepository = mock(SpiritImageRepository.class);
        when(imageRepository.findBySpiritIdAndIsPrimaryTrue(any())).thenReturn(Optional.empty());
        when(imageRepository.findBySpiritIdOrderBySortOrderAscIdAsc(any())).thenReturn(List.of());
        PriceReportRepository priceReportRepository = mock(PriceReportRepository.class);
        when(priceReportRepository.findRecentApprovedForSeo(anyCollection(), any(), any()))
                .thenReturn(List.of());
        DealPostRepository dealPostRepository = mock(DealPostRepository.class);
        when(dealPostRepository.findRecentVisibleForSeo(anyCollection(), any(), any()))
                .thenReturn(List.of());

        new ApplicationContextRunner()
                .withUserConfiguration(CacheConfig.class)
                .withBean(SpiritRepository.class, () -> spiritRepository)
                .withBean(SpiritImageRepository.class, () -> imageRepository)
                .withBean(PriceReportRepository.class, () -> priceReportRepository)
                .withBean(DealPostRepository.class, () -> dealPostRepository)
                .withBean(SpiritSeoService.class)
                .run(context -> {
                    SpiritSeoService service = context.getBean(SpiritSeoService.class);

                    SpiritSeoResponse a = service.getSpiritSeo(SPIRIT_ID);
                    SpiritSeoResponse b = service.getSpiritSeo(otherId);

                    // 캐시 키가 id 이므로 서로 다른 주류가 섞이지 않아야 한다.
                    assertThat(a.canonicalId()).isEqualTo(SPIRIT_ID);
                    assertThat(b.canonicalId()).isEqualTo(otherId);
                    assertThat(a.canonicalPathKo()).isNotEqualTo(b.canonicalPathKo());
                    verify(spiritRepository, never())
                            .findByIdWithAllDetails(999L, SpiritStatus.ACTIVE);
                });
    }
}

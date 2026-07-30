package com.caskbycask.domain.seo.service;

import com.caskbycask.domain.deal.entity.DealPost;
import com.caskbycask.domain.deal.entity.enums.DealStatus;
import com.caskbycask.domain.deal.repository.DealPostRepository;
import com.caskbycask.domain.pricetracker.entity.PriceReport;
import com.caskbycask.domain.pricetracker.entity.enums.PriceReportStatus;
import com.caskbycask.domain.pricetracker.repository.PriceReportRepository;
import com.caskbycask.domain.seo.dto.SpiritSeoResponse;
import com.caskbycask.domain.seo.util.SpiritSlugUtils;
import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.spirit.entity.SpiritImage;
import com.caskbycask.domain.spirit.entity.enums.SpiritStatus;
import com.caskbycask.domain.spirit.repository.SpiritImageRepository;
import com.caskbycask.domain.spirit.repository.SpiritRepository;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class SpiritSeoService {

    /**
     * 주류 SEO 조회 캐시 이름.
     *
     * 이 엔드포인트는 주류 페이지 요청의 임계 경로에 있다. Next.js proxy 가 canonical 판정을 위해
     * 호출하고, 클라이언트 SPA 도 상세 진입 시 호출한다. 한 번 조회에 주류 상세·에디션 목록·대표
     * 이미지·최근 가격·최근 핫딜까지 5~6개 쿼리가 나가므로 짧은 TTL 로 반복 조회를 흡수한다.
     *
     * staleness: TTL 만 사용하고 개별 무효화는 하지 않는다. 60초는 이미 존재하는 지연
     * (proxy canonical 캐시 5분, Next.js ISR 3600초)보다 짧아 색인 신호의 최악 지연을 늘리지 않는다.
     * 주류가 비활성화되면 예외가 발생하고 예외는 캐시되지 않으므로 404 전환은 즉시 반영된다.
     */
    public static final String SEO_CACHE_NAME = "spiritSeo";

    private final SpiritRepository spiritRepository;
    private final SpiritImageRepository spiritImageRepository;
    private final PriceReportRepository priceReportRepository;
    private final DealPostRepository dealPostRepository;

    @Value("${seo.site-url:https://www.caskbycask.net}")
    private String siteUrl;

    @Cacheable(cacheNames = SEO_CACHE_NAME, key = "#id")
    @Transactional(readOnly = true)
    public SpiritSeoResponse getSpiritSeo(Long id) {
        Spirit requested = spiritRepository.findByIdWithAllDetails(id, SpiritStatus.ACTIVE)
                .orElseThrow(() -> new CustomException(ErrorCode.SPIRIT_NOT_FOUND));

        String pathKo = SpiritSlugUtils.canonicalPathKo(requested);
        String pathEn = SpiritSlugUtils.canonicalPathEn(requested);
        String nameKo = SpiritSlugUtils.displayNameKo(requested);
        String nameEn = SpiritSlugUtils.displayNameEn(requested);
        String producerKo = requested.getProducer() != null ? requested.getProducer().getNameKo() : "";
        String producerEn = requested.getProducer() != null
                ? firstNonBlank(requested.getProducer().getNameEn(), requested.getProducer().getNameKo())
                : "";
        String country = requested.getCountry() != null ? requested.getCountry() : "";
        String imageUrl = resolveImageUrl(requested);

        Spirit parent = requested.getParent();
        List<Spirit> activeEditions = parent != null
                ? activeEditions(parent.getId())
                : activeEditions(requested.getId());
        String relationType = parent != null
                ? "EDITION"
                : (activeEditions.isEmpty() ? "STANDALONE" : "MASTER");
        List<Long> priceSpiritIds = priceSpiritIds(requested, activeEditions);

        return new SpiritSeoResponse(
                requested.getId(),
                pathKo,
                pathEn,
                absoluteUrl(pathKo),
                absoluteUrl(pathEn),
                nameKo + " 주류 정보 & 리뷰 | CaskByCask",
                nameEn + " Specs & Reviews | CaskByCask",
                compact(nameKo + " " + producerKo + " " + country
                        + " 주류 정보, 시음 노트, 평점과 리뷰를 CaskByCask에서 확인하세요."),
                compact(nameEn + " " + producerEn + " " + country
                        + " specs, tasting notes, ratings and reviews on CaskByCask."),
                imageUrl,
                requested.getUpdatedAt(),
                relationType,
                parent != null && parent.getStatus() == SpiritStatus.ACTIVE ? related(parent) : null,
                activeEditions.stream().map(this::related).toList(),
                recentPrice(priceSpiritIds),
                recentHotDeal(priceSpiritIds)
        );
    }

    private List<Long> priceSpiritIds(Spirit requested, List<Spirit> activeEditions) {
        List<Long> ids = new ArrayList<>();
        ids.add(requested.getId());
        if (requested.getParent() == null) {
            activeEditions.stream().map(Spirit::getId).forEach(ids::add);
        }
        return ids;
    }

    private SpiritSeoResponse.PriceObservation recentPrice(List<Long> spiritIds) {
        return priceReportRepository.findRecentApprovedForSeo(
                        spiritIds,
                        PriceReportStatus.APPROVED,
                        PageRequest.of(0, 1))
                .stream()
                .findFirst()
                .map(this::priceObservation)
                .orElse(null);
    }

    private SpiritSeoResponse.PriceObservation priceObservation(PriceReport report) {
        String sourceName = report.getStore() != null
                ? report.getStore().getDisplayName()
                : report.getSuggestedStoreName();
        LocalDate observedDate = report.getPurchasedAt() != null
                ? report.getPurchasedAt()
                : toDate(report.getCreatedAt());
        return new SpiritSeoResponse.PriceObservation(
                report.getActualPrice(),
                report.getCurrency() != null ? report.getCurrency().name() : null,
                sourceName,
                observedDate,
                null
        );
    }

    private SpiritSeoResponse.PriceObservation recentHotDeal(List<Long> spiritIds) {
        return dealPostRepository.findRecentVisibleForSeo(
                        spiritIds,
                        DealStatus.APPROVED,
                        PageRequest.of(0, 1))
                .stream()
                .findFirst()
                .map(this::hotDealObservation)
                .orElse(null);
    }

    private SpiritSeoResponse.PriceObservation hotDealObservation(DealPost deal) {
        Integer amount = deal.getDealPrice() != null && deal.getDealPrice() > 0
                ? deal.getDealPrice()
                : deal.getOriginalPrice();
        if (amount == null || amount <= 0) {
            return null;
        }
        LocalDate observedDate = deal.getCrawledAt() != null
                ? deal.getCrawledAt().toLocalDate()
                : toDate(deal.getCreatedAt());
        return new SpiritSeoResponse.PriceObservation(
                BigDecimal.valueOf(amount),
                firstNonBlank(deal.getCurrency(), "KRW"),
                firstNonBlank(deal.getSeller(), deal.getSourceSite()),
                observedDate,
                deal.getSourceUrl()
        );
    }

    private LocalDate toDate(java.time.LocalDateTime dateTime) {
        return dateTime != null ? dateTime.toLocalDate() : null;
    }

    private List<Spirit> activeEditions(Long parentId) {
        return spiritRepository.findByParentId(parentId).stream()
                .filter(variant -> variant.getStatus() == SpiritStatus.ACTIVE)
                .toList();
    }

    private SpiritSeoResponse.RelatedSpirit related(Spirit spirit) {
        return new SpiritSeoResponse.RelatedSpirit(
                spirit.getId(),
                SpiritSlugUtils.displayNameKo(spirit),
                SpiritSlugUtils.displayNameEn(spirit),
                SpiritSlugUtils.canonicalPathKo(spirit),
                SpiritSlugUtils.canonicalPathEn(spirit)
        );
    }

    private String resolveImageUrl(Spirit spirit) {
        Optional<String> direct = primaryOrFirstImage(spirit.getId());
        if (direct.isPresent()) {
            return absoluteUrl(direct.get());
        }
        if (spirit.getParent() != null) {
            return primaryOrFirstImage(spirit.getParent().getId())
                    .map(this::absoluteUrl)
                    .orElse(absoluteUrl("/og-image.png"));
        }
        return absoluteUrl("/og-image.png");
    }

    private Optional<String> primaryOrFirstImage(Long spiritId) {
        Optional<SpiritImage> primary = spiritImageRepository.findBySpiritIdAndIsPrimaryTrue(spiritId);
        if (primary.isPresent()) {
            return primary.map(SpiritImage::getImageUrl);
        }
        List<SpiritImage> images = spiritImageRepository.findBySpiritIdOrderBySortOrderAscIdAsc(spiritId);
        return images.isEmpty() ? Optional.empty() : Optional.ofNullable(images.get(0).getImageUrl());
    }

    private String absoluteUrl(String pathOrUrl) {
        if (pathOrUrl == null || pathOrUrl.isBlank()) {
            return normalizedSiteUrl() + "/";
        }
        if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
            return pathOrUrl;
        }
        return normalizedSiteUrl() + (pathOrUrl.startsWith("/") ? pathOrUrl : "/" + pathOrUrl);
    }

    private String normalizedSiteUrl() {
        return siteUrl.endsWith("/") ? siteUrl.substring(0, siteUrl.length() - 1) : siteUrl;
    }

    private String compact(String value) {
        return value.replaceAll("\\s+", " ").trim();
    }

    private String firstNonBlank(String primary, String fallback) {
        return primary != null && !primary.isBlank() ? primary : (fallback != null ? fallback : "");
    }
}

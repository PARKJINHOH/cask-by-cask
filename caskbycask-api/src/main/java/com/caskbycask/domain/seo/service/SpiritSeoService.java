package com.caskbycask.domain.seo.service;

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
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class SpiritSeoService {

    private final SpiritRepository spiritRepository;
    private final SpiritImageRepository spiritImageRepository;

    @Value("${seo.site-url:https://www.caskbycask.net}")
    private String siteUrl;

    @Transactional(readOnly = true)
    public SpiritSeoResponse getSpiritSeo(Long id) {
        Spirit requested = spiritRepository.findByIdWithAllDetails(id, SpiritStatus.ACTIVE)
                .orElseThrow(() -> new CustomException(ErrorCode.SPIRIT_NOT_FOUND));

        Spirit canonical = resolveCanonicalSpirit(requested);
        String pathKo = SpiritSlugUtils.canonicalPathKo(canonical);
        String pathEn = SpiritSlugUtils.canonicalPathEn(canonical);
        String nameKo = SpiritSlugUtils.displayNameKo(canonical);
        String nameEn = SpiritSlugUtils.displayNameEn(canonical);
        String producerKo = canonical.getProducer() != null ? canonical.getProducer().getNameKo() : "";
        String producerEn = canonical.getProducer() != null
                ? firstNonBlank(canonical.getProducer().getNameEn(), canonical.getProducer().getNameKo())
                : "";
        String country = canonical.getCountry() != null ? canonical.getCountry() : "";
        String imageUrl = resolveImageUrl(canonical);

        return new SpiritSeoResponse(
                canonical.getId(),
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
                canonical.getUpdatedAt()
        );
    }

    private Spirit resolveCanonicalSpirit(Spirit spirit) {
        if (spirit.getParent() != null) {
            return spirit;
        }

        List<Spirit> activeVariants = spiritRepository.findByParentId(spirit.getId()).stream()
                .filter(variant -> variant.getStatus() == SpiritStatus.ACTIVE)
                .toList();
        if (activeVariants.isEmpty()) {
            return spirit;
        }

        Long defaultVariantId = activeVariants.get(0).getId();
        return spiritRepository.findByIdWithAllDetails(defaultVariantId, SpiritStatus.ACTIVE)
                .orElse(activeVariants.get(0));
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

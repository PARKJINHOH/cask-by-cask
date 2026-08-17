package com.caskbycask.domain.seo.service;

import com.caskbycask.domain.seo.event.IndexingEvent;
import com.caskbycask.domain.seo.util.SpiritSlugUtils;
import com.caskbycask.domain.spirit.entity.Spirit;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Component
@RequiredArgsConstructor
public class SpiritIndexingEventPublisher {

    private final ApplicationEventPublisher eventPublisher;

    @Value("${seo.site-url:https://www.caskbycask.net}")
    private String siteUrl;

    public void publish(Collection<Spirit> spirits) {
        Set<String> urls = new LinkedHashSet<>();
        for (Spirit spirit : spirits) {
            if (spirit == null || spirit.getId() == null) continue;
            var vintageStatus = spirit.getWineDetail() != null
                    ? spirit.getWineDetail().getVintageStatus()
                    : null;
            urls.add(normalizedSiteUrl() + SpiritSlugUtils.canonicalPathKo(
                    spirit.getId(), spirit.getNameKo(), spirit.getSeriesIdentifier(),
                    spirit.getVariantType(), spirit.getVariantValue(),
                    spirit.getCategory(), spirit.getVintageYear(), vintageStatus));
            urls.add(normalizedSiteUrl() + SpiritSlugUtils.canonicalPathEn(
                    spirit.getId(), spirit.getNameKo(), spirit.getNameEn(),
                    spirit.getSeriesIdentifier(), spirit.getSeriesIdentifierEn(),
                    spirit.getVariantType(), spirit.getVariantValue(), spirit.getVariantValueEn(),
                    spirit.getCategory(), spirit.getVintageYear(), vintageStatus));
        }
        if (!urls.isEmpty()) {
            eventPublisher.publishEvent(new IndexingEvent("spirit", List.copyOf(urls)));
        }
    }

    public void publish(Spirit spirit) {
        publish(List.of(spirit));
    }

    private String normalizedSiteUrl() {
        return siteUrl.endsWith("/") ? siteUrl.substring(0, siteUrl.length() - 1) : siteUrl;
    }
}

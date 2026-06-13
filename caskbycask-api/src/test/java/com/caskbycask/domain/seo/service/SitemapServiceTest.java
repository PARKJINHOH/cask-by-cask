package com.caskbycask.domain.seo.service;

import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SitemapServiceTest {

    @Mock
    private EntityManager em;

    @InjectMocks
    private SitemapService sitemapService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(sitemapService, "siteUrl", "https://caskbycask.net");
    }

    @Test
    @DisplayName("sitemap.xml에 카테고리 필터 URL 4개가 포함된다")
    void sitemap_contains_category_urls() {
        when(em.createQuery(anyString())).thenAnswer(inv -> {
            var q = org.mockito.Mockito.mock(jakarta.persistence.Query.class);
            when(q.getResultList()).thenReturn(List.of());
            return q;
        });

        String xml = sitemapService.generateSitemap();

        assertThat(xml).contains("https://caskbycask.net/spirits?category=WHISKY");
        assertThat(xml).contains("https://caskbycask.net/spirits?category=COGNAC");
        assertThat(xml).contains("https://caskbycask.net/spirits?category=WINE");
        assertThat(xml).contains("https://caskbycask.net/spirits?category=OTHER");
    }

    @Test
    @DisplayName("sitemap.xml은 유효한 XML urlset을 반환한다")
    void sitemap_returns_valid_xml() {
        when(em.createQuery(anyString())).thenAnswer(inv -> {
            var q = org.mockito.Mockito.mock(jakarta.persistence.Query.class);
            when(q.getResultList()).thenReturn(List.of());
            return q;
        });

        String xml = sitemapService.generateSitemap();

        assertThat(xml).startsWith("<?xml version=\"1.0\" encoding=\"UTF-8\"?>");
        assertThat(xml).contains("<urlset");
        assertThat(xml).contains("</urlset>");
    }
}

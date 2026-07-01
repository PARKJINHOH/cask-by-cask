package com.caskbycask.domain.seo.service;

import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import com.caskbycask.domain.spirit.entity.enums.VariantType;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import jakarta.persistence.TypedQuery;
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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
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
        mockQueries(List.of());

        String xml = sitemapService.generateSitemap();

        assertThat(xml).contains("https://caskbycask.net/ko/spirits?category=WHISKY");
        assertThat(xml).contains("https://caskbycask.net/en/spirits?category=WHISKY");
        assertThat(xml).contains("https://caskbycask.net/ko/spirits?category=COGNAC");
        assertThat(xml).contains("https://caskbycask.net/en/spirits?category=COGNAC");
        assertThat(xml).contains("https://caskbycask.net/ko/spirits?category=WINE");
        assertThat(xml).contains("https://caskbycask.net/en/spirits?category=WINE");
        assertThat(xml).contains("https://caskbycask.net/ko/spirits?category=OTHER");
        assertThat(xml).contains("https://caskbycask.net/en/spirits?category=OTHER");
    }

    @Test
    @DisplayName("sitemap.xml은 유효한 XML urlset을 반환한다")
    void sitemap_returns_valid_xml() {
        mockQueries(List.of());

        String xml = sitemapService.generateSitemap();

        assertThat(xml).startsWith("<?xml version=\"1.0\" encoding=\"UTF-8\"?>");
        assertThat(xml).contains("<urlset");
        assertThat(xml).contains("</urlset>");
    }

    @Test
    @DisplayName("sitemap.xml은 주류 상세 id-only URL 대신 정식 slug URL만 포함한다")
    void sitemap_contains_canonical_spirit_slug_urls() {
        Spirit spirit = Spirit.builder()
                .nameKo("더 글렌드로낙")
                .nameEn("The Glendronach")
                .category(SpiritCategory.WHISKY)
                .variantType(VariantType.BATCH)
                .seriesIdentifier("올로로소 12년 1L")
                .seriesIdentifierEn("Oloroso 12 Year Old 1L")
                .variantValue("스페셜 릴리즈")
                .variantValueEn("Special Release")
                .build();
        ReflectionTestUtils.setField(spirit, "id", 176L);
        mockQueries(List.of(spirit));

        String xml = sitemapService.generateSitemap();

        assertThat(xml).contains("https://caskbycask.net/ko/spirits/176-더-글렌드로낙-올로로소-12년-1l-스페셜-릴리즈");
        assertThat(xml).contains("https://caskbycask.net/en/spirits/176-the-glendronach-oloroso-12-year-old-1l-special-release");
        assertThat(xml).doesNotContain("https://caskbycask.net/ko/spirits/176</loc>");
        assertThat(xml).doesNotContain("https://caskbycask.net/en/spirits/176</loc>");
    }

    @Test
    @DisplayName("sitemap.xml includes series identifier when an edition has no variant value")
    void sitemap_contains_series_identifier_for_edition_without_variant_value() {
        Spirit spirit = Spirit.builder()
                .nameKo("카발란 솔리스트")
                .nameEn("Kavalan Solist")
                .category(SpiritCategory.WHISKY)
                .variantType(VariantType.SINGLE_CASK)
                .seriesIdentifier("콜헤이타 포트 싱글 캐스크 스트렝스")
                .seriesIdentifierEn("Colheita Port Single Cask Strength")
                .build();
        ReflectionTestUtils.setField(spirit, "id", 199L);
        mockQueries(List.of(spirit));

        String xml = sitemapService.generateSitemap();

        assertThat(xml).contains("https://caskbycask.net/ko/spirits/199-카발란-솔리스트-콜헤이타-포트-싱글-캐스크-스트렝스");
        assertThat(xml).contains("https://caskbycask.net/en/spirits/199-kavalan-solist-colheita-port-single-cask-strength");
    }

    private void mockQueries(List<Spirit> spirits) {
        @SuppressWarnings("unchecked")
        TypedQuery<Spirit> spiritQuery = org.mockito.Mockito.mock(TypedQuery.class);
        when(spiritQuery.setParameter(eq("status"), any())).thenReturn(spiritQuery);
        when(spiritQuery.getResultList()).thenReturn(spirits);
        when(em.createQuery(anyString(), eq(Spirit.class))).thenReturn(spiritQuery);

        when(em.createQuery(anyString())).thenAnswer(inv -> {
            Query query = org.mockito.Mockito.mock(Query.class);
            when(query.getResultList()).thenReturn(List.of());
            return query;
        });
    }
}

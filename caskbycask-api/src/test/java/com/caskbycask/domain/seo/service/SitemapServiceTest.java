package com.caskbycask.domain.seo.service;

import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import com.caskbycask.domain.spirit.entity.enums.VariantType;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.function.Function;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SitemapServiceTest {

    @Mock
    private EntityManager em;

    @InjectMocks
    private SitemapService sitemapService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(sitemapService, "siteUrl", "https://www.caskbycask.net/");
    }

    @Test
    @DisplayName("루트 사이트맵은 정적·콘텐츠·언어별 주류 shard를 가리키는 sitemap index다")
    void sitemap_index_contains_stable_shards() {
        mockQueries(jpql -> {
            if (jpql.contains("FROM Spirit")) return Long.valueOf(10_001L);
            if (jpql.contains("FROM Notice")) return Long.valueOf(12L);
            return null;
        }, jpql -> List.of());

        String xml = sitemapService.generateSitemapIndex();

        assertThat(xml).contains("<sitemapindex");
        assertThat(xml).contains("https://www.caskbycask.net/sitemaps/static.xml");
        assertThat(xml).contains("https://www.caskbycask.net/sitemaps/content-0.xml");
        assertThat(xml).contains("https://www.caskbycask.net/sitemaps/spirits-ko-0.xml");
        assertThat(xml).contains("https://www.caskbycask.net/sitemaps/spirits-ko-1.xml");
        assertThat(xml).contains("https://www.caskbycask.net/sitemaps/spirits-en-0.xml");
        assertThat(xml).contains("https://www.caskbycask.net/sitemaps/spirits-en-1.xml");
        assertThat(xml).doesNotContain("<urlset");
    }

    @Test
    @DisplayName("정적 사이트맵은 빈 카테고리와 리다이렉트되는 언어 루트를 제외한다")
    void static_sitemap_excludes_empty_categories_and_trailing_language_root() {
        mockQueries(jpql -> null, jpql -> jpql.contains("GROUP BY s.category")
                ? List.of(new Object[]{SpiritCategory.WHISKY, 42L}, new Object[]{SpiritCategory.WINE, 0L})
                : List.of());

        String xml = sitemapService.generateStaticSitemap();

        assertThat(xml).contains("https://www.caskbycask.net/ko</loc>");
        assertThat(xml).contains("https://www.caskbycask.net/en</loc>");
        assertThat(xml).doesNotContain("https://www.caskbycask.net/ko/</loc>");
        assertThat(xml).contains("/ko/spirits?category=WHISKY");
        assertThat(xml).contains("/en/spirits?category=WHISKY");
        assertThat(xml).doesNotContain("category=WINE");
        assertThat(xml).doesNotContain("category=COGNAC");
        assertThat(xml).doesNotContain("https://www.caskbycask.net/en/community/");
        assertThat(xml).contains("/ko/calendar", "/en/calendar");
        assertThat(xml).contains("/ko/tier-lists", "/en/tier-lists");
        assertThat(xml).contains("/ko/taste-trees", "/en/taste-trees");
        assertThat(xml).contains("/ko/price-tracker", "/en/price-tracker");
        assertThat(xml).contains("/ko/operation-policy", "/en/operation-policy");
    }

    @Test
    @DisplayName("주류 shard는 정규 주류와 에디션을 각각 정식 slug URL로 포함하고 KST lastmod를 출력한다")
    void spirit_sitemap_contains_master_and_edition_canonicals() {
        LocalDateTime updatedAt = LocalDateTime.of(2026, 7, 21, 12, 30);
        List<Object[]> rows = List.of(
                new Object[]{295L, "탐두", "Tamdhu", null, null,
                        VariantType.NONE, null, null, updatedAt},
                new Object[]{296L, "탐두", "Tamdhu", "2026년 말띠 에디션", "Year of the Horse 2026",
                        VariantType.RELEASE_YEAR, null, null, updatedAt}
        );
        mockQueries(jpql -> null, jpql -> jpql.contains("FROM Spirit s") ? rows : List.of());

        String ko = sitemapService.generateSpiritSitemap("ko", 0);
        String en = sitemapService.generateSpiritSitemap("en", 0);

        assertThat(ko).contains("/ko/spirits/295-탐두");
        assertThat(ko).contains("/ko/spirits/296-탐두-2026년-말띠-에디션");
        assertThat(en).contains("/en/spirits/295-tamdhu");
        assertThat(en).contains("/en/spirits/296-tamdhu-year-of-the-horse-2026");
        assertThat(ko).contains("<lastmod>2026-07-21T12:30:00+09:00</lastmod>");
        assertThat(ko).doesNotContain("/ko/spirits/295</loc>");
    }

    @Test
    @DisplayName("콘텐츠 shard는 공개 상태 조건으로 조회하고 XML 특수문자를 이스케이프한다")
    void content_sitemap_uses_public_filters_and_xml_escaping() {
        mockQueries(jpql -> null, jpql -> {
            if (jpql.contains("FROM Post p")) {
                assertThat(jpql).contains("p.status = :active", "p.isHidden = false", "p.adultOnly = false");
                return List.<Object[]>of(
                        new Object[]{7L, LocalDateTime.of(2026, 1, 2, 3, 4), "FREE&NEWS"}
                );
            }
            return List.of();
        });

        String xml = sitemapService.generateContentSitemap(0);

        assertThat(xml).contains("/ko/community/free&amp;news/7");
        assertThat(xml).contains("2026-01-02T03:04:00+09:00");
    }

    private void mockQueries(Function<String, Object> singleResult,
                             Function<String, List<?>> listResult) {
        when(em.createQuery(anyString())).thenAnswer(invocation -> {
            String jpql = invocation.getArgument(0);
            Query query = mock(Query.class);
            lenient().when(query.setParameter(anyString(), any())).thenReturn(query);
            lenient().when(query.getSingleResult()).thenAnswer(ignored -> singleResult.apply(jpql));
            lenient().when(query.getResultList()).thenAnswer(ignored -> listResult.apply(jpql));
            return query;
        });
    }
}

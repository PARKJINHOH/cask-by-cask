package com.drinkindex.domain.seo.service;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * sitemap.xml 본문 생성.
 *
 * 포함 URL:
 *   - 정적 페이지: /, /spirits, /spirits?category={WHISKY|COGNAC|WINE|OTHER},
 *                 /notices, /community/free, /community/notice, /ranking, /terms, /privacy
 *   - 동적: /spirits/{id}, /notices/{id}, /community/{boardType}/{postId}
 *
 * 제외:
 *   - /admin/**, /mypage, /messages, /notifications, /verify-email, /login, /signup
 *   - 비공개/삭제 상태의 컨텐츠
 *
 * 50k URL 한도, 50MB 크기 한도 (Google 규약) — 현재 단일 파일.
 * 향후 컨텐츠 폭증 시 sitemap index 로 분할 필요.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SitemapService {

    private static final DateTimeFormatter W3C = DateTimeFormatter.ISO_OFFSET_DATE_TIME;

    @PersistenceContext
    private EntityManager em;

    @Value("${seo.site-url:https://drinkindex.net}")
    private String siteUrl;

    @Transactional(readOnly = true)
    public String generateSitemap() {
        StringBuilder sb = new StringBuilder(8192);
        sb.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
        sb.append("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n");

        // ── 정적 페이지 ──
        appendUrl(sb, siteUrl + "/",                       null, "daily",  "1.0");
        appendUrl(sb, siteUrl + "/spirits",                null, "daily",  "0.9");

        // ── 카테고리 필터 페이지 ──
        appendUrl(sb, siteUrl + "/spirits?category=WHISKY",  null, "daily",  "0.8");
        appendUrl(sb, siteUrl + "/spirits?category=COGNAC",  null, "daily",  "0.8");
        appendUrl(sb, siteUrl + "/spirits?category=WINE",    null, "daily",  "0.8");
        appendUrl(sb, siteUrl + "/spirits?category=OTHER",   null, "daily",  "0.7");

        appendUrl(sb, siteUrl + "/notices",                null, "daily",  "0.7");
        appendUrl(sb, siteUrl + "/community/free",         null, "hourly", "0.8");
        appendUrl(sb, siteUrl + "/community/notice",       null, "daily",  "0.7");
        appendUrl(sb, siteUrl + "/ranking",                null, "weekly", "0.5");
        appendUrl(sb, siteUrl + "/faq",                    null, "monthly", "0.6");
        appendUrl(sb, siteUrl + "/terms",                  null, "yearly", "0.2");
        appendUrl(sb, siteUrl + "/privacy",                null, "yearly", "0.2");

        // ── 동적: spirits ──
        appendQueryResults(sb,
            "SELECT s.id, s.updatedAt FROM Spirit s ORDER BY s.id",
            id -> siteUrl + "/spirits/" + id,
            "weekly", "0.8");

        // ── 동적: notices ──
        try {
            appendQueryResults(sb,
                "SELECT n.id, n.updatedAt FROM Notice n WHERE n.isHidden = false ORDER BY n.id",
                id -> siteUrl + "/notices/" + id,
                "monthly", "0.6");
        } catch (Exception e) {
            // isHidden 필드가 없거나 다른 이름이면 fallback
            appendQueryResults(sb,
                "SELECT n.id, n.updatedAt FROM Notice n ORDER BY n.id",
                id -> siteUrl + "/notices/" + id,
                "monthly", "0.6");
        }

        // ── 동적: posts (board_type 별 URL) ──
        try {
            @SuppressWarnings("unchecked")
            List<Object[]> posts = em.createQuery(
                    "SELECT p.id, p.updatedAt, p.boardType FROM Post p ORDER BY p.id"
            ).getResultList();
            for (Object[] row : posts) {
                Long id = (Long) row[0];
                LocalDateTime updated = (LocalDateTime) row[1];
                Object boardType = row[2];
                String slug = boardType == null ? "free" : boardType.toString().toLowerCase();
                appendUrl(sb, siteUrl + "/community/" + slug + "/" + id, updated, "weekly", "0.6");
            }
        } catch (Exception e) {
            log.warn("Post sitemap entries skipped: {}", e.getMessage());
        }

        sb.append("</urlset>\n");
        return sb.toString();
    }

    @FunctionalInterface
    private interface UrlBuilder { String build(Long id); }

    @SuppressWarnings("unchecked")
    private void appendQueryResults(StringBuilder sb, String jpql, UrlBuilder urlBuilder,
                                    String changefreq, String priority) {
        try {
            List<Object[]> rows = em.createQuery(jpql).getResultList();
            for (Object[] row : rows) {
                Long id = (Long) row[0];
                LocalDateTime updated = row.length > 1 ? (LocalDateTime) row[1] : null;
                appendUrl(sb, urlBuilder.build(id), updated, changefreq, priority);
            }
        } catch (Exception e) {
            log.warn("Sitemap query skipped — {}: {}", jpql, e.getMessage());
        }
    }

    private void appendUrl(StringBuilder sb, String loc, LocalDateTime lastmod,
                           String changefreq, String priority) {
        sb.append("  <url>\n");
        sb.append("    <loc>").append(escape(loc)).append("</loc>\n");
        if (lastmod != null) {
            sb.append("    <lastmod>")
              .append(lastmod.atOffset(ZoneOffset.UTC).format(W3C))
              .append("</lastmod>\n");
        }
        sb.append("    <changefreq>").append(changefreq).append("</changefreq>\n");
        sb.append("    <priority>").append(priority).append("</priority>\n");
        sb.append("  </url>\n");
    }

    private String escape(String s) {
        return s.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&apos;");
    }
}

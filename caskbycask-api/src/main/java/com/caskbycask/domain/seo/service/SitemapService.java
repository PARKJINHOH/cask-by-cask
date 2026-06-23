package com.caskbycask.domain.seo.service;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.caskbycask.domain.spirit.entity.enums.VariantType;

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

    @Value("${seo.site-url:https://caskbycask.net}")
    private String siteUrl;

    @Transactional(readOnly = true)
    public String generateSitemap() {
        StringBuilder sb = new StringBuilder(8192);
        sb.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
        sb.append("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n");

        // ── 정적 페이지 ──
        appendMultilingualUrl(sb, "/",                       null, "daily",  "1.0");
        appendMultilingualUrl(sb, "/spirits",                null, "daily",  "0.9");

        // ── 카테고리 필터 페이지 ──
        appendMultilingualUrl(sb, "/spirits?category=WHISKY",  null, "daily",  "0.8");
        appendMultilingualUrl(sb, "/spirits?category=COGNAC",  null, "daily",  "0.8");
        appendMultilingualUrl(sb, "/spirits?category=WINE",    null, "daily",  "0.8");
        appendMultilingualUrl(sb, "/spirits?category=OTHER",   null, "daily",  "0.7");

        appendMultilingualUrl(sb, "/notices",                null, "daily",  "0.7");
        appendMultilingualUrl(sb, "/community/free",         null, "hourly", "0.8");
        appendMultilingualUrl(sb, "/community/notice",       null, "daily",  "0.7");
        appendMultilingualUrl(sb, "/ranking",                null, "weekly", "0.5");
        appendMultilingualUrl(sb, "/faq",                    null, "monthly", "0.6");
        appendMultilingualUrl(sb, "/terms",                  null, "yearly", "0.2");
        appendMultilingualUrl(sb, "/privacy",                null, "yearly", "0.2");

        // ── 동적: spirits ──
        try {
            @SuppressWarnings("unchecked")
            List<Object[]> spirits = em.createQuery(
                    "SELECT s.id, s.updatedAt, s.nameEn, s.nameKo, s.variantType, s.variantValue, s.variantValueEn FROM Spirit s ORDER BY s.id"
            ).getResultList();
            for (Object[] row : spirits) {
                Long id = (Long) row[0];
                LocalDateTime updated = (LocalDateTime) row[1];
                String nameEn = (String) row[2];
                String nameKo = (String) row[3];
                VariantType variantType = (VariantType) row[4];
                String variantValue = (String) row[5];
                String variantValueEn = (String) row[6];

                if (variantType != null && variantType != VariantType.NONE) {
                    if (variantValue != null && !variantValue.trim().isEmpty()) {
                        nameKo = nameKo + " " + variantValue.trim();
                    }
                    String valEn = variantValueEn != null && !variantValueEn.trim().isEmpty()
                            ? variantValueEn.trim()
                            : (variantValue != null ? variantValue.trim() : "");
                    if (nameEn != null && !nameEn.trim().isEmpty()) {
                        if (!valEn.isEmpty()) {
                            nameEn = nameEn + " " + valEn;
                        }
                    } else {
                        if (!valEn.isEmpty()) {
                            nameEn = valEn;
                        }
                    }
                }

                String slugKo = slugify(nameKo);
                String slugEn = slugify(nameEn);

                String pathKo = "/ko/spirits/" + id + (slugKo.isEmpty() ? "" : "-" + slugKo);
                String pathEn = "/en/spirits/" + id + (slugEn.isEmpty() ? "" : "-" + slugEn);

                appendUrl(sb, siteUrl + pathKo, updated, "weekly", "0.8");
                appendUrl(sb, siteUrl + pathEn, updated, "weekly", "0.8");
            }
        } catch (Exception e) {
            log.warn("Spirit sitemap entries skipped: {}", e.getMessage());
        }

        // ── 동적: notices (공개 = 게시됨 & 미삭제) ──
        try {
            @SuppressWarnings("unchecked")
            List<Object[]> notices = em.createQuery(
                    "SELECT n.id, n.updatedAt FROM Notice n WHERE n.isPublished = true AND n.deletedAt IS NULL ORDER BY n.id"
            ).getResultList();
            for (Object[] row : notices) {
                Long id = (Long) row[0];
                LocalDateTime updated = (LocalDateTime) row[1];
                appendMultilingualUrl(sb, "/notices/" + id, updated, "monthly", "0.6");
            }
        } catch (Exception e) {
            log.warn("Notice sitemap entries skipped: {}", e.getMessage());
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
                appendMultilingualUrl(sb, "/community/" + slug + "/" + id, updated, "weekly", "0.6");
            }
        } catch (Exception e) {
            log.warn("Post sitemap entries skipped: {}", e.getMessage());
        }

        sb.append("</urlset>\n");
        return sb.toString();
    }

    private void appendMultilingualUrl(StringBuilder sb, String path, LocalDateTime lastmod,
                                       String changefreq, String priority) {
        String cleanPath = path.startsWith("/") ? path : "/" + path;
        appendUrl(sb, siteUrl + "/ko" + (cleanPath.equals("/") ? "/" : cleanPath), lastmod, changefreq, priority);
        appendUrl(sb, siteUrl + "/en" + (cleanPath.equals("/") ? "/" : cleanPath), lastmod, changefreq, priority);
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

    private String slugify(String name) {
        if (name == null || name.trim().isEmpty()) {
            return "";
        }
        String slug = name.toLowerCase().trim();
        slug = slug.replaceAll("[^a-z0-9\\uAC00-\\uD7A3\\u1100-\\u11FF\\u3130-\\u318F]+", "-");
        slug = slug.replaceAll("-+", "-");
        slug = slug.replaceAll("^-|-$", "");
        return slug;
    }
}

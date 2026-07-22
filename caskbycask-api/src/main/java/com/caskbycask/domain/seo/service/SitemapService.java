package com.caskbycask.domain.seo.service;

import com.caskbycask.domain.byob.entity.enums.ByobStatus;
import com.caskbycask.domain.community.entity.enums.PostStatus;
import com.caskbycask.domain.seo.util.SpiritSlugUtils;
import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import com.caskbycask.domain.spirit.entity.enums.SpiritStatus;
import com.caskbycask.domain.spirit.entity.enums.VariantType;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class SitemapService {

    public static final long BUCKET_SIZE = 10_000L;
    private static final ZoneId SERVICE_ZONE = ZoneId.of("Asia/Seoul");
    private static final DateTimeFormatter W3C = DateTimeFormatter.ISO_OFFSET_DATE_TIME;

    @PersistenceContext
    private EntityManager em;

    @Value("${seo.site-url:https://www.caskbycask.net}")
    private String siteUrl;

    @Transactional(readOnly = true)
    public String generateSitemapIndex() {
        StringBuilder sb = new StringBuilder(1024);
        sb.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
        sb.append("<sitemapindex xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n");
        appendSitemap(sb, "/sitemaps/static.xml");
        for (long bucket : contentBuckets()) {
            appendSitemap(sb, "/sitemaps/content-" + bucket + ".xml");
        }
        List<Long> spiritBuckets = spiritBuckets();
        for (String lang : List.of("ko", "en")) {
            for (long bucket : spiritBuckets) {
                appendSitemap(sb, "/sitemaps/spirits-" + lang + "-" + bucket + ".xml");
            }
        }
        sb.append("</sitemapindex>\n");
        return sb.toString();
    }

    @Transactional(readOnly = true)
    public String generateStaticSitemap() {
        StringBuilder sb = startUrlSet();
        appendMultilingualUrl(sb, "/", null);
        appendMultilingualUrl(sb, "/spirits", null);

        for (Map.Entry<SpiritCategory, Long> entry : activeCategoryCounts().entrySet()) {
            if (entry.getValue() > 0) {
                appendMultilingualUrl(sb, "/spirits?category=" + entry.getKey().name(), null);
            }
        }

        appendKoreanUrl(sb, "/notices", null);
        appendKoreanUrl(sb, "/community/all", null);
        appendKoreanUrl(sb, "/community/free", null);
        appendKoreanUrl(sb, "/community/notice", null);
        appendKoreanUrl(sb, "/community/byob", null);
        appendMultilingualUrl(sb, "/ranking", null);
        appendMultilingualUrl(sb, "/faq", null);
        appendMultilingualUrl(sb, "/calendar", null);
        appendMultilingualUrl(sb, "/tier-lists", null);
        appendMultilingualUrl(sb, "/taste-trees", null);
        appendMultilingualUrl(sb, "/price-tracker", null);
        appendMultilingualUrl(sb, "/terms", null);
        appendMultilingualUrl(sb, "/privacy", null);
        appendMultilingualUrl(sb, "/operation-policy", null);
        return finishUrlSet(sb);
    }

    @Transactional(readOnly = true)
    public String generateSpiritSitemap(String lang, long bucket) {
        if (!("ko".equals(lang) || "en".equals(lang)) || bucket < 0) {
            throw new IllegalArgumentException("Unsupported sitemap shard");
        }

        long minId = Math.multiplyExact(bucket, BUCKET_SIZE);
        long maxId = Math.addExact(minId, BUCKET_SIZE);
        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createQuery("""
                SELECT s.id, s.nameKo, s.nameEn,
                       s.seriesIdentifier, s.seriesIdentifierEn,
                       s.variantType, s.variantValue, s.variantValueEn,
                       s.updatedAt
                FROM Spirit s
                WHERE s.status = :status
                  AND s.id >= :minId
                  AND s.id < :maxId
                ORDER BY s.id
                """)
                .setParameter("status", SpiritStatus.ACTIVE)
                .setParameter("minId", minId)
                .setParameter("maxId", maxId)
                .getResultList();

        StringBuilder sb = startUrlSet();
        for (Object[] row : rows) {
            Long id = (Long) row[0];
            String nameKo = (String) row[1];
            String nameEn = (String) row[2];
            String seriesIdentifier = (String) row[3];
            String seriesIdentifierEn = (String) row[4];
            VariantType variantType = (VariantType) row[5];
            String variantValue = (String) row[6];
            String variantValueEn = (String) row[7];
            LocalDateTime updatedAt = (LocalDateTime) row[8];
            String path = "en".equals(lang)
                    ? SpiritSlugUtils.canonicalPathEn(id, nameKo, nameEn, seriesIdentifier,
                    seriesIdentifierEn, variantType, variantValue, variantValueEn)
                    : SpiritSlugUtils.canonicalPathKo(id, nameKo, seriesIdentifier, variantType, variantValue);
            appendUrl(sb, normalizedSiteUrl() + path, updatedAt);
        }
        return finishUrlSet(sb);
    }

    @Transactional(readOnly = true)
    public String generateContentSitemap(long bucket) {
        if (bucket < 0) throw new IllegalArgumentException("Unsupported sitemap shard");
        long minId = Math.multiplyExact(bucket, BUCKET_SIZE);
        long maxId = Math.addExact(minId, BUCKET_SIZE);
        StringBuilder sb = startUrlSet();

        @SuppressWarnings("unchecked")
        List<Object[]> notices = em.createQuery("""
                SELECT n.id, n.updatedAt FROM Notice n
                WHERE n.isPublished = true
                  AND n.deletedAt IS NULL
                  AND n.id >= :minId AND n.id < :maxId
                ORDER BY n.id
                """)
                .setParameter("minId", minId)
                .setParameter("maxId", maxId)
                .getResultList();
        for (Object[] row : notices) {
            appendKoreanUrl(sb, "/notices/" + row[0], (LocalDateTime) row[1]);
        }

        @SuppressWarnings("unchecked")
        List<Object[]> posts = em.createQuery("""
                SELECT p.id, p.updatedAt, p.boardType FROM Post p
                WHERE p.status = :active
                  AND p.isHidden = false
                  AND p.adultOnly = false
                  AND p.id >= :minId AND p.id < :maxId
                ORDER BY p.id
                """)
                .setParameter("active", PostStatus.ACTIVE)
                .setParameter("minId", minId)
                .setParameter("maxId", maxId)
                .getResultList();
        for (Object[] row : posts) {
            String board = row[2] == null ? "free" : row[2].toString().toLowerCase();
            appendKoreanUrl(sb, "/community/" + board + "/" + row[0], (LocalDateTime) row[1]);
        }

        @SuppressWarnings("unchecked")
        List<Object[]> byobs = em.createQuery("""
                SELECT b.id, b.updatedAt FROM Byob b
                WHERE b.status <> :cancelled
                  AND b.id >= :minId AND b.id < :maxId
                ORDER BY b.id
                """)
                .setParameter("cancelled", ByobStatus.CANCELLED)
                .setParameter("minId", minId)
                .setParameter("maxId", maxId)
                .getResultList();
        for (Object[] row : byobs) {
            appendKoreanUrl(sb, "/community/byob/" + row[0], (LocalDateTime) row[1]);
        }
        return finishUrlSet(sb);
    }

    public List<Long> spiritBuckets() {
        return bucketsThrough(maxId("SELECT MAX(s.id) FROM Spirit s WHERE s.status = :status",
                "status", SpiritStatus.ACTIVE));
    }

    public List<Long> contentBuckets() {
        long noticeMax = maxId("SELECT MAX(n.id) FROM Notice n WHERE n.isPublished = true AND n.deletedAt IS NULL");
        long postMax = maxId("""
                SELECT MAX(p.id) FROM Post p
                WHERE p.status = :active AND p.isHidden = false AND p.adultOnly = false
                """, "active", PostStatus.ACTIVE);
        long byobMax = maxId("SELECT MAX(b.id) FROM Byob b WHERE b.status <> :cancelled",
                "cancelled", ByobStatus.CANCELLED);
        return bucketsThrough(Math.max(noticeMax, Math.max(postMax, byobMax)));
    }

    private Map<SpiritCategory, Long> activeCategoryCounts() {
        Map<SpiritCategory, Long> counts = new EnumMap<>(SpiritCategory.class);
        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createQuery("""
                SELECT s.category, COUNT(s) FROM Spirit s
                WHERE s.status = :status
                GROUP BY s.category
                """)
                .setParameter("status", SpiritStatus.ACTIVE)
                .getResultList();
        for (Object[] row : rows) {
            if (row[0] instanceof SpiritCategory category && row[1] instanceof Number count) {
                counts.put(category, count.longValue());
            }
        }
        return counts;
    }

    private long maxId(String jpql, Object... parameterPairs) {
        Query query = em.createQuery(jpql);
        for (int i = 0; i < parameterPairs.length; i += 2) {
            query.setParameter((String) parameterPairs[i], parameterPairs[i + 1]);
        }
        Object value = query.getSingleResult();
        return value instanceof Number number ? number.longValue() : -1L;
    }

    private List<Long> bucketsThrough(long maxId) {
        if (maxId < 0) return List.of();
        long lastBucket = maxId / BUCKET_SIZE;
        List<Long> buckets = new ArrayList<>((int) Math.min(lastBucket + 1, Integer.MAX_VALUE));
        for (long bucket = 0; bucket <= lastBucket; bucket++) buckets.add(bucket);
        return buckets;
    }

    private StringBuilder startUrlSet() {
        StringBuilder sb = new StringBuilder(8192);
        sb.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
        sb.append("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n");
        return sb;
    }

    private String finishUrlSet(StringBuilder sb) {
        return sb.append("</urlset>\n").toString();
    }

    private void appendSitemap(StringBuilder sb, String path) {
        sb.append("  <sitemap><loc>").append(serializeLoc(normalizedSiteUrl() + path)).append("</loc></sitemap>\n");
    }

    private void appendMultilingualUrl(StringBuilder sb, String path, LocalDateTime lastmod) {
        String cleanPath = path.startsWith("/") ? path : "/" + path;
        appendUrl(sb, normalizedSiteUrl() + "/ko" + ("/".equals(cleanPath) ? "" : cleanPath), lastmod);
        appendUrl(sb, normalizedSiteUrl() + "/en" + ("/".equals(cleanPath) ? "" : cleanPath), lastmod);
    }

    private void appendKoreanUrl(StringBuilder sb, String path, LocalDateTime lastmod) {
        String cleanPath = path.startsWith("/") ? path : "/" + path;
        appendUrl(sb, normalizedSiteUrl() + "/ko" + ("/".equals(cleanPath) ? "" : cleanPath), lastmod);
    }

    private void appendUrl(StringBuilder sb, String loc, LocalDateTime lastmod) {
        sb.append("  <url>\n");
        sb.append("    <loc>").append(serializeLoc(loc)).append("</loc>\n");
        if (lastmod != null) {
            sb.append("    <lastmod>")
                    .append(lastmod.atZone(SERVICE_ZONE).format(W3C))
                    .append("</lastmod>\n");
        }
        sb.append("  </url>\n");
    }

    private String normalizedSiteUrl() {
        return siteUrl.endsWith("/") ? siteUrl.substring(0, siteUrl.length() - 1) : siteUrl;
    }

    private String serializeLoc(String loc) {
        return escape(URI.create(loc).toASCIIString());
    }

    private String escape(String value) {
        return value.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&apos;");
    }
}

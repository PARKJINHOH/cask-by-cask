package com.caskbycask.domain.seo.service;

import com.caskbycask.domain.byob.entity.enums.ByobStatus;
import com.caskbycask.domain.community.entity.enums.PostStatus;
import com.caskbycask.domain.seo.util.SpiritSlugUtils;
import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import com.caskbycask.domain.spirit.entity.enums.SpiritStatus;
import com.caskbycask.domain.spirit.entity.enums.VariantType;
import com.caskbycask.domain.spirit.entity.enums.WineVintageStatus;
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

    /** 활성 주류를 하나라도 가진 생산자만 — sitemap 과 bucket 계산이 같은 조건을 써야 어긋나지 않는다. */
    private static final String PRODUCER_HAS_ACTIVE_SPIRIT =
            "EXISTS (SELECT 1 FROM Spirit s WHERE s.producer = p AND s.status = :status)";
    private static final String PRODUCER_MAX_ID_JPQL =
            "SELECT MAX(p.id) FROM Producer p WHERE " + PRODUCER_HAS_ACTIVE_SPIRIT;
    private static final String PRODUCER_ROWS_JPQL =
            "SELECT p.id, p.updatedAt FROM Producer p"
                    + " WHERE " + PRODUCER_HAS_ACTIVE_SPIRIT
                    + " AND p.id >= :minId AND p.id < :maxId"
                    + " ORDER BY p.id";
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
        // youtube.xml 은 의도적으로 싣지 않는다 — 영상·채널 페이지는 제목·설명·썸네일이 모두
        // 남의 영상에서 온 값이라 noindex 로 전환했다. 색인 대상 유튜브 주소는 static.xml 의
        // /youtube 허브 하나뿐이며, 영상·채널은 내부 링크로만 발견된다.
        // (엔드포인트 자체는 살아 있다 — 되돌리려면 이 자리에 appendSitemap 한 줄만 복구하면 된다.)
        for (long bucket : producerBuckets()) {
            appendSitemap(sb, "/sitemaps/producers-" + bucket + ".xml");
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
        appendKoreanUrl(sb, "/community/photo", null);
        appendMultilingualUrl(sb, "/youtube", null);
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
                       s.category, s.vintageYear, wd.vintageStatus,
                       s.updatedAt
                FROM Spirit s
                LEFT JOIN s.wineDetail wd
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
            SpiritCategory category = (SpiritCategory) row[8];
            Integer vintageYear = (Integer) row[9];
            WineVintageStatus vintageStatus = (WineVintageStatus) row[10];
            LocalDateTime updatedAt = (LocalDateTime) row[11];
            String path = "en".equals(lang)
                    ? SpiritSlugUtils.canonicalPathEn(id, nameKo, nameEn, seriesIdentifier,
                    seriesIdentifierEn, variantType, variantValue, variantValueEn,
                    category, vintageYear, vintageStatus)
                    : SpiritSlugUtils.canonicalPathKo(id, nameKo, seriesIdentifier, variantType, variantValue,
                    category, vintageYear, vintageStatus);
            appendUrl(sb, normalizedSiteUrl() + path, updatedAt);
        }
        return finishUrlSet(sb);
    }

    /**
     * 생산자 상세 shard.
     *
     * <p>주류 shard 와 달리 KO/EN 경로가 언어 접두사만 다르고 slug 가 없어(`/{lang}/producers/{id}`)
     * 언어별로 파일을 나누지 않고 한 shard 에 두 언어를 함께 싣는다.
     *
     * <p>활성 주류가 하나도 없는 생산자는 제외한다 — 목록이 비어 있는 페이지를 sitemap 에 올리면
     * 빈약한 콘텐츠를 색인 대상으로 제출하는 셈이다. 빈 카테고리를 static shard 에서 빼는 것과 같은 기준이다.
     */
    @Transactional(readOnly = true)
    public String generateProducerSitemap(long bucket) {
        if (bucket < 0) throw new IllegalArgumentException("Unsupported sitemap shard");
        long minId = Math.multiplyExact(bucket, BUCKET_SIZE);
        long maxId = Math.addExact(minId, BUCKET_SIZE);

        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createQuery(PRODUCER_ROWS_JPQL)
                .setParameter("status", SpiritStatus.ACTIVE)
                .setParameter("minId", minId)
                .setParameter("maxId", maxId)
                .getResultList();

        StringBuilder sb = startUrlSet();
        for (Object[] row : rows) {
            appendMultilingualUrl(sb, "/producers/" + row[0], (LocalDateTime) row[1]);
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

    /**
     * 유튜브 갤러리 영상 상세.
     * <p>
     * <b>현재 사이트맵 인덱스에 등재되지 않는다.</b> 영상·채널 페이지가 noindex 로 바뀌었기 때문이다
     * ({@code generateSitemapIndex} 주석 참고). 엔드포인트는 롤백과 수동 점검을 위해 남겨 둔다.
     * <p>
     * 채널당 최신 15편씩만 쌓이는 목록이라 버킷을 나누지 않는다 — 5만 URL 상한에 닿으려면
     * 채널이 3천 개를 넘어야 한다. 그때가 오면 주류 사이트맵처럼 샤딩할 것.
     * 노출 채널 × 노출 영상 교집합만 담아 색인과 화면이 어긋나지 않게 한다.
     */
    @Transactional(readOnly = true)
    public String generateYoutubeSitemap() {
        StringBuilder sb = startUrlSet();

        // 채널 랜딩 페이지가 먼저다 — 영상 상세보다 상위 개념이고 수가 적어 크롤러가 일찍 만난다.
        @SuppressWarnings("unchecked")
        List<Object[]> channels = em.createQuery("""
                SELECT c.handle, c.channelKey, c.updatedAt FROM YoutubeChannel c
                WHERE c.isVisible = true AND c.permissionConfirmed = true
                ORDER BY c.sortOrder, c.id
                """)
                .getResultList();
        for (Object[] row : channels) {
            String ref = row[0] != null ? (String) row[0] : (String) row[1];
            appendMultilingualUrl(sb, "/youtube/channels/" + ref, (LocalDateTime) row[2]);
        }

        @SuppressWarnings("unchecked")
        List<Object[]> videos = em.createQuery("""
                SELECT v.videoKey, v.updatedAt FROM YoutubeVideo v
                JOIN v.channel c
                WHERE v.isVisible = true
                  AND c.isVisible = true AND c.permissionConfirmed = true
                ORDER BY v.publishedAt DESC
                """)
                .getResultList();
        for (Object[] row : videos) {
            appendMultilingualUrl(sb, "/youtube/" + row[0], (LocalDateTime) row[1]);
        }
        return finishUrlSet(sb);
    }

    public List<Long> producerBuckets() {
        return bucketsThrough(maxId(PRODUCER_MAX_ID_JPQL, "status", SpiritStatus.ACTIVE));
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

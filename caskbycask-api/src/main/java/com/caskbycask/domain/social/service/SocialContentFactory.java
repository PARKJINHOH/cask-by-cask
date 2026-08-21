package com.caskbycask.domain.social.service;

import com.caskbycask.domain.community.entity.Post;
import com.caskbycask.domain.community.entity.enums.BoardType;
import com.caskbycask.domain.community.repository.PostRepository;
import com.caskbycask.domain.review.entity.Review;
import com.caskbycask.domain.review.repository.ReviewRepository;
import com.caskbycask.domain.seo.util.SpiritSlugUtils;
import com.caskbycask.domain.social.config.SocialPublishingProperties;
import com.caskbycask.domain.social.entity.SocialPublishBundle;
import com.caskbycask.domain.social.entity.enums.SocialPlatform;
import com.caskbycask.domain.social.entity.enums.SocialSourceType;
import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.spirit.entity.SpiritImage;
import com.caskbycask.domain.spirit.entity.enums.WineVintageStatus;
import com.caskbycask.domain.spirit.repository.SpiritImageRepository;
import lombok.RequiredArgsConstructor;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.nodes.Node;
import org.jsoup.nodes.TextNode;
import org.jsoup.select.NodeTraversor;
import org.jsoup.select.NodeVisitor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class SocialContentFactory {

    private static final int INSTAGRAM_CAPTION_LIMIT = 1800;
    private static final int THREADS_CAPTION_LIMIT = 400;
    private static final int REVIEW_AROMA_LIMIT = 80;
    private static final String NEWS_SITE_NOTICE =
            "자세한 내용은 CaskByCask(캐바캐) 홈페이지를 확인해주세요";

    /** 소식 본문 HTML → 평문 변환 시 줄바꿈으로 취급할 블록 태그. */
    private static final Set<String> BLOCK_TAGS = Set.of(
            "p", "div", "h1", "h2", "h3", "h4", "h5", "h6",
            "ul", "ol", "li", "blockquote", "pre", "hr", "table", "tr");
    /** 웹 본문에서 white-space: pre-wrap 이 적용되어 원본 개행이 보이는 태그. */
    private static final Set<String> PRE_WRAP_TAGS = Set.of("p", "pre");
    /** 개행을 제외한 공백(nbsp 포함). */
    private static final Pattern SPACES_EXCEPT_NEWLINE = Pattern.compile("[ \\t\\f\\u000B\\u00A0]+");

    private final ReviewRepository reviewRepository;
    private final PostRepository postRepository;
    private final SpiritImageRepository spiritImageRepository;
    private final SocialPublishingProperties properties;

    @Transactional(readOnly = true)
    public SocialPublicationContent create(SocialPublishBundle bundle, SocialPlatform platform) {
        if (bundle.isSourceDeleted() || bundle.getContentType() == null || bundle.getContentId() == null) {
            throw new IllegalStateException("원본 콘텐츠가 공개 상태가 아닙니다.");
        }
        if (bundle.getContentType() == SocialSourceType.REVIEW) {
            return reviewContent(bundle, platform);
        }
        if (bundle.getContentType() == SocialSourceType.POST) {
            return postContent(bundle, platform);
        }
        throw new IllegalStateException("지원하지 않는 SNS 원본 유형입니다.");
    }

    private SocialPublicationContent reviewContent(SocialPublishBundle bundle, SocialPlatform platform) {
        Review review = reviewRepository.findPublicById(bundle.getContentId())
                .orElseThrow(() -> new IllegalStateException("리뷰가 삭제되었거나 비공개 상태입니다."));
        Spirit spirit = review.getSpirit();
        String name = "en".equals(bundle.getLocale())
                ? SpiritSlugUtils.displayNameEn(spirit) : SpiritSlugUtils.displayNameKo(spirit);
        String shortUrl = normalizedSiteUrl() + "/s/" + bundle.getShortCode();
        boolean english = "en".equals(bundle.getLocale());
        String linkLine = shortUrl;
        String linkBlock = (english ? "Find the full review via the link in our bio 🔗"
                                    : "전체 리뷰는 프로필 링크에서 확인하세요 🔗")
                + "\n" + linkLine;
        String hashtagBlock = reviewHashtags(
                spirit, reviewHashtagDisplayName(spirit, english));
        int limit = captionLimit(platform);
        String title = name + (english ? " Review" : " 후기");
        List<ReviewSection> sections = reviewSections(review, english);
        String detailsSkeleton = reviewDetailsSkeleton(sections, english);
        String captionSuffix = "\n\n" + linkBlock + detailsSkeleton
                + "\n\n" + hashtagBlock;
        int titleLimit = Math.max(0, limit - codePointLength(captionSuffix));
        String renderedTitle = truncateWithDots(title, titleLimit);
        int reviewTextLimit = Math.max(0, limit
                - codePointLength(renderedTitle)
                - codePointLength(captionSuffix));
        String reviewDetails = renderReviewDetails(sections, english, reviewTextLimit);
        String caption = truncate(renderedTitle + "\n\n" + linkBlock + reviewDetails
                + "\n\n" + hashtagBlock, limit);
        String imageUrl = primaryImageUrl(spirit);
        if (imageUrl == null) throw new IllegalStateException("리뷰에 게시 가능한 대표 이미지가 없습니다.");
        return new SocialPublicationContent(
                caption,
                imageUrl,
                "/" + bundle.getLocale() + "/reviews/" + review.getId(),
                name,
                reviewImageTitle(spirit, english, name),
                english ? "Review" : "후기",
                reviewImageIdentifier(spirit, english),
                reviewImageNotice(spirit, english)
        );
    }

    private SocialPublicationContent postContent(SocialPublishBundle bundle, SocialPlatform platform) {
        Post post = postRepository.findById(bundle.getContentId())
                .filter(value -> value.getBoardType() == BoardType.NOTICE)
                .filter(value -> !Boolean.TRUE.equals(value.getIsHidden()))
                .orElseThrow(() -> new IllegalStateException("소식이 삭제되었거나 비공개 상태입니다."));
        String text = newsPlainText(post.getContentSanitized());
        String shortUrl = normalizedSiteUrl() + "/s/" + bundle.getShortCode();
        String hashtags = post.getHashtags().isEmpty() ? "" : "\n\n"
                + post.getHashtags().stream().map(tag -> "#" + tag).reduce((a, b) -> a + " " + b).orElse("");
        String prefix = post.getTitle() + "\n\n";
        String siteNotice = "\n\n[" + NEWS_SITE_NOTICE + "]";
        int limit = captionLimit(platform);
        int reserve = shortUrl.length() + siteNotice.length() + hashtags.length() + 2;
        String body = prefix + truncate(text, Math.max(0, limit - reserve - prefix.length()))
                + siteNotice + "\n\n" + shortUrl + hashtags;
        return new SocialPublicationContent(
                truncate(body, limit),
                bundle.getDirectImageUrl(),
                "/" + bundle.getLocale() + "/community/notice/" + post.getId(),
                post.getTitle(),
                post.getTitle(),
                post.getPrefix() != null ? post.getPrefix().getName() : "일반"
        );
    }

    /**
     * 소식 본문 HTML을 SNS 캡션용 평문으로 변환한다.
     * 웹 본문(.notice-content) 렌더링과 동일하게 블록 태그·{@code <br>}·
     * {@code <p>} 내부 개행(white-space: pre-wrap)을 줄바꿈으로 살린다.
     */
    private static String newsPlainText(String html) {
        if (html == null || html.isBlank()) return "";
        Document document = Jsoup.parseBodyFragment(html);
        document.outputSettings().prettyPrint(false);
        StringBuilder builder = new StringBuilder();
        NodeTraversor.traverse(new NodeVisitor() {
            @Override
            public void head(Node node, int depth) {
                if (node instanceof TextNode textNode) {
                    builder.append(keepsRawLineBreaks(textNode)
                            ? SPACES_EXCEPT_NEWLINE.matcher(textNode.getWholeText()).replaceAll(" ")
                            : textNode.text());
                } else if (node instanceof Element element && "br".equals(element.tagName())) {
                    builder.append('\n');
                }
            }

            @Override
            public void tail(Node node, int depth) {
                if (node instanceof Element element && BLOCK_TAGS.contains(element.tagName())) {
                    builder.append('\n');
                }
            }
        }, document.body());
        return normalizeCaptionLines(builder.toString());
    }

    /** {@code white-space: pre-wrap} 이 적용되는 블록 안의 텍스트는 원본 개행을 유지한다. */
    private static boolean keepsRawLineBreaks(TextNode node) {
        for (Node parent = node.parent(); parent != null; parent = parent.parent()) {
            if (parent instanceof Element element && PRE_WRAP_TAGS.contains(element.tagName())) {
                return true;
            }
        }
        return false;
    }

    /** 줄 단위 공백 정리 + 연속 빈 줄은 1줄까지만 유지(SNS 글자 수 절약). */
    private static String normalizeCaptionLines(String value) {
        List<String> lines = new ArrayList<>();
        int blankRun = 0;
        for (String raw : value.replace("\r\n", "\n").replace('\r', '\n').split("\n", -1)) {
            String line = SPACES_EXCEPT_NEWLINE.matcher(raw).replaceAll(" ").trim();
            if (line.isEmpty()) {
                if (lines.isEmpty() || ++blankRun > 1) continue;
                lines.add("");
            } else {
                blankRun = 0;
                lines.add(line);
            }
        }
        while (!lines.isEmpty() && lines.getLast().isEmpty()) lines.removeLast();
        return String.join("\n", lines);
    }

    private String primaryImageUrl(Spirit spirit) {
        String direct = firstImageUrl(spirit.getId());
        if (direct != null) return direct;
        return spirit.getParent() != null ? firstImageUrl(spirit.getParent().getId()) : null;
    }

    private String firstImageUrl(Long spiritId) {
        return spiritImageRepository.findBySpiritIdAndIsPrimaryTrue(spiritId)
                .map(SpiritImage::getImageUrl)
                .orElseGet(() -> {
                    List<SpiritImage> images = spiritImageRepository.findBySpiritIdOrderBySortOrderAscIdAsc(spiritId);
                    return images.isEmpty() ? null : images.getFirst().getImageUrl();
                });
    }

    private static void appendLine(StringBuilder target, String label, String value) {
        if (value != null && !value.isBlank()) {
            target.append(label).append(": ").append(value.trim()).append("\n");
        }
    }

    private static List<ReviewSection> reviewSections(Review review, boolean english) {
        List<ReviewSection> sections = new ArrayList<>(3);
        addReviewSection(sections, english ? "Nose" : "향",
                review.getNoseAromaWheelNotes(), review.getNoseNote());
        addReviewSection(sections, english ? "Taste" : "맛",
                review.getTasteAromaWheelNotes(), review.getTasteNote());
        addReviewSection(sections, english ? "Finish" : "피니시",
                review.getFinishAromaWheelNotes(), review.getFinishNote());
        return sections;
    }

    private static void addReviewSection(List<ReviewSection> sections, String label,
                                         String aromaNotes, String tastingNote) {
        String aromas = formatAromaNotes(aromaNotes);
        String note = tastingNote == null || tastingNote.isBlank() ? null : tastingNote.trim();
        if (aromas != null || note != null) {
            sections.add(new ReviewSection(label, aromas, note));
        }
    }

    private static String reviewDetailsSkeleton(List<ReviewSection> sections, boolean english) {
        StringBuilder details = new StringBuilder();
        for (ReviewSection section : sections) {
            details.append("\n\n").append(section.label());
            if (section.aromas() != null) {
                details.append("\n").append(english ? "Aroma: " : "아로마: ");
            }
            if (section.tastingNote() != null) {
                details.append("\n").append(english ? "Tasting note: " : "테이스팅 노트: ");
            }
        }
        return details.toString();
    }

    private static String renderReviewDetails(List<ReviewSection> sections, boolean english,
                                              int textLimit) {
        List<String> values = new ArrayList<>(sections.size() * 2);
        for (ReviewSection section : sections) {
            if (section.aromas() != null) values.add(section.aromas());
            if (section.tastingNote() != null) values.add(section.tastingNote());
        }
        int[] allocations = allocateEvenly(values, textLimit);
        int valueIndex = 0;
        StringBuilder details = new StringBuilder();
        for (ReviewSection section : sections) {
            details.append("\n\n").append(section.label());
            if (section.aromas() != null) {
                details.append("\n").append(english ? "Aroma: " : "아로마: ")
                        .append(truncateWithDots(section.aromas(), allocations[valueIndex++]));
            }
            if (section.tastingNote() != null) {
                details.append("\n").append(english ? "Tasting note: " : "테이스팅 노트: ")
                        .append(truncateWithDots(section.tastingNote(), allocations[valueIndex++]));
            }
        }
        return details.toString();
    }

    /** 긴 한 필드가 뒤의 향·맛·피니시를 밀어내지 않도록 가변 본문 길이를 고르게 배분한다. */
    private static int[] allocateEvenly(List<String> values, int totalLimit) {
        int[] allocations = new int[values.size()];
        int remaining = totalLimit;
        boolean allocated = true;
        while (remaining > 0 && allocated) {
            allocated = false;
            for (int i = 0; i < values.size() && remaining > 0; i++) {
                if (allocations[i] >= codePointLength(values.get(i))) continue;
                allocations[i]++;
                remaining--;
                allocated = true;
            }
        }
        return allocations;
    }

    private static String formatAromaNotes(String raw) {
        if (raw == null || raw.isBlank()) return null;
        List<String> labels = new ArrayList<>();
        for (String part : raw.split(",")) {
            if (part == null || part.isBlank()) continue;
            boolean custom = part.startsWith("c:");
            String value = custom ? decodeAroma(part.substring(2)) : part;
            value = value.replace('_', ' ').trim();
            if (!custom && !value.isEmpty()) {
                value = Character.toUpperCase(value.charAt(0)) + value.substring(1);
            }
            if (!value.isEmpty()) labels.add(value);
        }
        if (labels.isEmpty()) return null;
        return truncateWithDots(String.join(" · ", labels), REVIEW_AROMA_LIMIT);
    }

    private static String reviewHashtags(Spirit spirit, String displayName) {
        List<String> tags = new ArrayList<>(4);
        String categoryTag = switch (spirit.getCategory()) {
            case WHISKY -> "#위스키";
            case WINE -> "#와인";
            case COGNAC -> "#꼬냑";
            default -> null;
        };
        if (categoryTag != null) tags.add(categoryTag);
        String spiritNameTag = hashtag(displayName);
        if (spiritNameTag != null) tags.add(spiritNameTag);
        tags.add("#캐바캐");
        tags.add("#CaskByCask");
        return String.join(" ", tags);
    }

    private static String reviewHashtagDisplayName(Spirit spirit, boolean english) {
        if (!english) return SpiritSlugUtils.displayNameKo(spirit);

        List<String> parts = new ArrayList<>();
        addIfPresent(parts, spirit.getNameEn());
        if (SpiritSlugUtils.hasEdition(spirit)) {
            addIfPresent(parts, spirit.getSeriesIdentifierEn());
            addIfPresent(parts, spirit.getVariantValueEn());
        }
        WineVintageStatus vintageStatus = spirit.getWineDetail() != null
                ? spirit.getWineDetail().getVintageStatus() : null;
        return SpiritSlugUtils.appendWineVintage(
                String.join(" ", parts),
                spirit.getCategory(),
                spirit.getVintageYear(),
                vintageStatus
        );
    }

    private static void addIfPresent(List<String> values, String value) {
        if (value != null && !value.isBlank()) values.add(value.trim());
    }

    private static String reviewImageTitle(Spirit spirit, boolean english, String fullName) {
        if (!SpiritSlugUtils.hasEdition(spirit)) return fullName;

        List<String> parts = new ArrayList<>(2);
        addIfPresent(parts, english
                ? firstNonBlank(spirit.getNameEn(), spirit.getNameKo())
                : spirit.getNameKo());
        addIfPresent(parts, english
                ? firstNonBlank(spirit.getSeriesIdentifierEn(), spirit.getSeriesIdentifier())
                : spirit.getSeriesIdentifier());
        return parts.isEmpty() ? fullName : String.join(" ", parts);
    }

    private static String reviewImageIdentifier(Spirit spirit, boolean english) {
        if (!SpiritSlugUtils.hasEdition(spirit)) return null;
        return english
                ? firstNonBlank(spirit.getVariantValueEn(), spirit.getVariantValue())
                : firstNonBlank(spirit.getVariantValue(), null);
    }

    private static String reviewImageNotice(Spirit spirit, boolean english) {
        if (!SpiritSlugUtils.hasEdition(spirit)) return null;
        return english
                ? "Representative image may differ from the reviewed edition."
                : "※ 대표 이미지는 리뷰한 에디션과 다를 수 있습니다.";
    }

    private static String firstNonBlank(String primary, String fallback) {
        if (primary != null && !primary.isBlank()) return primary.trim();
        return fallback == null ? null : fallback.trim();
    }

    private static String hashtag(String value) {
        if (value == null || value.isBlank()) return null;
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFKC)
                .replaceAll("[^\\p{L}\\p{N}_]", "");
        return normalized.isBlank() ? null : "#" + normalized;
    }

    private static String decodeAroma(String value) {
        try {
            return URLDecoder.decode(value, StandardCharsets.UTF_8);
        } catch (IllegalArgumentException ignored) {
            return value;
        }
    }

    private static int captionLimit(SocialPlatform platform) {
        return platform == SocialPlatform.INSTAGRAM
                ? INSTAGRAM_CAPTION_LIMIT : THREADS_CAPTION_LIMIT;
    }

    private static int codePointLength(String value) {
        return value == null ? 0 : value.codePointCount(0, value.length());
    }

    private static String truncate(String value, int maxCodePoints) {
        if (value == null) return "";
        if (maxCodePoints <= 0) return "";
        int count = value.codePointCount(0, value.length());
        if (count <= maxCodePoints) return value;
        if (maxCodePoints == 1) return "…";
        int end = value.offsetByCodePoints(0, Math.max(1, maxCodePoints - 1));
        String shortened = value.substring(0, end).stripTrailing();
        int lastSpace = shortened.lastIndexOf(' ');
        if (lastSpace > shortened.length() * 0.7) shortened = shortened.substring(0, lastSpace);
        return shortened + "…";
    }

    private static String truncateWithDots(String value, int maxCodePoints) {
        if (value == null) return "";
        int count = value.codePointCount(0, value.length());
        if (count <= maxCodePoints) return value;
        if (maxCodePoints <= 3) return ".".repeat(Math.max(0, maxCodePoints));
        int end = value.offsetByCodePoints(0, maxCodePoints - 3);
        String shortened = value.substring(0, end).stripTrailing();
        int lastSpace = shortened.lastIndexOf(' ');
        if (lastSpace > shortened.length() * 0.7) shortened = shortened.substring(0, lastSpace);
        return shortened + "...";
    }

    private String normalizedSiteUrl() {
        return properties.getSiteUrl().replaceAll("/+$", "");
    }

    private record ReviewSection(String label, String aromas, String tastingNote) {}
}

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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SocialContentFactory {

    private static final int REVIEW_AROMA_LIMIT = 80;
    private static final int REVIEW_OVERALL_LIMIT = 200;
    private static final String NEWS_SITE_NOTICE =
            "자세한 내용은 CaskByCask(캐바캐) 홈페이지를 확인해주세요";

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
        int limit = platform == SocialPlatform.INSTAGRAM ? 2200 : 500;
        int contentLimit = Math.max(40, limit
                - linkBlock.codePointCount(0, linkBlock.length())
                - hashtagBlock.codePointCount(0, hashtagBlock.length())
                - 4);
        String title = name + (english ? " Review" : " 후기");
        String renderedTitle = truncateWithDots(title, contentLimit);
        StringBuilder content = new StringBuilder(renderedTitle);
        appendReviewAromaSection(content, english ? "Nose" : "향",
                review.getNoseAromaWheelNotes(), english, contentLimit);
        appendReviewAromaSection(content, english ? "Taste" : "맛",
                review.getTasteAromaWheelNotes(), english, contentLimit);
        appendReviewAromaSection(content, english ? "Finish" : "피니시",
                review.getFinishAromaWheelNotes(), english, contentLimit);
        String overall = review.getComment();
        if (overall != null && !overall.isBlank()) {
            String overallPrefix = "\n\n" + (english ? "Overall: " : "총평: ");
            int remaining = contentLimit
                    - content.toString().codePointCount(0, content.length())
                    - overallPrefix.codePointCount(0, overallPrefix.length());
            if (remaining > 0) {
                content.append(overallPrefix)
                        .append(truncateWithDots(overall.trim(),
                                Math.min(REVIEW_OVERALL_LIMIT, remaining)));
            }
        }
        String contentText = truncateWithDots(content.toString(), contentLimit);
        String reviewDetails = contentText.substring(
                Math.min(renderedTitle.length(), contentText.length()));
        String caption = renderedTitle + "\n\n" + linkBlock + reviewDetails
                + "\n\n" + hashtagBlock;
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
        String text = Jsoup.parse(post.getContentSanitized()).text().replaceAll("\\s+", " ").trim();
        String shortUrl = normalizedSiteUrl() + "/s/" + bundle.getShortCode();
        String hashtags = post.getHashtags().isEmpty() ? "" : "\n\n"
                + post.getHashtags().stream().map(tag -> "#" + tag).reduce((a, b) -> a + " " + b).orElse("");
        String prefix = post.getTitle() + "\n\n";
        String siteNotice = "\n\n[" + NEWS_SITE_NOTICE + "]";
        int limit = platform == SocialPlatform.INSTAGRAM ? 2200 : 500;
        int reserve = shortUrl.length() + siteNotice.length() + hashtags.length() + 2;
        String body = prefix + truncate(text, Math.max(0, limit - reserve - prefix.length()))
                + siteNotice + hashtags + "\n\n" + shortUrl;
        return new SocialPublicationContent(
                truncate(body, limit),
                bundle.getDirectImageUrl(),
                "/" + bundle.getLocale() + "/community/notice/" + post.getId(),
                post.getTitle(),
                post.getTitle(),
                post.getPrefix() != null ? post.getPrefix().getName() : "일반"
        );
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

    private static void appendReviewAromaSection(StringBuilder target, String label,
                                                 String aromaNotes, boolean english,
                                                 int contentLimit) {
        String aromas = formatAromaNotes(aromaNotes);
        if (aromas == null) return;

        String prefix = "\n\n" + label + "\n" + (english ? "Aromas: " : "아로마: ");
        int remaining = contentLimit
                - target.toString().codePointCount(0, target.length())
                - prefix.codePointCount(0, prefix.length());
        if (remaining <= 3) return;
        target.append(prefix)
                .append(truncateWithDots(aromas, Math.min(REVIEW_AROMA_LIMIT, remaining)));
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
}

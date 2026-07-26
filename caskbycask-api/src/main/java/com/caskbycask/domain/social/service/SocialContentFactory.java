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
import com.caskbycask.domain.spirit.repository.SpiritImageRepository;
import lombok.RequiredArgsConstructor;
import org.jsoup.Jsoup;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SocialContentFactory {

    private static final int REVIEW_AROMA_LIMIT = 80;
    private static final int REVIEW_OVERALL_LIMIT = 200;

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
        StringBuilder body = new StringBuilder(name).append("\n\n");
        appendReviewAromaSection(body, english ? "Nose" : "향",
                review.getNoseAromaWheelNotes(), english);
        appendReviewAromaSection(body, english ? "Taste" : "맛",
                review.getTasteAromaWheelNotes(), english);
        appendReviewAromaSection(body, english ? "Finish" : "피니시",
                review.getFinishAromaWheelNotes(), english);
        String linkLine = (english ? "Read the full review → " : "전체 리뷰 보기 → ") + shortUrl;
        int limit = platform == SocialPlatform.INSTAGRAM ? 2200 : 500;
        int contentLimit = Math.max(40, limit - linkLine.codePointCount(0, linkLine.length()) - 2);
        String content = body.toString().stripTrailing();
        String overall = review.getComment();
        if (overall != null && !overall.isBlank()) {
            String overallLabel = english ? "Overall: " : "총평: ";
            int remaining = contentLimit
                    - content.codePointCount(0, content.length())
                    - overallLabel.codePointCount(0, overallLabel.length())
                    - 2;
            if (remaining > 0) {
                content += "\n\n" + overallLabel
                        + truncateWithDots(overall.trim(), Math.min(REVIEW_OVERALL_LIMIT, remaining));
            }
        }
        String caption = truncateWithDots(content, contentLimit) + "\n\n" + linkLine;
        String imageUrl = primaryImageUrl(spirit);
        if (imageUrl == null) throw new IllegalStateException("리뷰에 게시 가능한 대표 이미지가 없습니다.");
        return new SocialPublicationContent(
                caption,
                imageUrl,
                "/" + bundle.getLocale() + "/reviews/" + review.getId(),
                name
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
        int limit = platform == SocialPlatform.INSTAGRAM ? 2200 : 500;
        int reserve = shortUrl.length() + hashtags.length() + 3;
        String body = prefix + truncate(text, Math.max(40, limit - reserve - prefix.length()))
                + hashtags + "\n\n" + shortUrl;
        return new SocialPublicationContent(
                truncate(body, limit),
                bundle.getDirectImageUrl(),
                "/" + bundle.getLocale() + "/community/notice/" + post.getId(),
                post.getTitle()
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
                                                 String aromaNotes, boolean english) {
        String aromas = formatAromaNotes(aromaNotes);
        if (aromas == null) return;

        target.append(label).append("\n");
        appendLine(target, english ? "Aromas" : "아로마", aromas);
        target.append("\n");
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

    private static String decodeAroma(String value) {
        try {
            return URLDecoder.decode(value, StandardCharsets.UTF_8);
        } catch (IllegalArgumentException ignored) {
            return value;
        }
    }

    private static String truncate(String value, int maxCodePoints) {
        if (value == null) return "";
        int count = value.codePointCount(0, value.length());
        if (count <= maxCodePoints) return value;
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

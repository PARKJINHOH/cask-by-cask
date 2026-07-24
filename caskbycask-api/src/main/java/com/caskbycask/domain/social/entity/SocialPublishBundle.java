package com.caskbycask.domain.social.entity;

import com.caskbycask.domain.social.entity.enums.SocialMediaMode;
import com.caskbycask.domain.social.entity.enums.SocialSourceType;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "social_publish_bundles")
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class SocialPublishBundle extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private SocialSourceType originType;

    @Column(nullable = false)
    private Long originId;

    @Enumerated(EnumType.STRING)
    @Column(length = 30)
    private SocialSourceType contentType;

    private Long contentId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "requested_by_id")
    private User requestedBy;

    @Column(nullable = false, length = 5)
    private String locale;

    @Column(nullable = false, length = 30)
    private String consentVersion;

    @Column(nullable = false)
    private LocalDateTime consentedAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private SocialMediaMode mediaMode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "thumbnail_template_id")
    private SocialThumbnailTemplate thumbnailTemplate;

    @Column(length = 200)
    private String thumbnailText;

    @Column(length = 1000)
    private String directImageUrl;

    @Column(length = 1000)
    private String renderedImageUrl;

    @Column(nullable = false, unique = true, length = 16)
    private String shortCode;

    @Builder.Default
    @Column(nullable = false)
    private boolean sourceDeleted = false;

    public void bindContent(SocialSourceType type, Long id) {
        this.contentType = type;
        this.contentId = id;
    }

    public void setRenderedImageUrl(String renderedImageUrl) {
        this.renderedImageUrl = renderedImageUrl;
    }

    public void clearRenderedImage() {
        this.renderedImageUrl = null;
    }

    public void markSourceDeleted() {
        this.sourceDeleted = true;
    }
}

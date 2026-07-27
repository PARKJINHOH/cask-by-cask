package com.caskbycask.domain.social.entity;

import com.caskbycask.domain.social.entity.enums.SocialMediaRole;
import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "social_publish_bundle_media",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_social_bundle_media_order",
                columnNames = {"bundle_id", "sort_order"}))
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class SocialPublishBundleMedia extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "bundle_id", nullable = false)
    private SocialPublishBundle bundle;

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder;

    @Enumerated(EnumType.STRING)
    @Column(name = "media_role", nullable = false, length = 30)
    private SocialMediaRole mediaRole;

    @Column(name = "source_image_url", nullable = false, length = 1000)
    private String sourceImageUrl;

    @Column(name = "rendered_image_url", length = 1000)
    private String renderedImageUrl;

    public void rendered(String renderedImageUrl) {
        this.renderedImageUrl = renderedImageUrl;
    }
}

package com.caskbycask.domain.review.entity;

import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "review_images", indexes = {
        @Index(name = "idx_review_image_review_order", columnList = "review_id, sort_order, id"),
        @Index(name = "idx_review_image_variant_order", columnList = "variant_review_request_id, sort_order, id")
}, uniqueConstraints = @UniqueConstraint(
        name = "uk_review_image_saved_file", columnNames = "saved_file_name"))
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class ReviewImage extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "review_id")
    private Review review;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "variant_review_request_id")
    private SpiritVariantReviewRequest variantReviewRequest;

    @Column(name = "saved_file_name", nullable = false, length = 255)
    private String savedFileName;

    @Column(name = "sub_path", nullable = false, length = 255)
    private String subPath;

    @Column(name = "mime_type", nullable = false, length = 100)
    private String mimeType;

    @Column(name = "image_url", nullable = false, length = 1000)
    private String imageUrl;

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder;

    public void bindToReview(Review review, int sortOrder) {
        this.review = review;
        this.variantReviewRequest = null;
        this.sortOrder = sortOrder;
    }

    public void reorder(int sortOrder) {
        this.sortOrder = sortOrder;
    }
}

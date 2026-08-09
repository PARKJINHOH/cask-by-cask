package com.caskbycask.domain.review.entity;

import com.caskbycask.domain.review.entity.enums.AromaProfilePhase;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(
        name = "review_aroma_profiles",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_review_aroma_profile_review_phase", columnNames = {"review_id", "phase"}),
                @UniqueConstraint(name = "uk_review_aroma_profile_request_phase", columnNames = {"variant_review_request_id", "phase"})
        },
        indexes = {
                @Index(name = "idx_review_aroma_profile_review", columnList = "review_id"),
                @Index(name = "idx_review_aroma_profile_request", columnList = "variant_review_request_id")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class ReviewAromaProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "review_id")
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Review review;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "variant_review_request_id")
    @OnDelete(action = OnDeleteAction.CASCADE)
    private SpiritVariantReviewRequest variantReviewRequest;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10, columnDefinition = "enum('FINISH','NOSE','PALATE')")
    private AromaProfilePhase phase;

    @Column(nullable = false)
    private Integer schemaVersion;

    @Builder.Default
    @OneToMany(mappedBy = "profile", cascade = CascadeType.ALL, orphanRemoval = true)
    @OnDelete(action = OnDeleteAction.CASCADE)
    @OrderBy("sortOrder ASC")
    private List<ReviewAromaProfileItem> items = new ArrayList<>();

    public void addItem(ReviewAromaProfileItem item) {
        items.add(item);
        item.attach(this);
    }

    public void transferToReview(Review targetReview) {
        this.review = targetReview;
        this.variantReviewRequest = null;
    }
}

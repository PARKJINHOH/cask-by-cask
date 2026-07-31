package com.caskbycask.domain.review.entity;

import com.caskbycask.domain.review.entity.enums.VariantReviewRequestStatus;
import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.spirit.entity.enums.VariantType;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "spirit_variant_review_request",
        indexes = {
                @Index(name = "idx_variant_review_request_master", columnList = "master_spirit_id"),
                @Index(name = "idx_variant_review_request_user", columnList = "request_user_id"),
                @Index(name = "idx_variant_review_request_status", columnList = "status"),
                @Index(name = "idx_variant_review_request_created", columnList = "created_at"),
                @Index(name = "idx_variant_review_request_value", columnList = "master_spirit_id, variant_value")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class SpiritVariantReviewRequest extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "master_spirit_id", nullable = false)
    private Spirit masterSpirit;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "request_user_id", nullable = false)
    private User requestUser;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private VariantType variantType;

    @Column(nullable = false, length = 100)
    private String variantValue;

    @Column(length = 100)
    private String variantValueEn;

    @Column(length = 100)
    private String seriesIdentifier;

    @Column(length = 100)
    private String seriesIdentifierEn;

    @Column(nullable = false, precision = 4, scale = 1)
    private BigDecimal abv;

    @Column(nullable = false)
    private Integer volumeMl;

    @Column(length = 500)
    private String requestMemo;

    @Column(nullable = false, precision = 4, scale = 1)
    private BigDecimal noseScore;

    @Column(nullable = false, precision = 4, scale = 1)
    private BigDecimal tasteScore;

    @Column(nullable = false, precision = 4, scale = 1)
    private BigDecimal finishScore;

    @Column(nullable = false, precision = 4, scale = 1)
    private BigDecimal totalScore;

    @Column(length = 1000)
    private String noseNote;

    @Column(length = 1000)
    private String tasteNote;

    @Column(length = 1000)
    private String finishNote;

    @Column(length = 1000)
    private String comment;

    @Column(length = 800)
    private String noseAromaWheelNotes;

    @Column(length = 800)
    private String tasteAromaWheelNotes;

    @Column(length = 800)
    private String finishAromaWheelNotes;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(nullable = false, length = 20)
    private VariantReviewRequestStatus status = VariantReviewRequestStatus.PENDING;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "linked_variant_id")
    private Spirit linkedVariant;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "review_id")
    private Review review;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by_id")
    private User reviewedBy;

    @Column
    private LocalDateTime reviewedAt;

    @Column(length = 500)
    private String rejectReason;

    @PrePersist
    @PreUpdate
    private void calculateTotalScore() {
        if (noseScore != null && tasteScore != null && finishScore != null) {
            this.totalScore = noseScore.add(tasteScore).add(finishScore)
                    .divide(BigDecimal.valueOf(3), 1, RoundingMode.HALF_UP);
        }
    }

    public void approve(Spirit linkedVariant, Review review, User reviewer, boolean merged) {
        this.linkedVariant = linkedVariant;
        this.review = review;
        this.reviewedBy = reviewer;
        this.reviewedAt = LocalDateTime.now();
        this.rejectReason = null;
        this.status = merged ? VariantReviewRequestStatus.MERGED : VariantReviewRequestStatus.APPROVED;
    }

    public void applyEditionData(String variantValue, String variantValueEn, BigDecimal abv, Integer volumeMl) {
        this.variantValue = variantValue;
        this.variantValueEn = variantValueEn;
        this.abv = abv;
        this.volumeMl = volumeMl;
    }

    public void updatePending(
            String variantValue,
            String variantValueEn,
            BigDecimal abv,
            Integer volumeMl,
            String requestMemo,
            BigDecimal noseScore,
            BigDecimal tasteScore,
            BigDecimal finishScore,
            String noseNote,
            String tasteNote,
            String finishNote,
            String comment,
            String noseAromaWheelNotes,
            String tasteAromaWheelNotes,
            String finishAromaWheelNotes
    ) {
        this.variantValue = variantValue;
        this.variantValueEn = variantValueEn;
        this.abv = abv;
        this.volumeMl = volumeMl;
        this.requestMemo = requestMemo;
        this.noseScore = noseScore;
        this.tasteScore = tasteScore;
        this.finishScore = finishScore;
        this.noseNote = noseNote;
        this.tasteNote = tasteNote;
        this.finishNote = finishNote;
        this.comment = comment;
        this.noseAromaWheelNotes = noseAromaWheelNotes;
        this.tasteAromaWheelNotes = tasteAromaWheelNotes;
        this.finishAromaWheelNotes = finishAromaWheelNotes;
        calculateTotalScore();
    }

    public void reject(User reviewer, String reason) {
        this.reviewedBy = reviewer;
        this.reviewedAt = LocalDateTime.now();
        this.rejectReason = reason;
        this.status = VariantReviewRequestStatus.REJECTED;
    }

    public void rejectReviewOnly(Spirit linkedVariant, User reviewer, String reason) {
        this.linkedVariant = linkedVariant;
        this.review = null;
        this.reviewedBy = reviewer;
        this.reviewedAt = LocalDateTime.now();
        this.rejectReason = reason;
        this.status = VariantReviewRequestStatus.REJECTED;
    }

    public void resubmitReview(
            String variantValue,
            String variantValueEn,
            BigDecimal abv,
            Integer volumeMl,
            String requestMemo,
            BigDecimal noseScore,
            BigDecimal tasteScore,
            BigDecimal finishScore,
            String noseNote,
            String tasteNote,
            String finishNote,
            String comment,
            String noseAromaWheelNotes,
            String tasteAromaWheelNotes,
            String finishAromaWheelNotes
    ) {
        updatePending(
                variantValue,
                variantValueEn,
                abv,
                volumeMl,
                requestMemo,
                noseScore,
                tasteScore,
                finishScore,
                noseNote,
                tasteNote,
                finishNote,
                comment,
                noseAromaWheelNotes,
                tasteAromaWheelNotes,
                finishAromaWheelNotes
        );
        this.review = null;
        this.reviewedBy = null;
        this.reviewedAt = null;
        this.rejectReason = null;
        this.status = VariantReviewRequestStatus.PENDING;
    }
}

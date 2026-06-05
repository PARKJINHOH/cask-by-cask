package com.drinkindex.domain.review.entity;

import com.drinkindex.domain.spirit.entity.Spirit;
import com.drinkindex.domain.user.entity.User;
import com.drinkindex.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLRestriction;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "review",
        indexes = {
                @Index(name = "idx_review_spirit_id", columnList = "spirit_id"),
                @Index(name = "idx_review_user_id", columnList = "user_id")
        }
)
@SQLRestriction("deleted_at IS NULL")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class Review extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "spirit_id", nullable = false)
    private Spirit spirit;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, precision = 4, scale = 1)
    private BigDecimal noseScore;

    @Column(nullable = false, precision = 4, scale = 1)
    private BigDecimal tasteScore;

    @Column(nullable = false, precision = 4, scale = 1)
    private BigDecimal finishScore;

    @Column(nullable = false, precision = 4, scale = 1)
    private BigDecimal totalScore;

    @Column(length = 300)
    private String noseNote;

    @Column(length = 300)
    private String tasteNote;

    @Column(length = 300)
    private String finishNote;

    @Column(length = 500)
    private String comment;

    @Column(length = 800)
    private String noseAromaWheelNotes;

    @Column(length = 800)
    private String tasteAromaWheelNotes;

    @Column(length = 800)
    private String finishAromaWheelNotes;

    @Builder.Default
    @Column(nullable = false)
    private Boolean isHidden = false;

    @Builder.Default
    @Column(nullable = false)
    private Integer reportCount = 0;

    @Column
    private LocalDateTime deletedAt;

    @PrePersist
    @PreUpdate
    private void calculateTotalScore() {
        if (noseScore != null && tasteScore != null && finishScore != null) {
            this.totalScore = noseScore.add(tasteScore).add(finishScore)
                    .divide(BigDecimal.valueOf(3), 1, RoundingMode.HALF_UP);
        }
    }

    public void update(BigDecimal noseScore, BigDecimal tasteScore, BigDecimal finishScore,
                       String noseNote, String tasteNote, String finishNote, String comment,
                       String noseAromaWheelNotes, String tasteAromaWheelNotes, String finishAromaWheelNotes) {
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
    }

    public void softDelete() {
        this.deletedAt = LocalDateTime.now();
    }

    public void hide() {
        this.isHidden = true;
    }

    public void unhide() {
        this.isHidden = false;
    }

    public void incrementReportCount() {
        this.reportCount++;
        // [패치 6] 하드코딩 3 → ReportConstants.SPIRIT_REVIEW_HIDE_THRESHOLD
        if (this.reportCount >= com.drinkindex.global.constants.ReportConstants.SPIRIT_REVIEW_HIDE_THRESHOLD) {
            this.isHidden = true;
        }
    }
}

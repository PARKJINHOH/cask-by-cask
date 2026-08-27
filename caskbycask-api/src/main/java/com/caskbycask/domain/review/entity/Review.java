package com.caskbycask.domain.review.entity;

import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.global.entity.BaseTimeEntity;
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

    /** 점수는 셋 다 있거나 셋 다 없다 — 점수 없는 리뷰는 평균 산출에서 빠진다. */
    @Column(precision = 4, scale = 1)
    private BigDecimal noseScore;

    @Column(precision = 4, scale = 1)
    private BigDecimal tasteScore;

    @Column(precision = 4, scale = 1)
    private BigDecimal finishScore;

    /** 세 점수의 평균. 점수를 안 남긴 리뷰는 {@code null} 이고 {@code AVG()} 에서 제외된다. */
    @Column(precision = 4, scale = 1)
    private BigDecimal totalScore;

    @Column(length = 600)
    private String noseNote;

    @Column(length = 600)
    private String tasteNote;

    @Column(length = 600)
    private String finishNote;

    /** 제한형 에디터가 만든 HTML. 서식 태그가 붙어 본문 600자만으로도 VARCHAR(600) 을 넘긴다. */
    @Column(columnDefinition = "TEXT")
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

    /**
     * SNS 기능 도입 전에 존재하던 리뷰에 한해 수정 화면에서 최초 게시를 허용한다.
     * 신규 리뷰는 작성 시 선택한 플랫폼 외에는 추후 추가 발행할 수 없다.
     */
    @Builder.Default
    @Column(nullable = false)
    private Boolean legacySocialPublishAllowed = false;

    @Column
    private LocalDateTime deletedAt;

    @PrePersist
    @PreUpdate
    private void calculateTotalScore() {
        // 점수를 지운 수정도 반영해야 하므로 else 로 null 을 되돌린다 —
        // 예전처럼 값이 있을 때만 덮어쓰면 지운 뒤에도 옛 총점이 남아 평균에 계속 낀다.
        if (noseScore != null && tasteScore != null && finishScore != null) {
            this.totalScore = noseScore.add(tasteScore).add(finishScore)
                    .divide(BigDecimal.valueOf(3), 1, RoundingMode.HALF_UP);
        } else {
            this.totalScore = null;
        }
    }

    /** 점수를 남긴 리뷰인가 — 평균 산출 모수에 들어가는지의 기준. */
    public boolean hasScore() {
        return totalScore != null;
    }

    /**
     * 점수 셋 중 일부만 채운 상태인가.
     *
     * <p>부분 입력은 총점을 낼 수 없어 평균에서 조용히 빠진다 — 사용자는 점수를 매겼다고
     * 생각하는데 반영되지 않으므로 리뷰·에디션 등록요청 양쪽에서 막는다.
     */
    public static boolean isPartialScore(BigDecimal nose, BigDecimal taste, BigDecimal finish) {
        boolean any = nose != null || taste != null || finish != null;
        boolean all = nose != null && taste != null && finish != null;
        return any && !all;
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
        if (this.reportCount >= com.caskbycask.global.constants.ReportConstants.SPIRIT_REVIEW_HIDE_THRESHOLD) {
            this.isHidden = true;
        }
    }
}

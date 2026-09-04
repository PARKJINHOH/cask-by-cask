package com.caskbycask.domain.review.entity;

import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.venue.entity.Venue;
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
                @Index(name = "idx_review_user_id", columnList = "user_id"),
                @Index(name = "idx_review_venue_id", columnList = "venue_id")
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

    /**
     * 마신 곳. 선택 사항이라 없을 수 있다.
     *
     * <p>이 태그가 바 사장님에게 판매 주류 목록을 갱신시키지 않고도 "여기서 마실 수 있는 술"을
     * 만들어 낸다 — 리뷰를 쓰는 사람이 대신 채우고, 오래된 것은 신선도 컷으로 빠진다.
     *
     * <p>장소가 숨겨지거나 삭제돼도 이 값은 그대로 둔다. 리뷰 본문은 장소와 무관하게 살아 있어야 하고,
     * 조회 시 장소의 status/deletedAt 으로 걸러 태그만 조용히 감춘다.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "venue_id")
    private Venue venue;

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

    /**
     * 마신 곳 태그 변경.
     *
     * <p>{@link #update} 의 11번째 인자로 넣지 않은 이유가 있다 — 그 메서드는 이미 같은 타입
     * (String·BigDecimal) 위치 인자 10 개라 두 개를 뒤바꿔 넘겨도 조용히 컴파일된다.
     * 거기에 하나를 더 얹으면 위험만 키운다.
     *
     * <p>규약: <b>폼이 항상 venueId 를 보낸다(null = 태그 없음), 서비스는 항상 적용한다.</b>
     * 점수 세 칸을 "항상 함께 보낸다"로 푼 것과 같은 방식이다 — 그래야 "안 보냄"과 "지움"을
     * 구분하려는 시도 자체가 사라진다.
     */
    public void changeVenue(Venue venue) {
        this.venue = venue;
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

package com.caskbycask.domain.venue.entity;

import com.caskbycask.domain.user.entity.User;
import com.caskbycask.global.constants.ReportConstants;
import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;
import org.hibernate.annotations.SQLRestriction;

import java.time.LocalDateTime;

/**
 * 장소 방문 후기 댓글.
 *
 * <p>주류 댓글({@code community_comment})과 같은 골격이다 — 1단 대댓글, 신고 누적 자동 숨김,
 * 소프트 삭제. 다른 점은 사진이 최대 5장 붙는다는 것 하나다.
 *
 * <p>본문은 <b>평문</b>으로만 저장한다. 리뷰 종합평가처럼 서식 에디터를 붙이면 HTML 살균과
 * 렌더 경로가 통째로 따라오는데, 방문 후기는 그만한 표현력이 필요하지 않다.
 */
@Entity
@Table(
        name = "venue_comments",
        indexes = {
                @Index(name = "idx_venue_comment_venue", columnList = "venue_id, deleted_at, id"),
                @Index(name = "idx_venue_comment_parent", columnList = "parent_id"),
                @Index(name = "idx_venue_comment_user", columnList = "user_id")
        }
)
@SQLRestriction("deleted_at IS NULL")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Comment("장소 댓글")
public class VenueComment extends BaseTimeEntity {

    /** 본문 상한. 방문 후기 한 편에 넉넉하면서, 게시글처럼 길어지지는 않을 길이. */
    public static final int MAX_CONTENT_LENGTH = 1000;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Comment("PK")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "venue_id", nullable = false)
    @Comment("장소(venue.id)")
    private Venue venue;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @Comment("작성자(users.id)")
    private User user;

    /**
     * 1단 대댓글만 허용한다. 관계가 아니라 raw id 로 두는 것은 목록을 한 번의 조회로 가져와
     * 메모리에서 묶기 위해서다 — 자기참조 관계는 목록 렌더에서 N+1 을 만들기 쉽다.
     */
    @Column(name = "parent_id")
    @Comment("부모 댓글(venue_comments.id)")
    private Long parentId;

    @Column(nullable = false, columnDefinition = "TEXT")
    @Comment("본문(평문)")
    private String content;

    @Builder.Default
    @Column(nullable = false)
    @Comment("좋아요 수")
    private Integer likeCount = 0;

    @Builder.Default
    @Column(nullable = false)
    @Comment("신고 누적 자동 숨김 여부")
    private Boolean isHidden = false;

    @Builder.Default
    @Column(nullable = false)
    @Comment("신고 수")
    private Integer reportCount = 0;

    @Column
    @Comment("소프트 삭제 시각")
    private LocalDateTime deletedAt;

    public void updateContent(String content) {
        this.content = content;
    }

    public void softDelete() {
        this.deletedAt = LocalDateTime.now();
    }

    public boolean isReply() {
        return parentId != null;
    }

    public boolean isOwnedBy(Long userId) {
        return user != null && user.getId().equals(userId);
    }

    public void hide() {
        this.isHidden = true;
    }

    public void unhide() {
        this.isHidden = false;
        this.reportCount = 0;
    }

    /**
     * 신고 누적. 실제 업소로 손님을 보내는 기능이라 명예훼손성 글이 방치되면 안 되므로
     * 관리자 판단 전에도 임계치에서 자동으로 내린다(주류 댓글과 같은 규칙).
     */
    public void incrementReportCount() {
        this.reportCount++;
        if (this.reportCount >= ReportConstants.VENUE_COMMENT_HIDE_THRESHOLD) {
            this.isHidden = true;
        }
    }
}

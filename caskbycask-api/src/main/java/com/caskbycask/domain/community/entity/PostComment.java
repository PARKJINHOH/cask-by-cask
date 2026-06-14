package com.caskbycask.domain.community.entity;

import com.caskbycask.domain.user.entity.User;
import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "post_comments",
        indexes = {
                @Index(name = "idx_comment_post_id", columnList = "post_id")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class PostComment extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Comment("PK")
    private Long id;

    // nullable: 게시글 삭제 시 댓글은 유지 (post FK = null 처리)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id")
    @Comment("게시글(posts.id)")
    private Post post;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id", nullable = false)
    @Comment("작성자(users.id)")
    private User author;

    // 대댓글 시 부모 댓글. 2단계 이상 중첩 불가.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    @Comment("부모 댓글(post_comments.id)")
    private PostComment parent;

    @Lob
    @Column(nullable = false, columnDefinition = "LONGTEXT")
    @Comment("댓글 내용")
    private String content;

    // @닉네임 멘션 시 해당 user_id 저장 (알림 트리거용)
    @Comment("멘션된 사용자(users.id)")
    private Long mentionedUserId;

    @Builder.Default
    @Column(nullable = false)
    @Comment("익명 여부")
    private Boolean isAnonymous = false;

    // 비밀댓글: 작성자 본인 + 게시글 작성자 + 최고관리자만 열람 가능 (서비스 레이어 마스킹)
    @Builder.Default
    @Column(nullable = false)
    @Comment("비밀 댓글 여부")
    private Boolean isSecret = false;

    @Builder.Default
    @Column(nullable = false)
    @Comment("숨김 여부")
    private Boolean isHidden = false;

    @Builder.Default
    @Column(nullable = false)
    @Comment("신고 수")
    private Integer reportCount = 0;

    @Comment("삭제 일시(소프트삭제)")
    private LocalDateTime deletedAt;

    public boolean isDeleted() { return deletedAt != null; }

    public void softDelete() { this.deletedAt = LocalDateTime.now(); }

    public void incrementReportCount() {
        this.reportCount++;
        // [패치 6] 게시판 댓글은 완화 — 하드코딩 3 → ReportConstants.COMMENT_HIDE_THRESHOLD(5)
        if (this.reportCount >= com.caskbycask.global.constants.ReportConstants.COMMENT_HIDE_THRESHOLD) {
            this.isHidden = true;
        }
    }

    public void setHidden(Boolean isHidden)  { this.isHidden = isHidden; }

    // 관리자 수동 신고 횟수 조정. 숨김 상태는 변경하지 않음 — 숨김/해제는 별도 버튼.
    public void updateReportCount(int count) { this.reportCount = Math.max(0, count); }

    public void updateContent(String content) { this.content = content; }
}

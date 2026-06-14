package com.caskbycask.domain.community.entity;

import com.caskbycask.domain.community.entity.enums.ReportStatus;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "post_reports",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_post_report_post_reporter",    columnNames = {"post_id", "reporter_id"}),
                @UniqueConstraint(name = "uk_post_report_comment_reporter", columnNames = {"comment_id", "reporter_id"})
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class PostReport extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Comment("PK")
    private Long id;

    // post or comment 중 하나만 not null
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id")
    @Comment("신고 게시글(posts.id)")
    private Post post;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "comment_id")
    @Comment("신고 댓글(post_comments.id)")
    private PostComment comment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reporter_id", nullable = false)
    @Comment("신고자(users.id)")
    private User reporter;

    @Column(length = 500)
    @Comment("신고 사유")
    private String reason;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(nullable = false, length = 20)
    @Comment("처리 상태 — PENDING/RESOLVED/DISMISSED")
    private ReportStatus status = ReportStatus.PENDING;

    @Comment("처리 일시")
    private LocalDateTime resolvedAt;

    public void resolve() {
        this.status = ReportStatus.RESOLVED;
        this.resolvedAt = LocalDateTime.now();
    }

    public void dismiss() {
        this.status = ReportStatus.DISMISSED;
        this.resolvedAt = LocalDateTime.now();
    }
}

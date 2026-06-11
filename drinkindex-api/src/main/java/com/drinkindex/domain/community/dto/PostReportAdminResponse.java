package com.drinkindex.domain.community.dto;

import com.drinkindex.domain.community.entity.Post;
import com.drinkindex.domain.community.entity.PostComment;
import com.drinkindex.domain.community.entity.PostReport;
import com.drinkindex.domain.community.entity.enums.PostStatus;
import com.drinkindex.domain.community.entity.enums.ReportStatus;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
public class PostReportAdminResponse {

    // 신고 대상 유형: "POST"(게시글) 또는 "COMMENT"(댓글)
    private final String targetType;

    private final Long id;
    private final Long postId;
    private final String postTitle;
    private final String boardType;      // 게시글 이동 링크용 (NOTICE/FREE)
    private final Boolean postLocked;    // 게시글이 신고 누적으로 잠금 상태인지
    private final Boolean postHidden;    // 관리자가 숨김 처리했는지
    private final Integer postReportCount; // 게시글 누적 신고 수

    // 댓글 신고일 때만 채워짐
    private final Long commentId;
    private final String commentContent;
    private final Boolean commentHidden;
    private final Boolean commentDeleted;
    private final Integer commentReportCount; // 댓글 누적 신고 수

    private final String reporterNickname;
    private final String reason;
    private final ReportStatus status;
    private final LocalDateTime createdAt;

    private PostReportAdminResponse(PostReport report) {
        PostComment comment = report.getComment();
        boolean isComment = comment != null;

        // 게시글 신고는 report.post, 댓글 신고는 comment.post 기준으로 게시글 정보 노출
        Post post = isComment ? comment.getPost() : report.getPost();

        this.targetType      = isComment ? "COMMENT" : "POST";
        this.id              = report.getId();
        this.postId          = post != null ? post.getId() : null;
        this.postTitle       = post != null ? post.getTitle() : null;
        this.boardType       = post != null ? post.getBoardType().name() : null;
        this.postLocked      = post != null ? PostStatus.LOCKED.equals(post.getStatus()) : null;
        this.postHidden      = post != null ? post.getIsHidden() : null;
        this.postReportCount = post != null ? post.getReportCount() : null;
        this.commentId       = isComment ? comment.getId() : null;
        this.commentContent  = isComment ? comment.getContent() : null;
        this.commentHidden   = isComment ? comment.getIsHidden() : null;
        this.commentDeleted  = isComment ? comment.isDeleted() : null;
        this.commentReportCount = isComment ? comment.getReportCount() : null;
        this.reporterNickname = report.getReporter().getNickname();
        this.reason          = report.getReason();
        this.status          = report.getStatus();
        this.createdAt       = report.getCreatedAt();
    }

    public static PostReportAdminResponse from(PostReport report) {
        return new PostReportAdminResponse(report);
    }
}

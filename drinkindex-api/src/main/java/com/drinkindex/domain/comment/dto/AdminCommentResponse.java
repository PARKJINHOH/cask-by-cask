package com.drinkindex.domain.comment.dto;

import com.drinkindex.domain.comment.entity.CommunityComment;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

public record AdminCommentResponse(
        @Schema(description = "댓글 고유 ID")
        Long id,
        @Schema(description = "작성자 사용자 ID")
        Long userId,
        @Schema(description = "작성자 닉네임")
        String userNickname,
        @Schema(description = "술 고유 ID")
        Long spiritId,
        @Schema(description = "술 한글명")
        String spiritNameKo,
        @Schema(description = "부모 댓글 ID (대댓글인 경우, 최상위 댓글이면 null)")
        Long parentId,
        @Schema(description = "댓글 내용")
        String content,
        @Schema(description = "숨김 처리 여부 (신고 3회 이상 시 자동 true)")
        Boolean isHidden,
        @Schema(description = "신고 누적 횟수")
        Integer reportCount,
        @Schema(description = "작성 일시")
        LocalDateTime createdAt
) {
    public static AdminCommentResponse from(CommunityComment comment) {
        return new AdminCommentResponse(
                comment.getId(),
                comment.getUser().getId(),
                comment.getUser().getNickname(),
                comment.getSpirit().getId(),
                comment.getSpirit().getNameKo(),
                comment.getParent() != null ? comment.getParent().getId() : null,
                comment.getContent(),
                comment.getIsHidden(),
                comment.getReportCount(),
                comment.getCreatedAt()
        );
    }
}

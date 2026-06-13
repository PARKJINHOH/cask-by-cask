package com.caskbycask.domain.admin.dto;

import com.caskbycask.domain.admin.entity.AdminLog;
import com.caskbycask.domain.admin.entity.enums.AdminLogTargetType;
import com.caskbycask.domain.admin.entity.enums.AdminLogType;

import java.time.LocalDateTime;

public record AdminLogResponse(
        Long id,
        AdminLogType logType,
        String logTypeLabel,
        Long actorId,
        String actorEmail,
        AdminLogTargetType targetType,
        Long targetId,
        String targetUserEmail,
        String summary,
        String detail,
        LocalDateTime createdAt
) {
    private static final java.util.Map<AdminLogType, String> LABELS = java.util.Map.of(
            AdminLogType.CONTENT_HIDE,    "게시글/댓글 숨김",
            AdminLogType.CONTENT_RESTORE, "게시글/댓글 복구",
            AdminLogType.ROLE_CHANGE,     "역할 변경",
            AdminLogType.ACCOUNT_SUSPEND, "계정 정지",
            AdminLogType.ACCOUNT_DELETE,  "계정 삭제"
    );

    public static AdminLogResponse from(AdminLog log, String targetUserEmail) {
        return new AdminLogResponse(
                log.getId(),
                log.getLogType(),
                LABELS.getOrDefault(log.getLogType(), log.getLogType().name()),
                log.getActor().getId(),
                log.getActor().getEmail(),
                log.getTargetType(),
                log.getTargetId(),
                targetUserEmail,
                log.getSummary(),
                log.getDetail(),
                log.getCreatedAt()
        );
    }
}

package com.caskbycask.domain.admin.dto;

import java.time.LocalDateTime;
import java.util.List;

public record AdminApprovalEventSnapshotsResponse(
        List<AdminApprovalEventSnapshot> queues
) {
    public record AdminApprovalEventSnapshot(
            String path,
            long count,
            String latestEventKey,
            LocalDateTime latestCreatedAt
    ) {
    }
}

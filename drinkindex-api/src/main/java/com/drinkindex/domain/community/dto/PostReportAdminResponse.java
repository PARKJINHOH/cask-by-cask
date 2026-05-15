package com.drinkindex.domain.community.dto;

import com.drinkindex.domain.community.entity.PostReport;
import com.drinkindex.domain.community.entity.enums.ReportStatus;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
public class PostReportAdminResponse {

    private final Long id;
    private final Long postId;
    private final String postTitle;
    private final String reporterNickname;
    private final String reason;
    private final ReportStatus status;
    private final LocalDateTime createdAt;

    private PostReportAdminResponse(PostReport report) {
        this.id               = report.getId();
        this.postId           = report.getPost() != null ? report.getPost().getId() : null;
        this.postTitle        = report.getPost() != null ? report.getPost().getTitle() : null;
        this.reporterNickname = report.getReporter().getNickname();
        this.reason           = report.getReason();
        this.status           = report.getStatus();
        this.createdAt        = report.getCreatedAt();
    }

    public static PostReportAdminResponse from(PostReport report) {
        return new PostReportAdminResponse(report);
    }
}

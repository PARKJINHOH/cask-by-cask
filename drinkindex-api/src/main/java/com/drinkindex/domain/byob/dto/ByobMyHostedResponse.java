package com.drinkindex.domain.byob.dto;

import com.drinkindex.domain.byob.entity.Byob;
import com.drinkindex.domain.byob.entity.enums.ByobStatus;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class ByobMyHostedResponse {

    private Long id;
    private String title;
    private ByobStatus status;
    private int approvedCount;
    private int maxParticipants;
    private LocalDateTime eventAt;
    private LocalDateTime recruitEndAt;
    private LocalDateTime createdAt;

    public static ByobMyHostedResponse from(Byob byob) {
        return ByobMyHostedResponse.builder()
                .id(byob.getId())
                .title(byob.getTitle())
                .status(byob.getStatus())
                .approvedCount(byob.getApprovedCount())
                .maxParticipants(byob.getMaxParticipants())
                .eventAt(byob.getEventAt())
                .recruitEndAt(byob.getRecruitEndAt())
                .createdAt(byob.getCreatedAt())
                .build();
    }
}

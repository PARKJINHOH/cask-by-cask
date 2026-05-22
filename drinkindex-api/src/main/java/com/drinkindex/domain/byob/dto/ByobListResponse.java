package com.drinkindex.domain.byob.dto;

import com.drinkindex.domain.byob.entity.Byob;
import com.drinkindex.domain.byob.entity.enums.ByobStatus;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class ByobListResponse {

    private Long id;
    private String title;
    private String hostNickname;
    private int hostLevel;
    private String hostProfileImageUrl;
    private String location;
    private LocalDateTime eventAt;
    private LocalDateTime recruitStartAt;
    private LocalDateTime recruitEndAt;
    private int maxParticipants;
    private int approvedCount;
    private ByobStatus status;
    private Long linkedFreePostId;
    private LocalDateTime createdAt;

    public static ByobListResponse from(Byob byob) {
        return ByobListResponse.builder()
                .id(byob.getId())
                .title(byob.getTitle())
                .hostNickname(byob.getHost().getNickname())
                .hostLevel(byob.getHost().getCurrentLevel() != null ? byob.getHost().getCurrentLevel() : 1)
                .hostProfileImageUrl(byob.getHost().getProfileImageUrl())
                .location(byob.getLocation())
                .eventAt(byob.getEventAt())
                .recruitStartAt(byob.getRecruitStartAt())
                .recruitEndAt(byob.getRecruitEndAt())
                .maxParticipants(byob.getMaxParticipants())
                .approvedCount(byob.getApprovedCount())
                .status(byob.getStatus())
                .linkedFreePostId(byob.getLinkedFreePostId())
                .createdAt(byob.getCreatedAt())
                .build();
    }
}

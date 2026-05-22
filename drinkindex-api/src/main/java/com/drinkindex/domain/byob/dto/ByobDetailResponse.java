package com.drinkindex.domain.byob.dto;

import com.drinkindex.domain.byob.entity.Byob;
import com.drinkindex.domain.byob.entity.enums.ByobStatus;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Getter
@Builder
public class ByobDetailResponse {

    private Long id;
    private Long hostUserId;
    private String hostNickname;
    private int hostLevel;
    private String hostProfileImageUrl;
    private String title;
    private String content;
    private String location;
    private String address;
    private LocalDateTime eventAt;
    private LocalDateTime recruitStartAt;
    private LocalDateTime recruitEndAt;
    private List<String> hostBottles;
    private int maxParticipants;
    private int approvedCount;
    private int pendingCount;
    private ByobStatus status;
    private Long linkedFreePostId;
    private ByobParticipantResponse myParticipant;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static ByobDetailResponse from(Byob byob, ByobParticipantResponse myParticipant) {
        return ByobDetailResponse.builder()
                .id(byob.getId())
                .hostUserId(byob.getHost().getId())
                .hostNickname(byob.getHost().getNickname())
                .hostLevel(byob.getHost().getCurrentLevel() != null ? byob.getHost().getCurrentLevel() : 1)
                .hostProfileImageUrl(byob.getHost().getProfileImageUrl())
                .title(byob.getTitle())
                .content(byob.getContent())
                .location(byob.getLocation())
                .address(byob.getAddress())
                .eventAt(byob.getEventAt())
                .recruitStartAt(byob.getRecruitStartAt())
                .recruitEndAt(byob.getRecruitEndAt())
                .hostBottles(new ArrayList<>(byob.getHostBottles()))
                .maxParticipants(byob.getMaxParticipants())
                .approvedCount(byob.getApprovedCount())
                .pendingCount(byob.getPendingCount())
                .status(byob.getStatus())
                .linkedFreePostId(byob.getLinkedFreePostId())
                .myParticipant(myParticipant)
                .createdAt(byob.getCreatedAt())
                .updatedAt(byob.getUpdatedAt())
                .build();
    }
}

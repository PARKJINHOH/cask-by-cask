package com.caskbycask.domain.byob.dto;

import com.caskbycask.domain.byob.entity.ByobParticipant;
import com.caskbycask.domain.byob.entity.enums.ParticipantStatus;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

@Getter
@Builder
public class ByobParticipantResponse {

    private Long id;
    private Long userId;
    private String nickname;
    private int userLevel;
    private String userProfileImageUrl;
    private List<String> bottleNames;
    private String memo;
    private ParticipantStatus status;
    private String removedReason;
    private LocalDateTime appliedAt;

    public static ByobParticipantResponse from(ByobParticipant p) {
        return ByobParticipantResponse.builder()
                .id(p.getId())
                .userId(p.getUser().getId())
                .nickname(p.getUser().getNickname())
                .userLevel(p.getUser().getCurrentLevel() != null ? p.getUser().getCurrentLevel() : 1)
                .userProfileImageUrl(p.getUser().getProfileImageUrl())
                .bottleNames(p.getBottleName() != null
                        ? Arrays.asList(p.getBottleName().split("\n"))
                        : List.of())
                .memo(p.getMemo())
                .status(p.getStatus())
                .removedReason(p.getRemovedReason())
                .appliedAt(p.getAppliedAt())
                .build();
    }
}

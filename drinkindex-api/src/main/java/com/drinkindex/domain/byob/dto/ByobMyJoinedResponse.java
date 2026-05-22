package com.drinkindex.domain.byob.dto;

import com.drinkindex.domain.byob.entity.ByobParticipant;
import com.drinkindex.domain.byob.entity.enums.ByobStatus;
import com.drinkindex.domain.byob.entity.enums.ParticipantStatus;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

@Getter
@Builder
public class ByobMyJoinedResponse {

    private Long id;
    private String title;
    private String hostNickname;
    private ByobStatus status;
    private ParticipantStatus myStatus;
    private List<String> bottleNames;
    private LocalDateTime appliedAt;

    public static ByobMyJoinedResponse from(ByobParticipant p) {
        return ByobMyJoinedResponse.builder()
                .id(p.getByob().getId())
                .title(p.getByob().getTitle())
                .hostNickname(p.getByob().getHost().getNickname())
                .status(p.getByob().getStatus())
                .myStatus(p.getStatus())
                .bottleNames(p.getBottleName() != null
                        ? Arrays.asList(p.getBottleName().split("\n"))
                        : List.of())
                .appliedAt(p.getAppliedAt())
                .build();
    }
}

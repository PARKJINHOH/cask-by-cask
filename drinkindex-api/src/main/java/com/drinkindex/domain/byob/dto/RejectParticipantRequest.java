package com.drinkindex.domain.byob.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class RejectParticipantRequest {

    @NotBlank
    private String rejectedReason;
}

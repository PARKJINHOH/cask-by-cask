package com.caskbycask.domain.community.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@NoArgsConstructor
public class PollRequest {

    @NotBlank(message = "투표 질문을 입력해주세요.")
    @Size(max = 300)
    private String question;

    private Boolean isMultipleChoice = false;

    private LocalDateTime endsAt;

    @Valid
    @Size(min = 2, message = "투표 항목은 최소 2개 이상이어야 합니다.")
    private List<PollOptionRequest> options;
}

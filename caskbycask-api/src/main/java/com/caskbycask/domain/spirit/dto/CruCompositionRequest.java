package com.caskbycask.domain.spirit.dto;

import com.caskbycask.domain.spirit.entity.enums.CognacCru;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/**
 * 꼬냑 크뤼 구성 한 줄. 꼬냑은 여러 크뤼의 오드비를 섞는 것이 기본이라
 * 크뤼를 복수로 기록한다. 비율을 모르면 {@code percentage} 를 비워둔다.
 */
public record CruCompositionRequest(

        @NotNull(message = "크뤼는 필수입니다.")
        CognacCru cru,

        @Min(value = 1, message = "비율은 1 이상이어야 합니다.")
        @Max(value = 100, message = "비율은 100 이하이어야 합니다.")
        Integer percentage
) {}

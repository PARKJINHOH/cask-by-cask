package com.drinkindex.domain.distillery.dto;

import jakarta.validation.constraints.Size;

public record UpdateDistilleryRequest(
        @Size(min = 1, max = 200, message = "증류소명은 1자 이상 200자 이하로 입력해주세요.")
        String nameKo,

        @Size(min = 1, max = 200, message = "증류소명은 1자 이상 200자 이하로 입력해주세요.")
        String nameEn,

        @Size(min = 1, max = 100, message = "국가명은 1자 이상 100자 이하로 입력해주세요.")
        String country,

        @Size(max = 100, message = "지역명은 100자 이하로 입력해주세요.")
        String region
) {}

package com.drinkindex.domain.distillery.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateDistilleryRequest(
        @NotBlank(message = "한국어 증류소명을 입력해주세요.")
        @Size(max = 200, message = "증류소명은 200자 이하로 입력해주세요.")
        String nameKo,

        @NotBlank(message = "영문 증류소명을 입력해주세요.")
        @Size(max = 200, message = "증류소명은 200자 이하로 입력해주세요.")
        String nameEn,

        @NotBlank(message = "국가를 입력해주세요.")
        @Size(max = 100, message = "국가명은 100자 이하로 입력해주세요.")
        String country,

        @Size(max = 100, message = "지역명은 100자 이하로 입력해주세요.")
        String region
) {}

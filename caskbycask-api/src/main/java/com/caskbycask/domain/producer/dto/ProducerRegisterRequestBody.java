package com.caskbycask.domain.producer.dto;

import com.caskbycask.domain.producer.entity.ProducerType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ProducerRegisterRequestBody(
        @NotBlank @Size(max = 200) String nameKo,
        @NotBlank @Size(max = 200) String nameEn,
        @NotBlank @Size(max = 100) String country,
        @Size(max = 100) String region,
        ProducerType type,

        @Schema(description = "공식 웹사이트 URL (선택)")
        @Size(max = 500)
        String website,

        @Schema(description = "설립연도 (선택)")
        Integer foundedYear,

        @Schema(description = "한글 소개 (선택)")
        String descriptionKo,

        @Schema(description = "영문 소개 (선택)")
        String descriptionEn
) {}

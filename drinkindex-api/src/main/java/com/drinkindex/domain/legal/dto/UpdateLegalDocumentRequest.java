package com.drinkindex.domain.legal.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateLegalDocumentRequest(
        @NotBlank(message = "버전을 입력해주세요.")
        @Size(max = 50, message = "버전은 50자 이하여야 합니다.")
        String version,

        @NotBlank(message = "내용을 입력해주세요.")
        String content
) {}

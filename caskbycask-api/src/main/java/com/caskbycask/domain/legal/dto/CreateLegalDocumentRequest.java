package com.caskbycask.domain.legal.dto;

import com.caskbycask.domain.legal.entity.enums.LegalDocumentType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateLegalDocumentRequest(
        @NotNull(message = "문서 타입을 선택해주세요.")
        LegalDocumentType type,

        @NotBlank(message = "버전을 입력해주세요.")
        @Size(max = 50, message = "버전은 50자 이하여야 합니다.")
        String version,

        @NotBlank(message = "내용을 입력해주세요.")
        String content
) {}

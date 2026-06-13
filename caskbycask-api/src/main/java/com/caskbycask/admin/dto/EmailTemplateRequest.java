package com.caskbycask.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record EmailTemplateRequest(
        @NotBlank(message = "템플릿 이름을 입력해주세요.")
        @Size(max = 100)
        String name,

        @NotBlank(message = "제목을 입력해주세요.")
        @Size(max = 300)
        String subject,

        @NotBlank(message = "본문을 입력해주세요.")
        String body
) {}

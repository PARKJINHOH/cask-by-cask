package com.caskbycask.domain.draft.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class SaveDraftRequest {

    // 있으면 해당 임시저장 갱신, 없으면 새 임시저장 생성
    private Long id;

    @NotBlank
    @Size(max = 50)
    private String draftKey;

    @Size(max = 300)
    private String title;

    private String content;

    private String meta;
}

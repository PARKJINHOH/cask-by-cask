package com.drinkindex.domain.community.dto;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class UpdatePostRequest {

    private Long prefixId;

    @Size(max = 50, message = "제목은 50자 이내여야 합니다.")
    private String title;

    private String content;

    // 게시판 공지(고정글) 토글. null이면 변경 안 함. 관리자/파트너만 유효.
    private Boolean isPinned;

    // 성인 전용 토글. null이면 변경 안 함. true로 변경/유지 시 성인인증 필요.
    private Boolean adultOnly;
}

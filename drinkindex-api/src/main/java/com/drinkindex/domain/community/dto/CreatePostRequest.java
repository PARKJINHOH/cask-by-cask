package com.drinkindex.domain.community.dto;

import com.drinkindex.domain.community.entity.enums.BoardType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class CreatePostRequest {

    @NotNull(message = "게시판 종류를 선택해주세요.")
    private BoardType boardType;

    private Long prefixId;

    @NotBlank(message = "제목을 입력해주세요.")
    @Size(max = 300, message = "제목은 300자 이내여야 합니다.")
    private String title;

    @NotBlank(message = "내용을 입력해주세요.")
    private String content;

    private Boolean isAnonymous = false;

    // 게시판 공지(고정글)로 등록. 관리자/파트너만 유효 (서비스에서 권한 검증, 그 외 무시).
    private Boolean isPinned = false;

    // 성인 전용(주류 나눔 등). true면 작성 시 성인인증 필요.
    private Boolean adultOnly = false;

    @Valid
    private PollRequest poll;

    private Long seriesId;

    // [패치 9] 소식 게시판 증류소 태그 (선택). PARTNER는 본인 담당 증류소만, ADMIN은 임의/생략 가능.
    private Long distilleryTagId;
}

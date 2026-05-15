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

    @Valid
    private PollRequest poll;

    private Long seriesId;
}

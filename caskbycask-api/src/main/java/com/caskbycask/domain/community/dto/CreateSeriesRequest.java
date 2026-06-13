package com.caskbycask.domain.community.dto;

import com.caskbycask.domain.community.entity.enums.BoardType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class CreateSeriesRequest {

    @NotNull(message = "게시판 종류를 선택해주세요.")
    private BoardType boardType;

    @NotBlank(message = "시리즈 제목을 입력해주세요.")
    @Size(max = 200)
    private String title;

    @Size(max = 500)
    private String description;
}

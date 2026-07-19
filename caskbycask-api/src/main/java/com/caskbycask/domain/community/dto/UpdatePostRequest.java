package com.caskbycask.domain.community.dto;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

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

    @Size(max = 10, message = "해시태그는 최대 10개까지 입력할 수 있습니다.")
    private List<@jakarta.validation.constraints.NotBlank @Size(max = 30) String> hashtags;

    public static UpdatePostRequest aiNews(Long prefixId, String title, String content, boolean pinned,
                                           List<String> hashtags) {
        UpdatePostRequest request = new UpdatePostRequest();
        request.prefixId = prefixId;
        request.title = title;
        request.content = content;
        request.isPinned = pinned;
        request.adultOnly = false;
        request.hashtags = hashtags;
        return request;
    }
}

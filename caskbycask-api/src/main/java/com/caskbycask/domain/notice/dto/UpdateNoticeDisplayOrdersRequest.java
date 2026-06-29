package com.caskbycask.domain.notice.dto;

import jakarta.validation.constraints.NotEmpty;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class UpdateNoticeDisplayOrdersRequest {
    @NotEmpty(message = "공지사항 ID 목록은 비어있을 수 없습니다.")
    private List<Long> noticeIds;
}

package com.drinkindex.domain.banner.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.validator.constraints.URL;

import java.time.LocalDateTime;

@Getter
@NoArgsConstructor
public class UpdateBannerRequest {

    @Size(max = 200, message = "관리자 제목은 200자를 초과할 수 없습니다.")
    private String adminTitle;

    private String content;

    // PC 이미지 교체 시 사용
    private Long bannerPcImageId;

    // 모바일 이미지 교체 시 사용 (null 전달 시 변경 없음)
    private Long bannerMoImageId;

    // 모바일 이미지 명시적 제거 플래그
    private Boolean removeMoImage;

    @URL(message = "올바른 URL 형식이어야 합니다.")
    private String linkUrl;

    private Boolean linkTargetBlank;
    private Boolean isVisible;
    private Boolean isAlwaysVisible;
    private LocalDateTime startAt;
    private LocalDateTime endAt;

    @AssertTrue(message = "종료일시는 시작일시 이후여야 합니다.")
    private boolean isDateRangeValid() {
        if (startAt != null && endAt != null) {
            return !endAt.isBefore(startAt);
        }
        return true;
    }
}

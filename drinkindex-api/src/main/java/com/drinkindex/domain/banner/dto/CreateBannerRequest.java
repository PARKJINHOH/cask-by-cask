package com.drinkindex.domain.banner.dto;

import com.drinkindex.domain.banner.entity.enums.BannerLanguage;
import com.drinkindex.domain.banner.entity.enums.BannerType;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.validator.constraints.URL;

import java.time.LocalDateTime;

@Getter
@NoArgsConstructor
public class CreateBannerRequest {

    @NotBlank(message = "관리자 제목은 필수입니다.")
    @Size(max = 200, message = "관리자 제목은 200자를 초과할 수 없습니다.")
    private String adminTitle;

    @NotNull(message = "배너 타입은 필수입니다.")
    private BannerType bannerType;

    @NotNull(message = "언어는 필수입니다.")
    private BannerLanguage language;

    // [보안] HTML형 전용. 서버에서 HtmlSanitizer.sanitize() 처리 후 저장.
    private String content;

    // 이미지형 전용: PC 이미지 (필수)
    private Long bannerPcImageId;

    // 이미지형 전용: 모바일 이미지 (선택 - 없으면 PC 이미지 사용)
    private Long bannerMoImageId;

    @URL(message = "올바른 URL 형식이어야 합니다.")
    private String linkUrl;

    private Boolean linkTargetBlank = false;

    @NotNull(message = "노출 여부는 필수입니다.")
    private Boolean isVisible;

    @NotNull(message = "상시 노출 여부는 필수입니다.")
    private Boolean isAlwaysVisible;

    private LocalDateTime startAt;
    private LocalDateTime endAt;

    @AssertTrue(message = "HTML 타입 배너는 content가 필수입니다.")
    private boolean isContentValidForType() {
        if (BannerType.HTML.equals(bannerType)) {
            return content != null && !content.isBlank();
        }
        return true;
    }

    @AssertTrue(message = "IMAGE 타입 배너는 PC 이미지(bannerPcImageId)가 필수입니다.")
    private boolean isPcImageIdValidForType() {
        if (BannerType.IMAGE.equals(bannerType)) {
            return bannerPcImageId != null;
        }
        return true;
    }

    @AssertTrue(message = "종료일시는 시작일시 이후여야 합니다.")
    private boolean isDateRangeValid() {
        if (Boolean.FALSE.equals(isAlwaysVisible) && startAt != null && endAt != null) {
            return !endAt.isBefore(startAt);
        }
        return true;
    }
}

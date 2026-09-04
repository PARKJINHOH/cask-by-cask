package com.caskbycask.domain.venue.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/**
 * 관리자 도시 등록·수정 요청. 장소와 마찬가지로 전체 치환이다.
 *
 * <p>도시 추가에 배포가 필요 없도록 이 경로를 열어 둔다 — 도시는 스키마가 아니라 데이터다.
 */
public record VenueCityUpsertRequest(
        @Schema(description = "국가 코드 (ISO 3166-1 alpha-2). 대소문자 무관, 소문자로 저장한다", example = "jp")
        @NotBlank(message = "국가 코드를 입력해주세요.")
        @Pattern(regexp = "^[A-Za-z]{2}$", message = "국가 코드는 영문 2자입니다. (예: kr, jp, tw)")
        String countryCode,

        @Schema(description = "URL 세그먼트. 영문 소문자·숫자·하이픈만", example = "osaka")
        @NotBlank(message = "도시 주소(slug)를 입력해주세요.")
        @Size(max = 60, message = "도시 주소는 60자 이하로 입력해주세요.")
        @Pattern(regexp = "^[a-z0-9]+(?:-[a-z0-9]+)*$",
                message = "도시 주소는 영문 소문자·숫자와 하이픈만 쓸 수 있습니다. (예: osaka, new-york)")
        String slug,

        @Schema(description = "도시명(한글)")
        @NotBlank(message = "도시명(한글)을 입력해주세요.")
        @Size(max = 80, message = "도시명은 80자 이하로 입력해주세요.")
        String nameKo,

        @Schema(description = "도시명(영문)")
        @NotBlank(message = "도시명(영문)을 입력해주세요.")
        @Size(max = 80, message = "도시명은 80자 이하로 입력해주세요.")
        String nameEn,

        @Schema(description = "지도 초기 중심 위도. 장소 분포와 무관하게 고정값이라 시청·중심가를 쓴다")
        @NotNull(message = "지도 중심 위도를 입력해주세요.")
        BigDecimal centerLat,

        @Schema(description = "지도 초기 중심 경도")
        @NotNull(message = "지도 중심 경도를 입력해주세요.")
        BigDecimal centerLng,

        @Schema(description = "지도 초기 줌 레벨 (0~22). 비우면 11")
        BigDecimal defaultZoom,

        @Schema(description = "국가 내 노출 순서 (작을수록 먼저). 비우면 0")
        Integer sortOrder,

        @Schema(description = "노출 여부. 끄면 공개 화면에서 없는 것으로 취급한다")
        Boolean isActive
) {
}

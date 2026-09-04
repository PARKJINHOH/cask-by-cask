package com.caskbycask.domain.venue.dto;

import com.caskbycask.domain.venue.entity.enums.VenueType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/**
 * 사용자 제보 폼.
 *
 * <p>관리자 등록 폼보다 훨씬 짧다 — 제보자에게 좌표·place id·영문 소개까지 요구하면
 * 아무도 제보하지 않는다. 나머지는 승인하는 관리자가 채운다.
 */
public record VenueRequestBody(
        @Schema(description = "장소 유형")
        @NotNull(message = "장소 유형을 선택해주세요.")
        VenueType venueType,

        @Schema(description = "장소명(한글)")
        @NotBlank(message = "장소명을 입력해주세요.")
        @Size(max = 200, message = "장소명은 200자 이하로 입력해주세요.")
        String nameKo,

        @Schema(description = "장소명(영문)")
        @Size(max = 200, message = "장소명은 200자 이하로 입력해주세요.")
        String nameEn,

        @Schema(description = "현지 표기")
        @Size(max = 200, message = "현지 표기는 200자 이하로 입력해주세요.")
        String nameLocal,

        @Schema(description = "국가 코드 (ISO 3166-1 alpha-2)")
        @NotBlank(message = "국가를 선택해주세요.")
        @Size(max = 2, message = "국가 코드는 영문 2자입니다.")
        String countryCode,

        @Schema(description = "도시명(자유 입력). 카탈로그에 없는 도시도 제보할 수 있게 텍스트로 받는다")
        @Size(max = 80, message = "도시명은 80자 이하로 입력해주세요.")
        String cityName,

        @Schema(description = "주소")
        @NotBlank(message = "주소를 입력해주세요.")
        @Size(max = 300, message = "주소는 300자 이하로 입력해주세요.")
        String address,

        @Schema(description = "상세 주소(층·호수)")
        @Size(max = 200, message = "상세 주소는 200자 이하로 입력해주세요.")
        String addressDetail,

        @Schema(description = "위도. 제보자는 보통 못 채운다")
        BigDecimal lat,
        @Schema(description = "경도")
        BigDecimal lng,

        @Schema(description = "전화번호")
        @Size(max = 40, message = "전화번호는 40자 이하로 입력해주세요.")
        String phone,

        @Schema(description = "웹사이트")
        @Size(max = 500, message = "URL은 500자 이하로 입력해주세요.")
        String website,

        @Schema(description = "인스타그램")
        @Size(max = 500, message = "URL은 500자 이하로 입력해주세요.")
        String instagramUrl,

        @Schema(description = "영업시간(자유 텍스트)")
        @Size(max = 500, message = "영업시간은 500자 이하로 입력해주세요.")
        String openingHours,

        @Schema(description = "네이버 지도 공유 링크")
        @Size(max = 500, message = "URL은 500자 이하로 입력해주세요.")
        String naverMapsUrl,

        @Schema(description = "카카오 지도 공유 링크")
        @Size(max = 500, message = "URL은 500자 이하로 입력해주세요.")
        String kakaoMapsUrl,

        @Schema(description = "구글 지도 공유 링크")
        @Size(max = 500, message = "URL은 500자 이하로 입력해주세요.")
        String googleMapsUrl,

        @Schema(description = "소개·추천 이유")
        @Size(max = 2000, message = "소개는 2000자 이하로 입력해주세요.")
        String descriptionKo
) {
}

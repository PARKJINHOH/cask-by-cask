package com.caskbycask.domain.venue.dto;

import com.caskbycask.domain.venue.entity.enums.VenueStatus;
import com.caskbycask.domain.venue.entity.enums.VenueType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/**
 * 관리자 장소 등록·수정 요청.
 *
 * <p><b>전체 치환</b>이다 — 생산자 쪽의 "null 이면 변경 안 함" 규약과 다르다.
 * 장소 관리 화면은 폼 하나에서 모든 값을 함께 보내므로, 부분 갱신 규약을 쓰면
 * "전화번호를 지웠다"와 "전화번호를 안 건드렸다"를 구분할 수 없다.
 * 폼이 항상 전 필드를 보내고 서버는 항상 그대로 적용한다.
 *
 * <p>좌표는 여기서 필수가 아니다. "공개(ACTIVE)일 때만 필수"라는 규칙은 값 검증이 아니라
 * 상태 전이 규칙이라 {@code VenueAdminService} 가 status 와 함께 판단한다.
 */
public record VenueUpsertRequest(
        @Schema(description = "도시 ID")
        @NotNull(message = "도시를 선택해주세요.")
        Long venueCityId,

        @Schema(description = "장소 유형 (BAR/BOTTLE_SHOP/OTHER)")
        @NotNull(message = "장소 유형을 선택해주세요.")
        VenueType venueType,

        @Schema(description = "생애주기 (ACTIVE/HIDDEN/CLOSED). ACTIVE 는 좌표가 있어야 한다")
        @NotNull(message = "노출 상태를 선택해주세요.")
        VenueStatus status,

        @Schema(description = "장소명(한글)")
        @NotBlank(message = "장소명을 입력해주세요.")
        @Size(max = 200, message = "장소명은 200자 이하로 입력해주세요.")
        String nameKo,

        @Schema(description = "장소명(영문). 비우면 화면에서 한글명으로 폴백한다")
        @Size(max = 200, message = "장소명은 200자 이하로 입력해주세요.")
        String nameEn,

        @Schema(description = "현지 표기(漢字/かな 등). 현장에서 간판을 찾는 데 쓴다")
        @Size(max = 200, message = "현지 표기는 200자 이하로 입력해주세요.")
        String nameLocal,

        @Schema(description = "주소")
        @NotBlank(message = "주소를 입력해주세요.")
        @Size(max = 300, message = "주소는 300자 이하로 입력해주세요.")
        String address,

        @Schema(description = "상세 주소(층·호수)")
        @Size(max = 200, message = "상세 주소는 200자 이하로 입력해주세요.")
        String addressDetail,

        @Schema(description = "위도. 지도에서 핀을 찍거나 공유 링크 해석으로 채운다")
        BigDecimal lat,

        @Schema(description = "경도")
        BigDecimal lng,

        @Schema(description = "전화번호(원문 표기 그대로)")
        @Size(max = 40, message = "전화번호는 40자 이하로 입력해주세요.")
        String phone,

        @Schema(description = "웹사이트")
        @Size(max = 500, message = "웹사이트 URL은 500자 이하로 입력해주세요.")
        String website,

        @Schema(description = "인스타그램")
        @Size(max = 500, message = "인스타그램 URL은 500자 이하로 입력해주세요.")
        String instagramUrl,

        @Schema(description = "영업시간(자유 텍스트). 구조화하지 않는다")
        String openingHours,

        @Schema(description = "구글 지도 URL")
        @Size(max = 500, message = "지도 URL은 500자 이하로 입력해주세요.")
        String googleMapsUrl,

        @Schema(description = "네이버 지도 URL")
        @Size(max = 500, message = "지도 URL은 500자 이하로 입력해주세요.")
        String naverMapsUrl,

        @Schema(description = "카카오 지도 URL")
        @Size(max = 500, message = "지도 URL은 500자 이하로 입력해주세요.")
        String kakaoMapsUrl,

        @Schema(description = "구글 place id")
        @Size(max = 120, message = "place id 는 120자 이하로 입력해주세요.")
        String googlePlaceId,

        @Schema(description = "네이버 place id")
        @Size(max = 60, message = "place id 는 60자 이하로 입력해주세요.")
        String naverPlaceId,

        @Schema(description = "소개(한글)")
        String descriptionKo,

        @Schema(description = "소개(영문)")
        String descriptionEn
) {
}

package com.caskbycask.domain.venue.entity;

import com.caskbycask.domain.venue.entity.enums.VenueStatus;
import com.caskbycask.domain.venue.entity.enums.VenueType;
import lombok.Builder;

import java.math.BigDecimal;

/**
 * 장소의 편집 가능한 필드 묶음.
 *
 * <p>이 record 가 존재하는 이유는 하나다 — {@code Venue} 에 인자 18개짜리 {@code update(...)} 를
 * 두지 않기 위해서다. 그중 열 개 남짓이 전부 {@code String} 이라 두 개를 뒤바꿔 넘겨도
 * 조용히 컴파일된다(리뷰 도메인이 이미 같은 모양의 위험을 안고 있다).
 *
 * <p>그래서 <b>반드시 빌더로 만든다</b>. 정규 생성자를 직접 부르면 같은 위험이 그대로 돌아오므로
 * 호출부는 {@code VenueProfile.builder().nameKo(...).address(...).build()} 형태를 지킨다.
 */
@Builder
public record VenueProfile(
        VenueType venueType,
        VenueStatus status,
        String nameKo,
        String nameEn,
        String nameLocal,
        String address,
        String addressDetail,
        BigDecimal lat,
        BigDecimal lng,
        String phone,
        String website,
        String instagramUrl,
        String openingHours,
        String googleMapsUrl,
        String naverMapsUrl,
        String kakaoMapsUrl,
        String googlePlaceId,
        String naverPlaceId,
        String descriptionKo,
        String descriptionEn
) {
    /** 이 내용대로 저장했을 때 지도에 그릴 수 있는 좌표인가. */
    public boolean hasPlottableCoordinates() {
        return Venue.isPlottable(lat, lng);
    }

    /** 좌표를 아예 넣지 않은 상태인가 — "잘못된 값"과 "아직 안 찍음"을 구분하려는 것. */
    public boolean hasNoCoordinates() {
        return lat == null && lng == null;
    }
}

package com.caskbycask.domain.venue.entity;

import com.caskbycask.domain.user.entity.User;
import com.caskbycask.domain.venue.entity.enums.VenueStatus;
import com.caskbycask.domain.venue.entity.enums.VenueType;
import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.BatchSize;
import org.hibernate.annotations.Comment;
import org.hibernate.annotations.SQLRestriction;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 주류 장소 — 바·몰트바·보틀샵·면세점.
 *
 * <p>Hibernate Search {@code @Indexed} 를 일부러 붙이지 않았다. 이 프로젝트는 기동할 때마다
 * 전체 재색인(mass indexing)을 돌리므로 색인 대상이 늘면 기동이 그만큼 느려진다.
 * 장소 검색은 도시 스코프 안에서만 이뤄져 QueryDSL LIKE 로 충분하다.
 */
@Entity
@Table(
        name = "venue",
        indexes = {
                @Index(name = "idx_venue_city_status", columnList = "venue_city_id, status, id"),
                @Index(name = "idx_venue_country_status", columnList = "country_code, status, id"),
                @Index(name = "idx_venue_bbox", columnList = "lat, lng")
        }
)
@SQLRestriction("deleted_at IS NULL")
/*
 * 지연 로딩되는 이 엔티티를 50개씩 묶어 가져온다.
 *
 * 리뷰 목록은 열 곳 넘는 쿼리 경로에서 만들어지는데, 그 전부에 fetch join 을 넣고
 * 앞으로도 빠뜨리지 않기를 기대하는 것은 현실적이지 않다. 클래스 레벨 배치 로딩은
 * 경로와 무관하게 N+1 을 1+1 로 눕힌다 — 새 쿼리가 생겨도 자동으로 보호된다.
 */
@BatchSize(size = 50)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Comment("주류 장소(바·보틀샵·면세점)")
public class Venue extends BaseTimeEntity {

    /** 위도 허용 범위. 값이 이 밖이면 지도에 그릴 수 없다. */
    public static final BigDecimal LAT_MIN = BigDecimal.valueOf(-90);
    public static final BigDecimal LAT_MAX = BigDecimal.valueOf(90);
    public static final BigDecimal LNG_MIN = BigDecimal.valueOf(-180);
    public static final BigDecimal LNG_MAX = BigDecimal.valueOf(180);

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Comment("PK")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "venue_city_id", nullable = false)
    @Comment("도시(venue_city.id)")
    private VenueCity city;

    /**
     * 도시에서 비정규화한 국가 코드. 국가 페이지가 조인 없이 인덱스 하나로 끝나게 하려는 것이라
     * 도시를 바꿀 때 {@link #changeCity} 가 함께 갱신한다.
     */
    @Column(name = "country_code", nullable = false, length = 2)
    @Comment("국가 코드(ISO 3166-1 alpha-2, 소문자)")
    private String countryCode;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Comment("장소 유형 — BAR/BOTTLE_SHOP/OTHER")
    private VenueType venueType;

    @Column(nullable = false, length = 200)
    @Comment("장소명(한글)")
    private String nameKo;

    @Column(length = 200)
    @Comment("장소명(영문) — 없으면 nameKo 로 폴백")
    private String nameEn;

    /** 현지 표기. 영문 로케일에서도 숨기지 않는다 — 현장에서 간판을 찾는 데 이게 필요하다. */
    @Column(length = 200)
    @Comment("현지 표기(漢字/かな 등)")
    private String nameLocal;

    @Column(nullable = false, length = 300)
    @Comment("주소")
    private String address;

    /** 층·호수. 지하나 3층에 숨은 바에서는 주소보다 이쪽이 실질 정보다. */
    @Column(length = 200)
    @Comment("상세 주소(층·호수)")
    private String addressDetail;

    /**
     * 좌표는 DB 레벨에서 nullable 이다 — "ACTIVE 일 때만 필수"는 스키마로 표현할 수 없어
     * {@link #canBeActive()} 로 서비스에서 검증한다.
     */
    @Column(precision = 9, scale = 7)
    @Comment("위도")
    private BigDecimal lat;

    @Column(precision = 10, scale = 7)
    @Comment("경도")
    private BigDecimal lng;

    @Column(length = 40)
    @Comment("전화번호(원문 표기 그대로)")
    private String phone;

    @Column(length = 500)
    @Comment("웹사이트")
    private String website;

    @Column(length = 500)
    @Comment("인스타그램")
    private String instagramUrl;

    /**
     * 자유 텍스트로 둔다. 요일별 범위·공휴일·라스트오더를 구조화하면 서브모델이 필요한데
     * 바 영업시간은 자주 바뀌고 제보 데이터는 금방 상한다. 그래서 JSON-LD 의
     * openingHoursSpecification 으로도 내보내지 않는다 — 틀린 시간을 리치 결과로 내보내는 것이
     * 아예 안 내보내는 것보다 나쁘다.
     */
    @Column(columnDefinition = "TEXT")
    @Comment("영업시간(자유 텍스트)")
    private String openingHours;

    @Column(length = 500)
    @Comment("구글 지도 URL(관리자 검증본)")
    private String googleMapsUrl;

    @Column(length = 500)
    @Comment("네이버 지도 URL(관리자 검증본)")
    private String naverMapsUrl;

    @Column(length = 500)
    @Comment("카카오 지도 URL(관리자 검증본)")
    private String kakaoMapsUrl;

    @Column(length = 120)
    @Comment("구글 place id")
    private String googlePlaceId;

    @Column(length = 60)
    @Comment("네이버 place id")
    private String naverPlaceId;

    @Column(columnDefinition = "TEXT")
    @Comment("소개(한글)")
    private String descriptionKo;

    @Column(columnDefinition = "TEXT")
    @Comment("소개(영문)")
    private String descriptionEn;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Comment("생애주기 — ACTIVE/HIDDEN/CLOSED")
    private VenueStatus status = VenueStatus.HIDDEN;

    /**
     * 가격 트래커 판매처 연결 슬롯. 면세점·보틀샵은 stores 와 같은 업소가 될 수 있어
     * 나중에 합칠 때 고고학을 하지 않으려고 미리 열어 뒀다. 릴리스 1 에서는 채우지 않는다.
     * 다른 도메인 엔티티를 끌어오지 않으려고 관계가 아니라 raw id 로 둔다.
     */
    @Column(name = "store_id")
    @Comment("가격 트래커 판매처(stores.id) 연결 슬롯 — 릴리스 1 미사용")
    private Long storeId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "submitted_by_id")
    @Comment("제보자(users.id)")
    private User submittedBy;

    @Column
    @Comment("소프트 삭제 시각")
    private LocalDateTime deletedAt;

    // ── 좌표 ────────────────────────────────────────────────

    /**
     * 지도에 그릴 수 있는 좌표인가.
     *
     * <p>{@code 0,0} 을 막는 것은 기니만 앞바다에 실제 장소가 없어서가 아니라, 파서·지오코더가
     * 실패했을 때 흔히 남기는 값이 0 이기 때문이다. 실패를 유효한 좌표로 착각하면
     * 아프리카 앞바다에 마커가 찍힌다.
     */
    public static boolean isPlottable(BigDecimal lat, BigDecimal lng) {
        if (lat == null || lng == null) return false;
        if (lat.signum() == 0 && lng.signum() == 0) return false;
        return lat.compareTo(LAT_MIN) >= 0 && lat.compareTo(LAT_MAX) <= 0
                && lng.compareTo(LNG_MIN) >= 0 && lng.compareTo(LNG_MAX) <= 0;
    }

    public boolean hasPlottableCoordinates() {
        return isPlottable(lat, lng);
    }

    /** ACTIVE 로 올릴 수 있는 상태인가 — 좌표 없는 장소가 공개되면 지도에서 사라진 채 목록에만 뜬다. */
    public boolean canBeActive() {
        return hasPlottableCoordinates();
    }

    /** 지도 마커로 나가는가. CLOSED 는 문서 페이지만 살고 마커에서는 빠진다. */
    public boolean isMappable() {
        return status == VenueStatus.ACTIVE && hasPlottableCoordinates();
    }

    // ── 변경 ────────────────────────────────────────────────

    /**
     * 관리자 폼이 보낸 값으로 <b>전부</b> 덮어쓴다.
     *
     * <p>부분 갱신이 아니다 — 폼이 항상 전 필드를 보내므로 "전화번호를 지웠다"와
     * "전화번호를 안 건드렸다"를 구분할 필요가 없고, 구분하려 들면 값을 지울 방법이 사라진다.
     */
    public void applyProfile(VenueProfile profile) {
        this.venueType = profile.venueType();
        this.status = profile.status();
        this.nameKo = profile.nameKo();
        this.nameEn = profile.nameEn();
        this.nameLocal = profile.nameLocal();
        this.address = profile.address();
        this.addressDetail = profile.addressDetail();
        this.lat = profile.lat();
        this.lng = profile.lng();
        this.phone = profile.phone();
        this.website = profile.website();
        this.instagramUrl = profile.instagramUrl();
        this.openingHours = profile.openingHours();
        this.googleMapsUrl = profile.googleMapsUrl();
        this.naverMapsUrl = profile.naverMapsUrl();
        this.kakaoMapsUrl = profile.kakaoMapsUrl();
        this.googlePlaceId = profile.googlePlaceId();
        this.naverPlaceId = profile.naverPlaceId();
        this.descriptionKo = profile.descriptionKo();
        this.descriptionEn = profile.descriptionEn();
    }

    /** 신규 등록. 도시에서 국가 코드를 가져오므로 호출부가 둘을 따로 맞출 일이 없다. */
    public static Venue create(VenueCity city, VenueProfile profile, User submittedBy) {
        Venue venue = Venue.builder()
                .city(city)
                .countryCode(city.getCountryCode())
                .venueType(profile.venueType())
                .status(profile.status())
                .nameKo(profile.nameKo())
                .address(profile.address())
                .submittedBy(submittedBy)
                .build();
        venue.applyProfile(profile);
        return venue;
    }

    /** 도시를 바꾸면 비정규화해 둔 country_code 도 같이 따라가야 한다. */
    public void changeCity(VenueCity city) {
        this.city = city;
        this.countryCode = city.getCountryCode();
    }

    public void changeStatus(VenueStatus status) {
        this.status = status;
    }

    public void changeCoordinates(BigDecimal lat, BigDecimal lng) {
        this.lat = lat;
        this.lng = lng;
    }

    public void softDelete() {
        this.deletedAt = LocalDateTime.now();
    }
}

package com.caskbycask.domain.venue.entity;

import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.BatchSize;
import org.hibernate.annotations.Comment;

import java.math.BigDecimal;

/**
 * 주류 장소를 묶는 도시 카탈로그.
 *
 * <p>도시를 venue 의 자유 텍스트가 아니라 별도 표로 두는 이유는 <b>지도의 초기 화면</b>이다 —
 * 중심 좌표와 줌은 어느 venue 의 속성도 아니라서, venue 들의 bbox 로 계산하면 가게가
 * 하나 추가되거나 숨겨질 때마다 지도가 튄다. 표기 통일('osaka' vs 'osaka-shi')과
 * 정렬 순서를 둘 자리이기도 하다.
 *
 * <p>새 도시 추가에 마이그레이션은 필요 없다 — 도시는 스키마가 아니라 데이터이고
 * 관리자 화면에서 INSERT 한다.
 */
@Entity
@Table(
        name = "venue_city",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_venue_city_country_slug", columnNames = {"country_code", "slug"}),
        indexes = @Index(
                name = "idx_venue_city_country_sort", columnList = "country_code, sort_order, id")
)
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
@Comment("주류 장소 도시 카탈로그")
public class VenueCity extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Comment("PK")
    private Long id;

    @Column(name = "country_code", nullable = false, length = 2)
    @Comment("국가 코드(ISO 3166-1 alpha-2, 소문자)")
    private String countryCode;

    @Column(nullable = false, length = 60)
    @Comment("URL 세그먼트 — /venues/{country_code}/{slug}")
    private String slug;

    @Column(nullable = false, length = 80)
    @Comment("도시명(한글)")
    private String nameKo;

    @Column(nullable = false, length = 80)
    @Comment("도시명(영문)")
    private String nameEn;

    @Column(nullable = false, precision = 9, scale = 7)
    @Comment("지도 초기 중심 위도")
    private BigDecimal centerLat;

    @Column(nullable = false, precision = 10, scale = 7)
    @Comment("지도 초기 중심 경도")
    private BigDecimal centerLng;

    @Builder.Default
    @Column(nullable = false, precision = 4, scale = 2)
    @Comment("지도 초기 줌 레벨")
    private BigDecimal defaultZoom = BigDecimal.valueOf(11);

    @Builder.Default
    @Column(nullable = false)
    @Comment("국가 내 노출 순서(작을수록 먼저)")
    private Integer sortOrder = 0;

    /** 물리 삭제 대신 이 값을 내린다 — 이미 이 도시에 매달린 venue 가 미아가 되지 않도록. */
    @Builder.Default
    @Column(nullable = false)
    @Comment("노출 여부")
    private Boolean isActive = true;

    public void update(String slug, String nameKo, String nameEn,
                       BigDecimal centerLat, BigDecimal centerLng, BigDecimal defaultZoom,
                       Integer sortOrder) {
        this.slug = slug;
        this.nameKo = nameKo;
        this.nameEn = nameEn;
        this.centerLat = centerLat;
        this.centerLng = centerLng;
        this.defaultZoom = defaultZoom;
        this.sortOrder = sortOrder;
    }

    public void activate() {
        this.isActive = true;
    }

    public void deactivate() {
        this.isActive = false;
    }
}

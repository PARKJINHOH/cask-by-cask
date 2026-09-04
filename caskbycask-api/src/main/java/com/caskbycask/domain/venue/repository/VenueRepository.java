package com.caskbycask.domain.venue.repository;

import com.caskbycask.domain.venue.dto.SpiritVenueCount;
import com.caskbycask.domain.venue.dto.VenueCityCount;
import com.caskbycask.domain.venue.entity.Venue;
import com.caskbycask.domain.venue.entity.enums.VenueStatus;
import com.caskbycask.domain.venue.entity.enums.VenueType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface VenueRepository extends JpaRepository<Venue, Long> {

    /**
     * 도시 안의 공개 장소 전부.
     *
     * <p>페이징하지 않는다 — 이 결과가 곧 지도의 마커 집합이라 "1페이지만 지도에 있는" 상태가
     * 사용자에게는 버그로 보인다. 한 도시의 장소 수는 오랫동안 수백 단위이고,
     * 커지면 그때 bbox 조회로 바꾼다(도시 스코프 자체가 그 seam 이다).
     *
     * <p>{@code city} 를 fetch join 하는 이유는 응답 DTO 가 도시명을 쓰기 때문이다 —
     * 없으면 목록 길이만큼 쿼리가 더 나간다.
     */
    @Query("""
            select v from Venue v
            join fetch v.city c
            where c.id = :cityId
              and v.status in :statuses
            order by case when v.status = com.caskbycask.domain.venue.entity.enums.VenueStatus.ACTIVE
                          then 0 else 1 end,
                     v.nameKo asc, v.id asc
            """)
    List<Venue> findAllByCityForDisplay(@Param("cityId") Long cityId,
                                        @Param("statuses") Collection<VenueStatus> statuses);

    @Query("""
            select v from Venue v
            join fetch v.city c
            where v.id = :id
              and v.status in :statuses
            """)
    Optional<Venue> findByIdForDisplay(@Param("id") Long id,
                                       @Param("statuses") Collection<VenueStatus> statuses);

    /**
     * 도시별 장소 수. {@code countryCode} 가 null 이면 전 국가를 한 번에 센다 —
     * 허브 페이지가 국가마다 따로 묻지 않게 하려는 것이다.
     */
    @Query("""
            select new com.caskbycask.domain.venue.dto.VenueCityCount(c.id, count(v))
            from Venue v
            join v.city c
            where (:countryCode is null or v.countryCode = :countryCode)
              and v.status in :statuses
            group by c.id
            """)
    List<VenueCityCount> countByCity(@Param("countryCode") String countryCode,
                                     @Param("statuses") Collection<VenueStatus> statuses);

    /**
     * 주류 상세의 "이 술을 마실 수 있는 곳".
     *
     * <p><b>하위 에디션까지 포함해서 센다.</b> 에디션 페이지는 별점을 마스터에서 가져오므로,
     * 여기만 정확한 spirit id 로 세면 별점은 있는데 바로 아래 "마실 수 있는 곳"은 늘 비어
     * 두 정보가 어긋난다. 별점이 id 집합을 정하는 방식과 똑같이 해석한다.
     *
     * <p>정렬은 리뷰 수 내림차순 + 최근 방문 내림차순 두 키다. 순수 count 만 쓰면
     * 2년 전 유행하던 바가 지난주에 사람들이 간 바를 계속 이긴다. 감쇠식을 SQL 에 넣지 않는 것은
     * 인덱스가 도울 수 없는 형태가 되기 때문이고, 대신 {@code since} 로 오래된 것을 잘라 낸다.
     */
    @Query("""
            select new com.caskbycask.domain.venue.dto.SpiritVenueCount(
                v.id, count(r), max(r.createdAt))
            from Review r
            join r.venue v
            where (r.spirit.id = :spiritId or r.spirit.parent.id = :spiritId)
              and r.isHidden = false
              and r.createdAt >= :since
              and v.status = com.caskbycask.domain.venue.entity.enums.VenueStatus.ACTIVE
            group by v.id
            order by count(r) desc, max(r.createdAt) desc
            """)
    List<SpiritVenueCount> findVenueCountsBySpirit(@Param("spiritId") Long spiritId,
                                                   @Param("since") LocalDateTime since,
                                                   Pageable pageable);

    /** 집계 결과를 한 번에 실체화한다 — id 마다 조회하면 그대로 N+1 이다. */
    @Query("""
            select v from Venue v
            join fetch v.city c
            where v.id in :ids
            """)
    List<Venue> findAllForDisplayByIds(@Param("ids") Collection<Long> ids);

    // ── 관리자 ──────────────────────────────────────────────

    /**
     * 관리자 목록 — 비공개(HIDDEN)까지 전부 본다.
     *
     * <p>모든 조건이 선택이라 {@code :param is null or ...} 로 묶었다. 조건 수가 다섯이고
     * 전부 단순 동등·부분일치라 QueryDSL 을 새로 들이는 것보다 이쪽이 읽기 쉽다.
     *
     * <p>페이징에 fetch join 을 함께 쓰지만 {@code city} 는 단일 값 연관이라
     * 인메모리 페이징(HHH000104)이 일어나지 않는다. count 쿼리는 조인 없이 따로 센다.
     */
    @Query(value = """
            select v from Venue v
            join fetch v.city c
            where (:countryCode is null or v.countryCode = :countryCode)
              and (:cityId is null or c.id = :cityId)
              and (:venueType is null or v.venueType = :venueType)
              and (:status is null or v.status = :status)
              and (:keyword is null or
                lower(v.nameKo)                     like lower(concat('%', :keyword, '%'))
                or lower(coalesce(v.nameEn, ''))    like lower(concat('%', :keyword, '%'))
                or lower(coalesce(v.nameLocal, '')) like lower(concat('%', :keyword, '%'))
                or lower(v.address)                 like lower(concat('%', :keyword, '%'))
              )
            """,
            countQuery = """
            select count(v) from Venue v
            where (:countryCode is null or v.countryCode = :countryCode)
              and (:cityId is null or v.city.id = :cityId)
              and (:venueType is null or v.venueType = :venueType)
              and (:status is null or v.status = :status)
              and (:keyword is null or
                lower(v.nameKo)                     like lower(concat('%', :keyword, '%'))
                or lower(coalesce(v.nameEn, ''))    like lower(concat('%', :keyword, '%'))
                or lower(coalesce(v.nameLocal, '')) like lower(concat('%', :keyword, '%'))
                or lower(v.address)                 like lower(concat('%', :keyword, '%'))
              )
            """)
    Page<Venue> searchForAdmin(@Param("keyword") String keyword,
                               @Param("countryCode") String countryCode,
                               @Param("cityId") Long cityId,
                               @Param("venueType") VenueType venueType,
                               @Param("status") VenueStatus status,
                               Pageable pageable);

    /** 관리자 상세 — 비공개도 열린다. */
    @Query("""
            select v from Venue v
            join fetch v.city c
            where v.id = :id
            """)
    Optional<Venue> findByIdForAdmin(@Param("id") Long id);

    /** 도시별 장소 수 (비공개 포함) — 관리자 도시 목록의 삭제 가능 판단용. */
    @Query("""
            select new com.caskbycask.domain.venue.dto.VenueCityCount(c.id, count(v))
            from Venue v
            join v.city c
            group by c.id
            """)
    List<VenueCityCount> countByCityForAdmin();

    /** 도시를 지울 수 있는지 — 장소가 하나라도 매달려 있으면 노출 끄기로만 대신한다. */
    boolean existsByCityId(Long cityId);

    /**
     * 이름·주소 부분 일치 검색. 리뷰 작성 화면의 "마신 곳" 콤보박스와 관리자 목록이 쓴다.
     * 도시 스코프 안에서만 도는 쿼리라 Hibernate Search 를 붙이지 않았다.
     */
    @Query("""
            select v from Venue v
            join fetch v.city c
            where v.status in :statuses
              and (:countryCode is null or v.countryCode = :countryCode)
              and (
                lower(v.nameKo)     like lower(concat('%', :keyword, '%'))
                or lower(coalesce(v.nameEn, ''))    like lower(concat('%', :keyword, '%'))
                or lower(coalesce(v.nameLocal, '')) like lower(concat('%', :keyword, '%'))
                or lower(v.address) like lower(concat('%', :keyword, '%'))
              )
            order by v.nameKo asc, v.id asc
            """)
    List<Venue> searchByKeyword(@Param("keyword") String keyword,
                                @Param("countryCode") String countryCode,
                                @Param("statuses") Collection<VenueStatus> statuses,
                                Pageable pageable);
}

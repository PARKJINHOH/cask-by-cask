package com.caskbycask.domain.youtube.repository;

import com.caskbycask.domain.youtube.entity.YoutubeVideo;
import com.caskbycask.domain.youtube.entity.enums.YoutubeVideoType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface YoutubeVideoRepository extends JpaRepository<YoutubeVideo, Long> {

    Optional<YoutubeVideo> findByVideoKey(String videoKey);

    List<YoutubeVideo> findByVideoKeyIn(Collection<String> videoKeys);

    /**
     * 공개 갤러리 목록.
     * <p>
     * 채널을 함께 가져온다 — 카드마다 채널명·프로필을 그리므로 지연 로딩이면 페이지당 N 번 더 나간다.
     * 정렬은 고정(pinned) 먼저, 그다음 최신순이다. `id DESC` 를 마지막에 두어 같은 초에 올라온
     * 영상들의 순서가 페이지를 넘길 때 흔들리지 않게 한다.
     */
    @Query(value = """
            SELECT v FROM YoutubeVideo v
            JOIN FETCH v.channel c
            WHERE v.isVisible = true
              AND c.isVisible = true AND c.permissionConfirmed = true
              AND (:channelId IS NULL OR c.id = :channelId)
              AND (:videoType IS NULL OR v.videoType = :videoType)
              AND (:keyword IS NULL OR LOWER(v.title) LIKE LOWER(CONCAT('%', :keyword, '%')))
              AND (:spiritId IS NULL OR EXISTS (
                    SELECT 1 FROM YoutubeVideoSpiritTag t
                    WHERE t.video = v AND t.spirit.id = :spiritId))
            ORDER BY v.isPinned DESC, v.publishedAt DESC, v.id DESC
            """,
            countQuery = """
            SELECT COUNT(v) FROM YoutubeVideo v
            JOIN v.channel c
            WHERE v.isVisible = true
              AND c.isVisible = true AND c.permissionConfirmed = true
              AND (:channelId IS NULL OR c.id = :channelId)
              AND (:videoType IS NULL OR v.videoType = :videoType)
              AND (:keyword IS NULL OR LOWER(v.title) LIKE LOWER(CONCAT('%', :keyword, '%')))
              AND (:spiritId IS NULL OR EXISTS (
                    SELECT 1 FROM YoutubeVideoSpiritTag t
                    WHERE t.video = v AND t.spirit.id = :spiritId))
            """)
    Page<YoutubeVideo> findPublicVideos(
            @Param("channelId") Long channelId,
            @Param("videoType") YoutubeVideoType videoType,
            @Param("keyword") String keyword,
            @Param("spiritId") Long spiritId,
            Pageable pageable
    );

    /** 상세 화면·JSON-LD 용. 비공개 채널의 영상은 상세도 열리지 않아야 한다. */
    @Query("""
            SELECT v FROM YoutubeVideo v
            JOIN FETCH v.channel c
            WHERE v.videoKey = :videoKey
              AND v.isVisible = true
              AND c.isVisible = true AND c.permissionConfirmed = true
            """)
    Optional<YoutubeVideo> findPublicByVideoKey(@Param("videoKey") String videoKey);

    /** 주류 상세의 '관련 영상' 역조회. */
    @Query("""
            SELECT v FROM YoutubeVideo v
            JOIN FETCH v.channel c
            WHERE v.isVisible = true
              AND c.isVisible = true AND c.permissionConfirmed = true
              AND EXISTS (SELECT 1 FROM YoutubeVideoSpiritTag t
                          WHERE t.video = v AND t.spirit.id = :spiritId)
            ORDER BY v.publishedAt DESC, v.id DESC
            """)
    List<YoutubeVideo> findPublicVideosBySpirit(@Param("spiritId") Long spiritId, Pageable pageable);

    @Query(value = """
            SELECT v FROM YoutubeVideo v
            JOIN FETCH v.channel c
            WHERE (:channelId IS NULL OR c.id = :channelId)
              AND (:isVisible IS NULL OR v.isVisible = :isVisible)
              AND (:keyword IS NULL OR LOWER(v.title) LIKE LOWER(CONCAT('%', :keyword, '%')))
            ORDER BY v.isPinned DESC, v.publishedAt DESC, v.id DESC
            """,
            countQuery = """
            SELECT COUNT(v) FROM YoutubeVideo v
            JOIN v.channel c
            WHERE (:channelId IS NULL OR c.id = :channelId)
              AND (:isVisible IS NULL OR v.isVisible = :isVisible)
              AND (:keyword IS NULL OR LOWER(v.title) LIKE LOWER(CONCAT('%', :keyword, '%')))
            """)
    Page<YoutubeVideo> findAllForAdmin(
            @Param("channelId") Long channelId,
            @Param("isVisible") Boolean isVisible,
            @Param("keyword") String keyword,
            Pageable pageable
    );

    /** 관리자 화면용 — 숨긴 영상까지 포함한 보유 편수. */
    long countByChannelId(Long channelId);

    /**
     * 공개 화면용 편수.
     * <p>
     * 목록 쿼리가 {@code isVisible = true} 로 거르므로 여기서도 같은 조건을 걸어야 한다.
     * 안 그러면 가용성 점검이 자동 숨김한 영상까지 세어, 채널 카드는 "20편"인데 실제로는
     * 15개만 뜨는 상태가 된다(점검은 행을 지우지 않으므로 그 차이가 계속 벌어진다).
     */
    long countByChannelIdAndIsVisibleTrue(Long channelId);

    /**
     * 가용성 점검 대상 — <b>오래 확인 안 한 것부터</b>.
     * <p>
     * 한 번도 확인하지 않은 영상(NULL)이 가장 먼저다. 매 실행이 상한만큼만 가져가므로
     * 영상이 늘어도 한 번의 실행 시간이 길어지지 않고, 전체가 순번대로 돌아간다.
     */
    @Query("""
            SELECT v FROM YoutubeVideo v
            ORDER BY CASE WHEN v.lastCheckedAt IS NULL THEN 0 ELSE 1 END,
                     v.lastCheckedAt ASC, v.id ASC
            """)
    List<YoutubeVideo> findAvailabilityCheckTargets(Pageable pageable);

    /** 자동 숨김된 영상 수 — 관리자 화면이 "죽은 영상 N편"을 보여 주는 데 쓴다. */
    long countByAutoHiddenTrue();
}

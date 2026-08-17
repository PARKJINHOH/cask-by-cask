package com.caskbycask.domain.youtube.repository;

import com.caskbycask.domain.youtube.entity.YoutubeChannel;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface YoutubeChannelRepository extends JpaRepository<YoutubeChannel, Long> {

    Optional<YoutubeChannel> findByChannelKey(String channelKey);

    boolean existsByChannelKey(String channelKey);

    /** 신규 채널을 목록 맨 아래에 붙일 때 쓰는 기준값. */
    Optional<YoutubeChannel> findTopByOrderBySortOrderDesc();

    /**
     * 공개 채널 목록. 허락 확인이 노출의 전제라 두 조건을 함께 건다
     * ({@link YoutubeChannel#isPubliclyVisible()} 과 같은 규칙 — 한쪽만 바꾸면 어긋난다).
     */
    @Query("""
            SELECT c FROM YoutubeChannel c
            WHERE c.isVisible = true AND c.permissionConfirmed = true
            ORDER BY c.sortOrder ASC, c.id ASC
            """)
    List<YoutubeChannel> findPublicChannels();

    /**
     * 채널 랜딩 페이지용. 주소에는 사람이 읽는 핸들이 들어가지만, 핸들이 없는 채널도 있어
     * 채널 ID 로도 찾을 수 있게 둘 다 받는다(대소문자 무시 — 주소를 손으로 칠 수 있다).
     */
    @Query("""
            SELECT c FROM YoutubeChannel c
            WHERE c.isVisible = true AND c.permissionConfirmed = true
              AND (LOWER(c.handle) = LOWER(:ref) OR c.channelKey = :ref)
            """)
    Optional<YoutubeChannel> findPublicByRef(@Param("ref") String ref);

    @Query("""
            SELECT c FROM YoutubeChannel c
            WHERE c.syncEnabled = true AND c.permissionConfirmed = true
            ORDER BY c.id ASC
            """)
    List<YoutubeChannel> findSyncTargets();

    @Query("""
            SELECT c FROM YoutubeChannel c
            WHERE (:isVisible IS NULL OR c.isVisible = :isVisible)
              AND (:keyword IS NULL OR LOWER(c.title) LIKE LOWER(CONCAT('%', :keyword, '%'))
                   OR LOWER(c.handle) LIKE LOWER(CONCAT('%', :keyword, '%')))
            ORDER BY c.sortOrder ASC, c.id ASC
            """)
    Page<YoutubeChannel> findAllForAdmin(
            @Param("isVisible") Boolean isVisible,
            @Param("keyword") String keyword,
            Pageable pageable
    );
}

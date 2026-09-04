package com.caskbycask.domain.venue.repository;

import com.caskbycask.domain.venue.entity.VenueCommentImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface VenueCommentImageRepository extends JpaRepository<VenueCommentImage, Long> {

    List<VenueCommentImage> findAllByCommentIdOrderBySortOrderAscIdAsc(Long commentId);

    /** 이미지 서빙 — 저장 파일명은 UUID 라 추측할 수 없고, 유일 제약이 걸려 있다. */
    Optional<VenueCommentImage> findBySavedFileName(String savedFileName);

    /**
     * 여러 댓글의 이미지를 한 번에. 목록 렌더에서 댓글마다 조회하면 그대로 N+1 이 된다.
     */
    @Query("""
            select i from VenueCommentImage i
            where i.comment.id in :commentIds
            order by i.comment.id asc, i.sortOrder asc, i.id asc
            """)
    List<VenueCommentImage> findAllByCommentIds(@Param("commentIds") List<Long> commentIds);

    /** 장소의 사진 갤러리 — 그 장소의 모든 댓글에 달린 이미지를 최신순으로 모은다. */
    @Query("""
            select i from VenueCommentImage i
            join i.comment c
            where c.venue.id = :venueId
              and c.deletedAt is null
              and c.isHidden = false
            order by c.createdAt desc, i.sortOrder asc, i.id asc
            """)
    List<VenueCommentImage> findGalleryByVenueId(@Param("venueId") Long venueId);
}

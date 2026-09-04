package com.caskbycask.domain.venue.repository;

import com.caskbycask.domain.venue.entity.VenueComment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface VenueCommentRepository extends JpaRepository<VenueComment, Long> {

    /**
     * 한 장소의 댓글 전부. 부모·대댓글을 한 번에 가져와 화면에서 묶는다 —
     * 부모별로 대댓글을 따로 조회하면 목록 길이만큼 쿼리가 늘어난다.
     *
     * <p>작성자를 fetch join 하는 이유도 같다. 응답 DTO 가 닉네임·레벨을 쓴다.
     *
     * <p>숨겨진 댓글도 가져온다 — 목록에서 지워 버리면 대댓글이 부모를 잃는다.
     * "숨김 처리된 댓글입니다" 로 자리만 남기는 판단은 응답 조립 단계에서 한다.
     */
    @Query("""
            select c from VenueComment c
            join fetch c.user u
            where c.venue.id = :venueId
            order by coalesce(c.parentId, c.id) asc, c.id asc
            """)
    List<VenueComment> findAllByVenueForDisplay(@Param("venueId") Long venueId);

    @Query("""
            select c from VenueComment c
            join fetch c.user u
            join fetch c.venue v
            where c.id = :id
            """)
    java.util.Optional<VenueComment> findByIdForDisplay(@Param("id") Long id);

    long countByVenueIdAndIsHiddenFalse(Long venueId);

    List<VenueComment> findAllByVenueId(Long venueId);

    /** 대댓글 존재 확인 — 부모를 지울 때 통째로 지울지 판단한다. */
    boolean existsByParentId(Long parentId);

    List<VenueComment> findAllByParentId(Long parentId);
}

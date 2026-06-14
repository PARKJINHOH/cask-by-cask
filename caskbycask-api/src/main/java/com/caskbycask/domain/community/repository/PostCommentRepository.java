package com.caskbycask.domain.community.repository;

import com.caskbycask.domain.community.entity.PostComment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface PostCommentRepository extends JpaRepository<PostComment, Long> {

    // [점수이력 링크] 댓글 id → 소속 게시글 id/boardType 배치 조회 (행: [commentId, postId, boardType])
    @Query("SELECT c.id, c.post.id, c.post.boardType FROM PostComment c " +
           "WHERE c.id IN :ids AND c.post IS NOT NULL")
    List<Object[]> findPostInfoByIdIn(@Param("ids") Collection<Long> ids);

    // 게시글 루트 댓글 목록 (삭제·숨김 포함) — 삭제/숨김 댓글은 플레이스홀더로 표시
    Page<PostComment> findByPostIdAndParentIsNull(
            Long postId, Pageable pageable);

    // 차단 작성자 제외 버전 (로그인 + 차단 목록 존재 시)
    Page<PostComment> findByPostIdAndParentIsNullAndAuthorIdNotIn(
            Long postId, List<Long> authorIds, Pageable pageable);

    // 부모 댓글의 대댓글 목록 (삭제·숨김 포함)
    List<PostComment> findByParentIdOrderByCreatedAtAsc(
            Long parentId);

    // 차단 작성자 제외 버전
    List<PostComment> findByParentIdAndAuthorIdNotInOrderByCreatedAtAsc(
            Long parentId, List<Long> authorIds);

    // [N+1 방지] 여러 루트 댓글의 대댓글을 한 번에 조회 후 부모별로 그룹핑
    List<PostComment> findByParentIdInOrderByParentIdAscCreatedAtAsc(
            List<Long> parentIds);

    // 차단 작성자 제외 배치 버전
    List<PostComment> findByParentIdInAndAuthorIdNotInOrderByParentIdAscCreatedAtAsc(
            List<Long> parentIds, List<Long> authorIds);

    // 비밀댓글 캐스케이딩: 같은 부모를 가진 형제 대댓글 중 비밀댓글이 이미 존재하는지 확인
    boolean existsByParentIdAndIsSecretTrue(Long parentId);

    // 게시글 삭제 시 댓글의 post FK를 null로 처리 (댓글 레코드 자체는 유지)
    @Modifying
    @Query("UPDATE PostComment c SET c.post = null WHERE c.post.id = :postId")
    void clearPostReference(@Param("postId") Long postId);
}

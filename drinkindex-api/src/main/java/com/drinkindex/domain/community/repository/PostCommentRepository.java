package com.drinkindex.domain.community.repository;

import com.drinkindex.domain.community.entity.PostComment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PostCommentRepository extends JpaRepository<PostComment, Long> {

    // 게시글 루트 댓글 목록 (삭제 포함, 숨김 제외) — 삭제 댓글은 "삭제된 댓글" 표시
    Page<PostComment> findByPostIdAndParentIsNullAndIsHiddenFalse(
            Long postId, Pageable pageable);

    // 부모 댓글의 대댓글 목록 (삭제 포함, 숨김 제외)
    List<PostComment> findByParentIdAndIsHiddenFalseOrderByCreatedAtAsc(
            Long parentId);

    // 게시글 삭제 시 댓글의 post FK를 null로 처리 (댓글 레코드 자체는 유지)
    @Modifying
    @Query("UPDATE PostComment c SET c.post = null WHERE c.post.id = :postId")
    void clearPostReference(@Param("postId") Long postId);
}

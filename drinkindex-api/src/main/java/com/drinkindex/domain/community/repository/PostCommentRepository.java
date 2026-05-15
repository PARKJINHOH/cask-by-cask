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

    // 게시글 루트 댓글 목록 (부모 없음, 삭제 안 됨, 숨김 아님)
    Page<PostComment> findByPostIdAndParentIsNullAndDeletedAtIsNullAndIsHiddenFalse(
            Long postId, Pageable pageable);

    // 부모 댓글의 대댓글 목록
    List<PostComment> findByParentIdAndDeletedAtIsNullAndIsHiddenFalseOrderByCreatedAtAsc(
            Long parentId);

    // 게시글 삭제 시 댓글의 post FK를 null로 처리 (댓글 레코드 자체는 유지)
    @Modifying
    @Query("UPDATE PostComment c SET c.post = null WHERE c.post.id = :postId")
    void clearPostReference(@Param("postId") Long postId);
}

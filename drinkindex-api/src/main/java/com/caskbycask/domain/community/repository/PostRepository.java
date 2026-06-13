package com.caskbycask.domain.community.repository;

import com.caskbycask.domain.community.entity.Post;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface PostRepository extends JpaRepository<Post, Long>, PostQueryRepository {

    // [점수이력 링크] 게시글 id → boardType 배치 조회 (행: [id, boardType])
    @Query("SELECT p.id, p.boardType FROM Post p WHERE p.id IN :ids")
    List<Object[]> findIdAndBoardTypeByIdIn(@Param("ids") Collection<Long> ids);

    List<Post> findBySeriesIdOrderBySeriesOrderAsc(Long seriesId);

    @Query("SELECT MAX(p.seriesOrder) FROM Post p WHERE p.series.id = :seriesId")
    Optional<Integer> findMaxSeriesOrderBySeriesId(@Param("seriesId") Long seriesId);

    @Modifying
    @Query("UPDATE Post p SET p.series = null, p.seriesOrder = null WHERE p.series.id = :seriesId")
    void unlinkAllFromSeries(@Param("seriesId") Long seriesId);

    @Modifying
    @Query("UPDATE Post p SET p.series = null, p.seriesOrder = null WHERE p.id = :postId")
    void unlinkFromSeries(@Param("postId") Long postId);

    @Modifying
    @Query("UPDATE Post p SET p.viewCount = p.viewCount + 1 WHERE p.id = :id")
    void incrementViewCount(@Param("id") Long id);

    @Modifying
    @Query("UPDATE Post p SET p.likeCount = p.likeCount + 1 WHERE p.id = :id")
    void incrementLikeCount(@Param("id") Long id);

    @Modifying
    @Query("UPDATE Post p SET p.likeCount = p.likeCount - 1 WHERE p.id = :id AND p.likeCount > 0")
    void decrementLikeCount(@Param("id") Long id);

    @Modifying
    @Query("UPDATE Post p SET p.commentCount = p.commentCount + 1 WHERE p.id = :id")
    void incrementCommentCount(@Param("id") Long id);

    @Modifying
    @Query("UPDATE Post p SET p.commentCount = p.commentCount - 1 WHERE p.id = :id AND p.commentCount > 0")
    void decrementCommentCount(@Param("id") Long id);

    // 미디어 고아 정리 — 게시글 본문에 해당 파일명이 박혀 있는지 (사용 중 여부 교차검증)
    @Query("SELECT COUNT(p) > 0 FROM Post p WHERE p.content LIKE CONCAT('%', :fragment, '%')")
    boolean existsByContentContaining(@Param("fragment") String fragment);
}

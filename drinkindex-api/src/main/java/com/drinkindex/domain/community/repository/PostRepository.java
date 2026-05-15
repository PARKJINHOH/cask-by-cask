package com.drinkindex.domain.community.repository;

import com.drinkindex.domain.community.entity.Post;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PostRepository extends JpaRepository<Post, Long>, PostQueryRepository {

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
    @Query("UPDATE Post p SET p.dislikeCount = p.dislikeCount + 1 WHERE p.id = :id")
    void incrementDislikeCount(@Param("id") Long id);

    @Modifying
    @Query("UPDATE Post p SET p.dislikeCount = p.dislikeCount - 1 WHERE p.id = :id AND p.dislikeCount > 0")
    void decrementDislikeCount(@Param("id") Long id);

    @Modifying
    @Query("UPDATE Post p SET p.commentCount = p.commentCount + 1 WHERE p.id = :id")
    void incrementCommentCount(@Param("id") Long id);

    @Modifying
    @Query("UPDATE Post p SET p.commentCount = p.commentCount - 1 WHERE p.id = :id AND p.commentCount > 0")
    void decrementCommentCount(@Param("id") Long id);
}

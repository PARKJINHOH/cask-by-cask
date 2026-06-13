package com.caskbycask.domain.community.repository;

import com.caskbycask.domain.community.entity.PostScrap;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface PostScrapRepository extends JpaRepository<PostScrap, Long> {

    Optional<PostScrap> findByPostIdAndUserId(Long postId, Long userId);

    boolean existsByPostIdAndUserId(Long postId, Long userId);

    Page<PostScrap> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    @Modifying
    @Query("DELETE FROM PostScrap s WHERE s.post.id = :postId")
    void deleteAllByPostId(@Param("postId") Long postId);
}

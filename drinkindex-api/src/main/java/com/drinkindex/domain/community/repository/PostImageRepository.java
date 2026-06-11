package com.drinkindex.domain.community.repository;

import com.drinkindex.domain.community.entity.PostImage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface PostImageRepository extends JpaRepository<PostImage, Long> {

    List<PostImage> findByPostId(Long postId);

    Optional<PostImage> findByImageUrl(String imageUrl);

    // 미디어 용량 정책 검증용 — 본문에 사용된 이미지 일괄 조회
    List<PostImage> findByImageUrlIn(Collection<String> imageUrls);

    Optional<PostImage> findBySavedFileName(String savedFileName);

    // 고아 정리 후보: 미연결(is_used=false) + 업로드 후 유예기간 경과
    List<PostImage> findByIsUsedFalseAndCreatedAtBefore(LocalDateTime cutoff);
}

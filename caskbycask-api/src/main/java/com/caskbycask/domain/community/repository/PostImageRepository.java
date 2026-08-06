package com.caskbycask.domain.community.repository;

import com.caskbycask.domain.community.dto.PostThumbnail;
import com.caskbycask.domain.community.entity.PostImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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

    @Query("""
        select new com.caskbycask.domain.community.dto.PostThumbnail(
            i.post.id, i.imageUrl, i.width, i.height)
        from PostImage i
        where i.post.id in :postIds
          and i.id in (
              select min(i2.id)
              from PostImage i2
              where i2.post.id in :postIds
              group by i2.post.id
          )
        """)
    List<PostThumbnail> findFirstThumbnailsByPostIds(@Param("postIds") Collection<Long> postIds);

    // 고아 정리 후보: 미연결(is_used=false) + 업로드 후 유예기간 경과
    List<PostImage> findByIsUsedFalseAndCreatedAtBefore(LocalDateTime cutoff);
}

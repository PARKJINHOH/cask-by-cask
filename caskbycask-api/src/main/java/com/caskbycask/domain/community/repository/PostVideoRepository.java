package com.caskbycask.domain.community.repository;

import com.caskbycask.domain.community.entity.PostVideo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface PostVideoRepository extends JpaRepository<PostVideo, Long> {

    Optional<PostVideo> findBySavedFileName(String savedFileName);

    List<PostVideo> findByPostId(Long postId);

    Optional<PostVideo> findByVideoUrl(String videoUrl);

    // 미디어 용량 정책 검증용 — 본문에 사용된 동영상 일괄 조회
    List<PostVideo> findByVideoUrlIn(Collection<String> videoUrls);

    @Query("""
        select v.post.id, v.videoUrl
        from PostVideo v
        where v.post.id in :postIds
          and v.id in (
              select min(v2.id)
              from PostVideo v2
              where v2.post.id in :postIds
              group by v2.post.id
          )
        """)
    List<Object[]> findFirstVideoUrlsByPostIds(@Param("postIds") Collection<Long> postIds);

    // 고아 정리 후보: 미연결(is_used=false) + 업로드 후 유예기간 경과
    List<PostVideo> findByIsUsedFalseAndCreatedAtBefore(LocalDateTime cutoff);
}

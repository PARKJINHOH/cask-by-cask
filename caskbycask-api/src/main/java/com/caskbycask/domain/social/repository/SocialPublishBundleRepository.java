package com.caskbycask.domain.social.repository;

import com.caskbycask.domain.social.entity.SocialPublishBundle;
import com.caskbycask.domain.social.entity.enums.SocialSourceType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface SocialPublishBundleRepository extends JpaRepository<SocialPublishBundle, Long> {
    List<SocialPublishBundle> findByOriginTypeAndOriginId(SocialSourceType type, Long originId);
    List<SocialPublishBundle> findByContentTypeAndContentId(SocialSourceType type, Long contentId);

    // 마이페이지 "내 리뷰" 처럼 한 페이지의 원본 여러 건을 한 번에 볼 때 쓴다 (카드마다 조회하면 N+1).
    List<SocialPublishBundle> findByOriginTypeAndOriginIdIn(SocialSourceType type, Collection<Long> originIds);
    List<SocialPublishBundle> findByContentTypeAndContentIdIn(SocialSourceType type, Collection<Long> contentIds);
    Optional<SocialPublishBundle> findByShortCode(String shortCode);
    Page<SocialPublishBundle> findByRequestedByIdOrderByCreatedAtDesc(Long userId, Pageable pageable);
}

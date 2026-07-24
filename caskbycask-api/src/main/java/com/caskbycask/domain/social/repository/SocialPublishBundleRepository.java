package com.caskbycask.domain.social.repository;

import com.caskbycask.domain.social.entity.SocialPublishBundle;
import com.caskbycask.domain.social.entity.enums.SocialSourceType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SocialPublishBundleRepository extends JpaRepository<SocialPublishBundle, Long> {
    List<SocialPublishBundle> findByOriginTypeAndOriginId(SocialSourceType type, Long originId);
    List<SocialPublishBundle> findByContentTypeAndContentId(SocialSourceType type, Long contentId);
    Optional<SocialPublishBundle> findByShortCode(String shortCode);
    Page<SocialPublishBundle> findByRequestedByIdOrderByCreatedAtDesc(Long userId, Pageable pageable);
}

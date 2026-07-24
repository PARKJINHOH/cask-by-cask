package com.caskbycask.domain.social.repository;

import com.caskbycask.domain.social.entity.SocialThumbnailTemplate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SocialThumbnailTemplateRepository extends JpaRepository<SocialThumbnailTemplate, Long> {
    List<SocialThumbnailTemplate> findByActiveTrueOrderByDisplayOrderAscIdAsc();
    List<SocialThumbnailTemplate> findAllByOrderByDisplayOrderAscIdAsc();
}

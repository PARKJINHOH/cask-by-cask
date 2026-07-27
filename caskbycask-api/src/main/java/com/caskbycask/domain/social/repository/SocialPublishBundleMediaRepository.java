package com.caskbycask.domain.social.repository;

import com.caskbycask.domain.social.entity.SocialPublishBundleMedia;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SocialPublishBundleMediaRepository
        extends JpaRepository<SocialPublishBundleMedia, Long> {

    List<SocialPublishBundleMedia> findByBundleIdOrderBySortOrderAscIdAsc(Long bundleId);

    void deleteByBundleId(Long bundleId);
}

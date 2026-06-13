package com.caskbycask.domain.notice.repository;

import com.caskbycask.domain.notice.entity.NoticeImage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface NoticeImageRepository extends JpaRepository<NoticeImage, Long> {

    List<NoticeImage> findByNoticeId(Long noticeId);

    List<NoticeImage> findByNoticeIdAndIsUsedTrue(Long noticeId);

    Optional<NoticeImage> findByImageUrl(String imageUrl);

    Optional<NoticeImage> findBySavedFileName(String savedFileName);
}

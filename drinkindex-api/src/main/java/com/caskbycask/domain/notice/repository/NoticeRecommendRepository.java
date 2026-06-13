package com.caskbycask.domain.notice.repository;

import com.caskbycask.domain.notice.entity.NoticeRecommend;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface NoticeRecommendRepository extends JpaRepository<NoticeRecommend, Long> {

    Optional<NoticeRecommend> findByNoticeIdAndUserId(Long noticeId, Long userId);

    boolean existsByNoticeIdAndUserId(Long noticeId, Long userId);

    // 목록에서 현재 사용자가 추천한 공지 id 일괄 조회
    @org.springframework.data.jpa.repository.Query(
            "SELECT nr.notice.id FROM NoticeRecommend nr WHERE nr.user.id = :userId AND nr.notice.id IN :noticeIds")
    List<Long> findRecommendedNoticeIds(
            @org.springframework.data.repository.query.Param("userId") Long userId,
            @org.springframework.data.repository.query.Param("noticeIds") List<Long> noticeIds);
}

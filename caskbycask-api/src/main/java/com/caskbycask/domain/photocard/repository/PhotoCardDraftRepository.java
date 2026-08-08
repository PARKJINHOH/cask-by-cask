package com.caskbycask.domain.photocard.repository;

import com.caskbycask.domain.photocard.entity.PhotoCardDraft;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface PhotoCardDraftRepository extends JpaRepository<PhotoCardDraft, Long> {

    /** 내 임시저장 — 만료된 것은 배치가 지우기 전이라도 보여 주지 않는다. */
    List<PhotoCardDraft> findByUserIdAndExpiresAtAfterOrderByUpdatedAtDesc(Long userId, LocalDateTime now);

    /** 개수 제한은 만료 전인 것만 센다(곧 사라질 것이 새 저장을 막지 않게). */
    long countByUserIdAndExpiresAtAfter(Long userId, LocalDateTime now);

    Optional<PhotoCardDraft> findByIdAndUserId(Long id, Long userId);

    List<PhotoCardDraft> findAllByExpiresAtLessThanEqual(LocalDateTime now);
}

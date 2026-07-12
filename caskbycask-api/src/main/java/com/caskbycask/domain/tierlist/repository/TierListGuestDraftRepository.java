package com.caskbycask.domain.tierlist.repository;

import com.caskbycask.domain.tierlist.entity.TierListGuestDraft;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface TierListGuestDraftRepository extends JpaRepository<TierListGuestDraft, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<TierListGuestDraft> findByTokenHash(String tokenHash);
    boolean existsByTokenHash(String tokenHash);
    List<TierListGuestDraft> findAllByExpiresAtLessThanEqual(LocalDateTime expiresAt);
}

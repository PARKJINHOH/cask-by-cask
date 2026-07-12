package com.caskbycask.domain.tierlist.repository;

import com.caskbycask.domain.tierlist.entity.TierListGuestDraftImage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TierListGuestDraftImageRepository extends JpaRepository<TierListGuestDraftImage, Long> {
    List<TierListGuestDraftImage> findAllByDraftId(Long draftId);
    long countByDraftId(Long draftId);
    Optional<TierListGuestDraftImage> findBySavedFileName(String savedFileName);
}

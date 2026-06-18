package com.caskbycask.domain.deal.repository;

import com.caskbycask.domain.deal.entity.DealPost;
import com.caskbycask.domain.deal.entity.enums.DealStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DealPostRepository extends JpaRepository<DealPost, Long> {

    Page<DealPost> findAllByStatusOrderByCreatedAtDesc(DealStatus status, Pageable pageable);

    Page<DealPost> findAllByOrderByCreatedAtDesc(Pageable pageable);

    List<DealPost> findAllBySpiritIdAndStatusAndIsVisibleTrue(Long spiritId, DealStatus status);

    Optional<DealPost> findBySourceUrl(String sourceUrl);

    boolean existsBySourceUrl(String sourceUrl);
}

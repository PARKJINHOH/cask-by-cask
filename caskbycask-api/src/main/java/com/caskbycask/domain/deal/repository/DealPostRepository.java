package com.caskbycask.domain.deal.repository;

import com.caskbycask.domain.deal.entity.DealPost;
import com.caskbycask.domain.deal.entity.enums.DealStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface DealPostRepository extends JpaRepository<DealPost, Long> {

    Page<DealPost> findAllByStatusOrderByCreatedAtDesc(DealStatus status, Pageable pageable);

    Page<DealPost> findAllByOrderByCreatedAtDesc(Pageable pageable);

    Page<DealPost> findAllByDrinkNameContainingIgnoreCaseOrderByCreatedAtDesc(
            String drinkName, Pageable pageable);

    Page<DealPost> findAllByStatusAndDrinkNameContainingIgnoreCaseOrderByCreatedAtDesc(
            DealStatus status, String drinkName, Pageable pageable);

    List<DealPost> findAllBySpiritIdAndStatusAndIsVisibleTrue(Long spiritId, DealStatus status);

    List<DealPost> findAllBySpiritIdInAndStatusAndIsVisibleTrue(Collection<Long> spiritIds, DealStatus status);

    /** SEO 본문용 최근 승인·공개 핫딜 1건 조회. 호출 측에서 Pageable(0, 1)을 전달한다. */
    @Query("""
            SELECT d FROM DealPost d
            WHERE d.spirit.id IN :spiritIds
            AND d.status = :status
            AND d.isVisible = true
            ORDER BY d.crawledAt DESC, d.id DESC
            """)
    List<DealPost> findRecentVisibleForSeo(
            @Param("spiritIds") Collection<Long> spiritIds,
            @Param("status") DealStatus status,
            Pageable pageable);

    Optional<DealPost> findBySourceUrl(String sourceUrl);

    boolean existsBySourceUrl(String sourceUrl);
}

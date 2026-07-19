package com.caskbycask.domain.tastetree.repository;

import com.caskbycask.domain.tastetree.entity.TasteTreeDailyView;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;

public interface TasteTreeDailyViewRepository extends JpaRepository<TasteTreeDailyView, Long> {
    boolean existsByTreeIdAndViewerKeyHashAndViewedDate(Long treeId, String viewerKeyHash, LocalDate viewedDate);

    @Modifying
    @Query("DELETE FROM TasteTreeDailyView v WHERE v.viewedDate < :cutoff")
    int deleteBefore(@Param("cutoff") LocalDate cutoff);
}

package com.caskbycask.domain.tierlist.repository;

import com.caskbycask.domain.tierlist.entity.TierListRow;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface TierListRowRepository extends JpaRepository<TierListRow, Long> {

    List<TierListRow> findByTierListIdOrderBySortOrderAscIdAsc(Long tierListId);

    @Modifying
    @Query("DELETE FROM TierListRow r WHERE r.tierList.id = :tierListId")
    void deleteByTierListId(@Param("tierListId") Long tierListId);
}

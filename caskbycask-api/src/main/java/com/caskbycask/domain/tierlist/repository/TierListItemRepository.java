package com.caskbycask.domain.tierlist.repository;

import com.caskbycask.domain.tierlist.entity.TierListItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface TierListItemRepository extends JpaRepository<TierListItem, Long> {

    @Query("""
            SELECT i FROM TierListItem i
            LEFT JOIN FETCH i.row
            LEFT JOIN FETCH i.spirit s
            LEFT JOIN FETCH s.commonDetail
            LEFT JOIN FETCH s.wineDetail
            LEFT JOIN FETCH i.producer
            WHERE i.tierList.id = :tierListId
            ORDER BY i.sortOrder ASC, i.id ASC
            """)
    List<TierListItem> findByTierListIdForResponse(@Param("tierListId") Long tierListId);

    @Modifying
    @Query("DELETE FROM TierListItem i WHERE i.tierList.id = :tierListId")
    void deleteByTierListId(@Param("tierListId") Long tierListId);
}

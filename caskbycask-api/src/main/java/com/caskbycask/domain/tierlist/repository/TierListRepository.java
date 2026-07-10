package com.caskbycask.domain.tierlist.repository;

import com.caskbycask.domain.tierlist.dto.TierListSummaryResponse;
import com.caskbycask.domain.tierlist.entity.TierList;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface TierListRepository extends JpaRepository<TierList, Long> {

    boolean existsByShareKey(String shareKey);

    Optional<TierList> findByIdAndUserId(Long id, Long userId);

    @Query("SELECT t FROM TierList t LEFT JOIN FETCH t.user WHERE t.shareKey = :shareKey")
    Optional<TierList> findByShareKeyWithUser(@Param("shareKey") String shareKey);

    @Query("""
            SELECT new com.caskbycask.domain.tierlist.dto.TierListSummaryResponse(
                t.id, t.title, t.description, t.shareKey, COUNT(i.id), t.updatedAt
            )
            FROM TierList t
            LEFT JOIN t.items i
            WHERE t.user.id = :userId
            GROUP BY t.id, t.title, t.description, t.shareKey, t.updatedAt
            ORDER BY t.updatedAt DESC, t.id DESC
            """)
    List<TierListSummaryResponse> findSummariesByUserId(@Param("userId") Long userId);
}

package com.caskbycask.domain.tastetree.repository;

import com.caskbycask.domain.tastetree.entity.TasteTreeResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface TasteTreeResultRepository extends JpaRepository<TasteTreeResult, Long> {
    boolean existsByShareKey(String shareKey);

    @Query("SELECT r FROM TasteTreeResult r JOIN FETCH r.tree t LEFT JOIN FETCH t.owner JOIN FETCH r.version WHERE r.shareKey = :shareKey")
    Optional<TasteTreeResult> findByShareKeyWithTreeAndVersion(@Param("shareKey") String shareKey);
}

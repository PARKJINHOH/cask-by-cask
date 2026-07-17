package com.caskbycask.domain.tastetree.repository;

import com.caskbycask.domain.tastetree.entity.TasteTreeBookmark;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface TasteTreeBookmarkRepository extends JpaRepository<TasteTreeBookmark, Long> {
    Optional<TasteTreeBookmark> findByTreeIdAndUserId(Long treeId, Long userId);
    boolean existsByTreeIdAndUserId(Long treeId, Long userId);

    @Query("SELECT b.tree.id FROM TasteTreeBookmark b WHERE b.user.id = :userId AND b.tree.id IN :treeIds")
    List<Long> findTreeIdsByUserIdAndTreeIdIn(@Param("userId") Long userId, @Param("treeIds") List<Long> treeIds);

    @Query("SELECT b FROM TasteTreeBookmark b JOIN FETCH b.tree t LEFT JOIN FETCH t.owner WHERE b.user.id = :userId ORDER BY b.createdAt DESC")
    List<TasteTreeBookmark> findAllByUserIdWithTree(@Param("userId") Long userId);
}

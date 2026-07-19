package com.caskbycask.domain.tastetree.repository;

import com.caskbycask.domain.tastetree.entity.TasteTreeLike;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface TasteTreeLikeRepository extends JpaRepository<TasteTreeLike, Long> {
    Optional<TasteTreeLike> findByTreeIdAndUserId(Long treeId, Long userId);
    boolean existsByTreeIdAndUserId(Long treeId, Long userId);

    @Query("SELECT l.tree.id FROM TasteTreeLike l WHERE l.user.id = :userId AND l.tree.id IN :treeIds")
    List<Long> findTreeIdsByUserIdAndTreeIdIn(@Param("userId") Long userId, @Param("treeIds") List<Long> treeIds);
}

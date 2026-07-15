package com.caskbycask.domain.tastetree.repository;

import com.caskbycask.domain.tastetree.entity.TasteTree;
import com.caskbycask.domain.tastetree.entity.enums.TasteTreeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface TasteTreeRepository extends JpaRepository<TasteTree, Long> {
    boolean existsByShareKey(String shareKey);

    @Query("SELECT t FROM TasteTree t LEFT JOIN FETCH t.owner WHERE t.shareKey = :shareKey")
    Optional<TasteTree> findByShareKeyWithOwner(@Param("shareKey") String shareKey);

    @Query("SELECT t FROM TasteTree t LEFT JOIN FETCH t.owner WHERE t.id = :id AND t.owner.id = :ownerId")
    Optional<TasteTree> findOwnedById(@Param("id") Long id, @Param("ownerId") Long ownerId);

    @Query("SELECT t FROM TasteTree t LEFT JOIN FETCH t.owner WHERE t.type = :type ORDER BY t.id")
    List<TasteTree> findAllByTypeWithOwner(@Param("type") TasteTreeType type);

    @Query("SELECT t FROM TasteTree t LEFT JOIN FETCH t.owner WHERE t.owner.id = :ownerId ORDER BY t.updatedAt DESC, t.id DESC")
    List<TasteTree> findAllOwnedBy(@Param("ownerId") Long ownerId);
}

package com.caskbycask.domain.tastetree.repository;

import com.caskbycask.domain.tastetree.entity.TasteTree;
import com.caskbycask.domain.tastetree.entity.enums.TasteTreeType;
import com.caskbycask.domain.tastetree.entity.enums.TasteTreeModerationStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface TasteTreeRepository extends JpaRepository<TasteTree, Long> {
    boolean existsByShareKey(String shareKey);

    @Query("SELECT t FROM TasteTree t LEFT JOIN FETCH t.owner LEFT JOIN FETCH t.createdBy WHERE t.shareKey = :shareKey")
    Optional<TasteTree> findByShareKeyWithOwner(@Param("shareKey") String shareKey);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT t FROM TasteTree t LEFT JOIN FETCH t.owner LEFT JOIN FETCH t.createdBy WHERE t.shareKey = :shareKey")
    Optional<TasteTree> findByShareKeyForUpdate(@Param("shareKey") String shareKey);

    @Query("SELECT t FROM TasteTree t LEFT JOIN FETCH t.owner LEFT JOIN FETCH t.createdBy WHERE t.id = :id AND t.owner.id = :ownerId")
    Optional<TasteTree> findOwnedById(@Param("id") Long id, @Param("ownerId") Long ownerId);

    @Query("SELECT t FROM TasteTree t LEFT JOIN FETCH t.owner LEFT JOIN FETCH t.createdBy WHERE t.id = :id")
    Optional<TasteTree> findByIdWithOwner(@Param("id") Long id);

    @Query("SELECT t FROM TasteTree t LEFT JOIN FETCH t.owner LEFT JOIN FETCH t.createdBy WHERE t.type = :type ORDER BY t.id")
    List<TasteTree> findAllByTypeWithOwner(@Param("type") TasteTreeType type);

    @Query("SELECT t FROM TasteTree t LEFT JOIN FETCH t.owner LEFT JOIN FETCH t.createdBy WHERE t.owner.id = :ownerId ORDER BY t.updatedAt DESC, t.id DESC")
    List<TasteTree> findAllOwnedBy(@Param("ownerId") Long ownerId);

    @Query("SELECT t FROM TasteTree t LEFT JOIN FETCH t.owner LEFT JOIN FETCH t.createdBy ORDER BY t.updatedAt DESC, t.id DESC")
    List<TasteTree> findAllWithOwner();
}

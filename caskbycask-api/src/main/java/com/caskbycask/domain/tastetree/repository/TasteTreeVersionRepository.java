package com.caskbycask.domain.tastetree.repository;

import com.caskbycask.domain.tastetree.entity.TasteTreeVersion;
import com.caskbycask.domain.tastetree.entity.enums.TasteTreeVersionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import com.caskbycask.domain.tastetree.entity.enums.TasteTreeModerationStatus;
import com.caskbycask.domain.tastetree.entity.enums.TasteTreeType;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface TasteTreeVersionRepository extends JpaRepository<TasteTreeVersion, Long> {
    Optional<TasteTreeVersion> findFirstByTreeIdAndStatusOrderByVersionNumberDesc(
            Long treeId, TasteTreeVersionStatus status);

    List<TasteTreeVersion> findAllByTreeIdOrderByVersionNumberDesc(Long treeId);

    @Query("SELECT v FROM TasteTreeVersion v JOIN FETCH v.tree t LEFT JOIN FETCH t.owner LEFT JOIN FETCH t.createdBy " +
            "WHERE v.status = com.caskbycask.domain.tastetree.entity.enums.TasteTreeVersionStatus.PUBLISHED " +
            "AND t.moderationStatus = :moderationStatus " +
            "AND (:type IS NULL OR t.type = :type) " +
            "AND (:keyword = '' OR LOWER(v.title) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
            "OR LOWER(COALESCE(v.description, '')) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
            "OR LOWER(COALESCE(t.owner.nickname, '')) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    Page<TasteTreeVersion> searchPublished(
            @Param("type") TasteTreeType type,
            @Param("moderationStatus") TasteTreeModerationStatus moderationStatus,
            @Param("keyword") String keyword,
            Pageable pageable);

    List<TasteTreeVersion> findAllByTreeIdInOrderByTreeIdAscVersionNumberDesc(List<Long> treeIds);

    @Query("SELECT COALESCE(MAX(v.versionNumber), 0) FROM TasteTreeVersion v WHERE v.tree.id = :treeId")
    int findMaxVersionNumber(@Param("treeId") Long treeId);
}

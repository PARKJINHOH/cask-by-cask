package com.caskbycask.domain.tastetree.repository;

import com.caskbycask.domain.tastetree.entity.TasteTreeVersion;
import com.caskbycask.domain.tastetree.entity.enums.TasteTreeVersionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface TasteTreeVersionRepository extends JpaRepository<TasteTreeVersion, Long> {
    Optional<TasteTreeVersion> findFirstByTreeIdAndStatusOrderByVersionNumberDesc(
            Long treeId, TasteTreeVersionStatus status);

    List<TasteTreeVersion> findAllByTreeIdOrderByVersionNumberDesc(Long treeId);

    @Query("SELECT COALESCE(MAX(v.versionNumber), 0) FROM TasteTreeVersion v WHERE v.tree.id = :treeId")
    int findMaxVersionNumber(@Param("treeId") Long treeId);
}

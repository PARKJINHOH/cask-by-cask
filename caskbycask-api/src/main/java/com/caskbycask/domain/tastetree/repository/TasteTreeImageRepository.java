package com.caskbycask.domain.tastetree.repository;

import com.caskbycask.domain.tastetree.dto.TasteTreeImageFile;
import com.caskbycask.domain.tastetree.entity.TasteTreeImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.List;

public interface TasteTreeImageRepository extends JpaRepository<TasteTreeImage, Long> {
    Optional<TasteTreeImage> findBySavedFileName(String savedFileName);

    @Query("SELECT new com.caskbycask.domain.tastetree.dto.TasteTreeImageFile(" +
            "i.savedFileName, i.subPath, i.mimeType) FROM TasteTreeImage i WHERE i.tree.id = :treeId")
    List<TasteTreeImageFile> findFilesByTreeId(@Param("treeId") Long treeId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("DELETE FROM TasteTreeImage i WHERE i.tree.id = :treeId")
    int deleteAllByTreeId(@Param("treeId") Long treeId);
}

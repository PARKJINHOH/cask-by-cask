package com.drinkindex.domain.legal.repository;

import com.drinkindex.domain.legal.entity.LegalDocument;
import com.drinkindex.domain.legal.entity.enums.LegalDocumentType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface LegalDocumentRepository extends JpaRepository<LegalDocument, Long> {

    Optional<LegalDocument> findByTypeAndIsActiveTrue(LegalDocumentType type);

    boolean existsByType(LegalDocumentType type);

    Page<LegalDocument> findAllByTypeOrderByCreatedAtDesc(LegalDocumentType type, Pageable pageable);

    @Modifying
    @Query("UPDATE LegalDocument d SET d.isActive = false WHERE d.type = :type AND d.isActive = true")
    void deactivateAllByType(@Param("type") LegalDocumentType type);
}

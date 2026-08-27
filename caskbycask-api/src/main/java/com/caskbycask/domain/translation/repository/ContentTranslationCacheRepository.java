package com.caskbycask.domain.translation.repository;

import com.caskbycask.domain.translation.entity.ContentTranslationCache;
import com.caskbycask.domain.translation.entity.enums.TranslationLanguage;
import com.caskbycask.domain.translation.entity.enums.TranslationResourceType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface ContentTranslationCacheRepository extends JpaRepository<ContentTranslationCache, Long> {

    Optional<ContentTranslationCache> findByResourceTypeAndResourceIdAndTargetLanguage(
            TranslationResourceType resourceType, Long resourceId, TranslationLanguage targetLanguage);

    @Modifying
    @Query("DELETE FROM ContentTranslationCache c WHERE c.resourceType = :type AND c.resourceId = :resourceId")
    void deleteByResource(@Param("type") TranslationResourceType type,
                          @Param("resourceId") Long resourceId);
}

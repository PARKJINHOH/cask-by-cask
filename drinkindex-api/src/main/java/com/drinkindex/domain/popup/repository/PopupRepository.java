package com.drinkindex.domain.popup.repository;

import com.drinkindex.domain.popup.entity.Popup;
import com.drinkindex.domain.popup.entity.enums.PopupDisplayPage;
import com.drinkindex.domain.popup.entity.enums.PopupLanguage;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface PopupRepository extends JpaRepository<Popup, Long> {

    @Query("""
            SELECT p FROM Popup p
            WHERE p.isVisible = true
            AND p.displayPage = :displayPage
            AND p.language = :language
            AND (p.isAlwaysVisible = true OR (p.startAt <= :now AND p.endAt >= :now))
            ORDER BY p.sortOrder ASC
            """)
    List<Popup> findActivePopups(
            @Param("displayPage") PopupDisplayPage displayPage,
            @Param("language") PopupLanguage language,
            @Param("now") LocalDateTime now,
            Pageable pageable
    );

    @Query("""
            SELECT p FROM Popup p
            WHERE (:language IS NULL OR p.language = :language)
            AND (:isVisible IS NULL OR p.isVisible = :isVisible)
            ORDER BY p.sortOrder ASC, p.createdAt DESC
            """)
    Page<Popup> findAllForAdmin(
            @Param("language") PopupLanguage language,
            @Param("isVisible") Boolean isVisible,
            Pageable pageable
    );
}

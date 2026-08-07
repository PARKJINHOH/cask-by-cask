package com.caskbycask.domain.popup.repository;

import com.caskbycask.domain.popup.entity.Popup;
import com.caskbycask.domain.popup.entity.enums.PopupDisplayPage;
import com.caskbycask.domain.popup.entity.enums.PopupLanguage;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface PopupRepository extends JpaRepository<Popup, Long> {

    /** 신규 팝업을 목록 맨 아래에 붙일 때 쓰는 기준값. */
    Optional<Popup> findTopByOrderBySortOrderDesc();

    @Query("""
            SELECT p FROM Popup p
            WHERE p.isVisible = true
            AND p.displayPage = :displayPage
            AND p.language = :language
            AND (p.isAlwaysVisible = true OR (p.startAt <= :now AND (p.endAt IS NULL OR p.endAt >= :now)))
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

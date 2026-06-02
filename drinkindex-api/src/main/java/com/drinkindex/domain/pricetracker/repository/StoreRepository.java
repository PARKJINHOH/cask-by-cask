package com.drinkindex.domain.pricetracker.repository;

import com.drinkindex.domain.pricetracker.entity.Store;
import com.drinkindex.domain.pricetracker.entity.enums.StoreType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface StoreRepository extends JpaRepository<Store, Long> {

    @Query("""
            SELECT DISTINCT s FROM Store s
            LEFT JOIN s.aliases a
            WHERE s.isApproved = true
            AND (LOWER(s.displayName) LIKE LOWER(CONCAT('%', :keyword, '%'))
                 OR LOWER(a.alias) LIKE LOWER(CONCAT('%', :keyword, '%')))
            ORDER BY s.displayName
            """)
    List<Store> searchApproved(
            @Param("keyword") String keyword,
            Pageable pageable);

    @Query("""
            SELECT DISTINCT s FROM Store s
            LEFT JOIN s.aliases a
            WHERE s.isApproved = true
            AND (LOWER(s.displayName) LIKE LOWER(CONCAT('%', :keyword, '%'))
                 OR LOWER(a.alias) LIKE LOWER(CONCAT('%', :keyword, '%')))
            AND s.storeType = :storeType
            ORDER BY s.displayName
            """)
    List<Store> searchApprovedByType(
            @Param("keyword") String keyword,
            @Param("storeType") StoreType storeType,
            Pageable pageable);

    @Query("""
            SELECT s FROM Store s
            WHERE (:keyword IS NULL OR LOWER(s.displayName) LIKE LOWER(CONCAT('%', :keyword, '%')))
            AND (:isApproved IS NULL OR s.isApproved = :isApproved)
            ORDER BY s.createdAt DESC
            """)
    Page<Store> findAllForAdmin(
            @Param("keyword") String keyword,
            @Param("isApproved") Boolean isApproved,
            Pageable pageable);
}

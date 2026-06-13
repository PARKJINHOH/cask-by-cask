package com.caskbycask.domain.wishlist.repository;

import com.caskbycask.domain.wishlist.entity.Wishlist;
import com.caskbycask.domain.wishlist.entity.enums.WishlistType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface WishlistRepository extends JpaRepository<Wishlist, Long> {

    Optional<Wishlist> findByUserIdAndSpiritIdAndType(
            Long userId, Long spiritId, WishlistType type);

    @Query(value = """
            SELECT w FROM Wishlist w
            JOIN FETCH w.spirit
            WHERE w.user.id = :userId
            """,
            countQuery = "SELECT COUNT(w) FROM Wishlist w WHERE w.user.id = :userId")
    Page<Wishlist> findByUserIdFetchSpirit(
            @Param("userId") Long userId, Pageable pageable);

    @Query(value = """
            SELECT w FROM Wishlist w
            JOIN FETCH w.spirit
            WHERE w.user.id = :userId AND w.type = :type
            """,
            countQuery = """
            SELECT COUNT(w) FROM Wishlist w
            WHERE w.user.id = :userId AND w.type = :type
            """)
    Page<Wishlist> findByUserIdAndTypeFetchSpirit(
            @Param("userId") Long userId,
            @Param("type") WishlistType type,
            Pageable pageable);
}

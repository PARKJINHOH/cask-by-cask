package com.drinkindex.domain.community.repository;

import com.drinkindex.domain.community.entity.CommunityEmoji;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CommunityEmojiRepository extends JpaRepository<CommunityEmoji, Long> {

    List<CommunityEmoji> findByIsActiveTrueOrderBySortOrderAsc();

    Page<CommunityEmoji> findAllByOrderBySortOrderAsc(Pageable pageable);

    boolean existsByCode(String code);
}

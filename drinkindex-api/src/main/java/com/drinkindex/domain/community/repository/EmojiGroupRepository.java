package com.drinkindex.domain.community.repository;

import com.drinkindex.domain.community.entity.EmojiGroup;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EmojiGroupRepository extends JpaRepository<EmojiGroup, Long> {

    List<EmojiGroup> findAllByOrderBySortOrderAsc();

    List<EmojiGroup> findByIsActiveTrueOrderBySortOrderAsc();
}

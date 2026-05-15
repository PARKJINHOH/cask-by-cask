package com.drinkindex.domain.community.repository;

import com.drinkindex.domain.community.entity.PostPrefix;
import com.drinkindex.domain.community.entity.enums.BoardType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PostPrefixRepository extends JpaRepository<PostPrefix, Long> {

    List<PostPrefix> findByBoardTypeAndIsActiveTrueOrderBySortOrderAsc(BoardType boardType);
}

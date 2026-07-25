package com.caskbycask.domain.community.repository;

import com.caskbycask.domain.community.entity.PostPrefix;
import com.caskbycask.domain.community.entity.enums.BoardType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PostPrefixRepository extends JpaRepository<PostPrefix, Long> {

    List<PostPrefix> findByBoardTypeAndIsActiveTrueOrderBySortOrderAsc(BoardType boardType);

    List<PostPrefix> findByBoardTypeOrderBySortOrderAsc(BoardType boardType);

    Optional<PostPrefix> findByBoardTypeAndName(BoardType boardType, String name);

    Optional<PostPrefix> findFirstByBoardTypeAndNameOrderBySortOrderAscIdAsc(BoardType boardType, String name);
}

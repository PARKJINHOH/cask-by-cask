package com.drinkindex.domain.community.repository;

import com.drinkindex.domain.community.entity.Series;
import com.drinkindex.domain.community.entity.enums.BoardType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SeriesRepository extends JpaRepository<Series, Long> {

    List<Series> findByAuthorIdOrderByCreatedAtDesc(Long authorId);

    Page<Series> findByBoardTypeOrderByCreatedAtDesc(BoardType boardType, Pageable pageable);
}

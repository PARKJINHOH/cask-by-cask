package com.drinkindex.domain.community.repository;

import com.drinkindex.domain.community.entity.Series;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SeriesRepository extends JpaRepository<Series, Long> {

    List<Series> findByAuthorIdOrderByCreatedAtDesc(Long authorId);
}

package com.drinkindex.domain.score.repository;

import com.drinkindex.domain.score.entity.ScoreConfig;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ScoreConfigRepository extends JpaRepository<ScoreConfig, Long> {

    Optional<ScoreConfig> findByActionType(String actionType);

    boolean existsByActionType(String actionType);

    List<ScoreConfig> findAllByOrderByActionTypeAsc();
}

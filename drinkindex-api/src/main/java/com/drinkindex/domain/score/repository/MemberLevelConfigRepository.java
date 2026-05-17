package com.drinkindex.domain.score.repository;

import com.drinkindex.domain.score.entity.MemberLevelConfig;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MemberLevelConfigRepository extends JpaRepository<MemberLevelConfig, Long> {

    List<MemberLevelConfig> findAllByIsActiveTrueOrderByMinScoreDesc();

    List<MemberLevelConfig> findAllByOrderByLevelAsc();

    boolean existsByLevel(Integer level);
}

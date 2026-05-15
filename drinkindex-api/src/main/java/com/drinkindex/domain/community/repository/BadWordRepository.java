package com.drinkindex.domain.community.repository;

import com.drinkindex.domain.community.entity.BadWord;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BadWordRepository extends JpaRepository<BadWord, Long> {

    List<BadWord> findAllByIsActiveTrue();

    Page<BadWord> findAllByOrderByCreatedAtDesc(Pageable pageable);

    boolean existsByWord(String word);
}

package com.drinkindex.domain.nicknamebadword.repository;

import com.drinkindex.domain.nicknamebadword.entity.NicknameBadWord;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NicknameBadWordRepository extends JpaRepository<NicknameBadWord, Long> {

    List<NicknameBadWord> findAllByIsActiveTrue();

    Page<NicknameBadWord> findAllByOrderByCreatedAtDesc(Pageable pageable);

    boolean existsByWord(String word);
}

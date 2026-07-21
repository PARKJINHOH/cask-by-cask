package com.caskbycask.domain.tastetree.repository;

import com.caskbycask.domain.tastetree.entity.TasteTreeFact;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TasteTreeFactRepository extends JpaRepository<TasteTreeFact, Long> {
    List<TasteTreeFact> findAllByOrderByDisplayOrderAscIdAsc();
}

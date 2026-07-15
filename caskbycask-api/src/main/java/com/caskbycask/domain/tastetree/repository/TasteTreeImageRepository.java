package com.caskbycask.domain.tastetree.repository;

import com.caskbycask.domain.tastetree.entity.TasteTreeImage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TasteTreeImageRepository extends JpaRepository<TasteTreeImage, Long> {
    Optional<TasteTreeImage> findBySavedFileName(String savedFileName);
}

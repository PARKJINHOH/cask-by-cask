package com.caskbycask.domain.photocard.repository;

import com.caskbycask.domain.photocard.entity.PhotoCardImage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PhotoCardImageRepository extends JpaRepository<PhotoCardImage, Long> {

    Optional<PhotoCardImage> findBySavedFileName(String savedFileName);
}

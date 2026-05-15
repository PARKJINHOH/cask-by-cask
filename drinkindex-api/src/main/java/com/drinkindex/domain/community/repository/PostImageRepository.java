package com.drinkindex.domain.community.repository;

import com.drinkindex.domain.community.entity.PostImage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PostImageRepository extends JpaRepository<PostImage, Long> {

    List<PostImage> findByPostId(Long postId);

    Optional<PostImage> findByImageUrl(String imageUrl);

    Optional<PostImage> findBySavedFileName(String savedFileName);
}

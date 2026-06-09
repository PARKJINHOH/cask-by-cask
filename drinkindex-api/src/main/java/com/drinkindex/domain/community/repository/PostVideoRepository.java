package com.drinkindex.domain.community.repository;

import com.drinkindex.domain.community.entity.PostVideo;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PostVideoRepository extends JpaRepository<PostVideo, Long> {

    Optional<PostVideo> findBySavedFileName(String savedFileName);

    List<PostVideo> findByPostId(Long postId);

    Optional<PostVideo> findByVideoUrl(String videoUrl);
}

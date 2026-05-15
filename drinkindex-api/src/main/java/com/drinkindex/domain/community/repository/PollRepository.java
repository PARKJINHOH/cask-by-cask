package com.drinkindex.domain.community.repository;

import com.drinkindex.domain.community.entity.Poll;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PollRepository extends JpaRepository<Poll, Long> {
    // Poll.id = Post.id (@MapsId) 이므로 findById(postId)로 조회
}

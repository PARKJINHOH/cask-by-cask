package com.drinkindex.domain.community.repository;

import com.drinkindex.domain.community.entity.PollVote;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PollVoteRepository extends JpaRepository<PollVote, Long> {

    List<PollVote> findByPollIdAndUserId(Long pollId, Long userId);

    boolean existsByPollIdAndUserId(Long pollId, Long userId);
}

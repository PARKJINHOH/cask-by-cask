package com.caskbycask.domain.community.repository;

import com.caskbycask.domain.community.entity.PollOption;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PollOptionRepository extends JpaRepository<PollOption, Long> {

    List<PollOption> findByPollIdOrderBySortOrderAsc(Long pollId);

    @Modifying
    @Query("UPDATE PollOption o SET o.voteCount = o.voteCount + 1 WHERE o.id = :id")
    void incrementVoteCount(@Param("id") Long id);
}

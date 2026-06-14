package com.caskbycask.domain.byob.repository;

import com.caskbycask.domain.byob.entity.ByobParticipant;
import com.caskbycask.domain.byob.entity.enums.ParticipantStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ByobParticipantRepository extends JpaRepository<ByobParticipant, Long> {

    boolean existsByByobIdAndUserId(Long byobId, Long userId);

    Optional<ByobParticipant> findByByobIdAndUserId(Long byobId, Long userId);

    @Query("SELECT p FROM ByobParticipant p JOIN FETCH p.user WHERE p.byob.id = :byobId ORDER BY p.appliedAt ASC")
    List<ByobParticipant> findAllByByobIdOrderByAppliedAtAsc(@Param("byobId") Long byobId);

    // host 도 함께 fetch — 응답의 hostNickname 접근 시 발생하던 N+1 제거 (ToOne 이라 페이징 안전)
    @Query("SELECT p FROM ByobParticipant p JOIN FETCH p.byob b JOIN FETCH b.host WHERE p.user.id = :userId ORDER BY p.appliedAt DESC")
    Page<ByobParticipant> findAllByUserIdOrderByAppliedAtDesc(@Param("userId") Long userId, Pageable pageable);

    int countByByobIdAndStatus(Long byobId, ParticipantStatus status);
}

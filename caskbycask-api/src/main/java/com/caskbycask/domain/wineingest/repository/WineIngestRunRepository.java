package com.caskbycask.domain.wineingest.repository;

import com.caskbycask.domain.wineingest.entity.WineIngestRun;
import com.caskbycask.domain.wineingest.entity.enums.WineIngestRunStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

import java.util.*;
import java.time.LocalDateTime;

public interface WineIngestRunRepository extends JpaRepository<WineIngestRun, Long> {
    Optional<WineIngestRun> findByRunKey(String runKey);
    Page<WineIngestRun> findAllByOrderByCreatedAtDesc(Pageable pageable);
    long countByStatus(WineIngestRunStatus status);
    List<WineIngestRun> findByStatusAndLastHeartbeatAtBefore(
            WineIngestRunStatus status, LocalDateTime lastHeartbeatAt);

    @Query("select coalesce(sum(r.requestedLimit), 0) from WineIngestRun r " +
            "where r.createdAt >= :since " +
            "and r.runType <> com.caskbycask.domain.wineingest.entity.enums.WineIngestRunType.FIXTURE " +
            "and r.status <> com.caskbycask.domain.wineingest.entity.enums.WineIngestRunStatus.CANCELLED")
    long sumRequestedLimitSince(@Param("since") LocalDateTime since);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from WineIngestRun r where r.status = :status order by r.createdAt asc")
    List<WineIngestRun> findNextForUpdate(@Param("status") WineIngestRunStatus status, Pageable pageable);
}

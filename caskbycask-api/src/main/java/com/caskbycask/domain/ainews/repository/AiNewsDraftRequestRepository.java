package com.caskbycask.domain.ainews.repository;

import com.caskbycask.domain.ainews.entity.AiNewsDraftRequest;
import com.caskbycask.domain.ainews.entity.enums.AiNewsDraftRequestStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface AiNewsDraftRequestRepository extends JpaRepository<AiNewsDraftRequest, Long> {
    Page<AiNewsDraftRequest> findAllByOrderByCreatedAtDesc(Pageable pageable);
    Optional<AiNewsDraftRequest> findFirstByStatusOrderByCreatedAtAsc(AiNewsDraftRequestStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select request from AiNewsDraftRequest request where request.id = :id")
    Optional<AiNewsDraftRequest> findByIdForUpdate(@Param("id") Long id);
}

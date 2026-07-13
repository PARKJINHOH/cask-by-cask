package com.caskbycask.domain.ainews.repository;

import com.caskbycask.domain.ainews.entity.AiNewsDraftRequest;
import com.caskbycask.domain.ainews.entity.enums.AiNewsDraftRequestStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AiNewsDraftRequestRepository extends JpaRepository<AiNewsDraftRequest, Long> {
    Page<AiNewsDraftRequest> findAllByOrderByCreatedAtDesc(Pageable pageable);
    Optional<AiNewsDraftRequest> findFirstByStatusOrderByCreatedAtAsc(AiNewsDraftRequestStatus status);
}

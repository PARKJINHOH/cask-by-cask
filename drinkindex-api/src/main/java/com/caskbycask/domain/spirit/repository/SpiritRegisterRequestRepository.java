package com.caskbycask.domain.spirit.repository;

import com.caskbycask.domain.spirit.entity.SpiritRegisterRequest;
import com.caskbycask.domain.spirit.entity.enums.RequestStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SpiritRegisterRequestRepository extends JpaRepository<SpiritRegisterRequest, Long> {

    Page<SpiritRegisterRequest> findByStatus(RequestStatus status, Pageable pageable);

    List<SpiritRegisterRequest> findByUserIdOrderByCreatedAtDesc(Long userId);

    long countByStatus(RequestStatus status);
}

package com.drinkindex.domain.distillery.repository;

import com.drinkindex.domain.distillery.entity.DistilleryRegisterRequest;
import com.drinkindex.domain.spirit.entity.enums.RequestStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DistilleryRegisterRequestRepository
        extends JpaRepository<DistilleryRegisterRequest, Long> {

    Page<DistilleryRegisterRequest> findByStatus(RequestStatus status, Pageable pageable);

    List<DistilleryRegisterRequest> findByUserIdOrderByCreatedAtDesc(Long userId);
}

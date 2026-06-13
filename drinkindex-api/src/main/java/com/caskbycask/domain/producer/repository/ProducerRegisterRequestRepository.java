package com.caskbycask.domain.producer.repository;

import com.caskbycask.domain.producer.entity.ProducerRegisterRequest;
import com.caskbycask.domain.spirit.entity.enums.RequestStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProducerRegisterRequestRepository
        extends JpaRepository<ProducerRegisterRequest, Long> {

    Page<ProducerRegisterRequest> findByStatus(RequestStatus status, Pageable pageable);

    List<ProducerRegisterRequest> findByUserIdOrderByCreatedAtDesc(Long userId);
}
